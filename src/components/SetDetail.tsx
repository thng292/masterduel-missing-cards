import { createSignal, createEffect, createMemo, For, Show } from 'solid-js';
import { X, Search, AlertCircle, CheckCircle2, HelpCircle, Layers, Calendar } from 'lucide-solid';
import { type TcgSet } from './SetList';

interface Card {
  id: number;
  name: string;
  type: string;
  desc: string;
  atk?: number;
  def?: number;
  level?: number;
  scale?: number;
  linkval?: number;
  race: string;
  attribute: string;
  archetype: string;
  is_missing: boolean;
  set_code: string;
  set_rarity: string;
}

interface SetDetailsData {
  name: string;
  code: string;
  slug: string;
  tcg_date: string;
  total_cards: number;
  missing_count: number;
  cards: Card[];
}

interface SetDetailProps {
  set: TcgSet | null;
  onClose: () => void;
}

export default function SetDetail(props: SetDetailProps) {
  let dialogRef!: HTMLDialogElement;
  
  const [loading, setLoading] = createSignal(false);
  const [data, setData] = createSignal<SetDetailsData | null>(null);
  const [activeTab, setActiveTab] = createSignal<'all' | 'missing' | 'available'>('all');
  const [cardSearch, setCardSearch] = createSignal('');
  
  // Hover card state
  const [hoveredCard, setHoveredCard] = createSignal<Card | null>(null);
  const [popoverPos, setPopoverPos] = createSignal({ x: 0, y: 0 });

  // Handle open/close state of native dialog
  createEffect(() => {
    const activeSet = props.set;
    if (activeSet) {
      dialogRef.showModal();
      loadSetDetails(activeSet.slug);
    } else {
      dialogRef.close();
      setData(null);
      setCardSearch('');
      setActiveTab('all');
    }
  });

  const loadSetDetails = async (slug: string) => {
    setLoading(true);
    try {
      // Fetch details from chunked public JSON files
      const response = await fetch(`./data/sets/${slug}.json`);
      if (!response.ok) throw new Error('Failed to load set details');
      const json = await response.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filtered cards list based on tabs and search query
  const filteredCards = createMemo(() => {
    const details = data();
    if (!details) return [];

    let cards = details.cards;

    // Filter by tab
    if (activeTab() === 'missing') {
      cards = cards.filter(c => c.is_missing);
    } else if (activeTab() === 'available') {
      cards = cards.filter(c => !c.is_missing);
    }

    // Filter by search text
    const search = cardSearch().toLowerCase().trim();
    if (search) {
      cards = cards.filter(
        c => 
          c.name.toLowerCase().includes(search) || 
          c.type.toLowerCase().includes(search) || 
          c.set_rarity.toLowerCase().includes(search) ||
          c.set_code.toLowerCase().includes(search)
      );
    }

    // Sort cards: missing first, then by name
    return [...cards].sort((a, b) => {
      if (a.is_missing && !b.is_missing) return -1;
      if (!a.is_missing && b.is_missing) return 1;
      return a.name.localeCompare(b.name);
    });
  });

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === dialogRef) {
      props.onClose();
    }
  };

  // Track hover popover positioning
  const handleMouseMove = (e: MouseEvent, card: Card) => {
    setHoveredCard(card);
    const popoverWidth = 320;
    const popoverHeight = 450;
    
    // Position popover relative to cursor, keeping it on screen
    let x = e.clientX - popoverWidth - 20; // Show to the left of cursor
    if (x < 20) {
      x = e.clientX + 20; // Show to the right if space is insufficient
    }
    
    let y = e.clientY - popoverHeight / 2;
    if (y < 20) y = 20;
    if (y + popoverHeight > window.innerHeight - 20) {
      y = window.innerHeight - popoverHeight - 20;
    }

    setPopoverPos({ x, y });
  };

  const handleMouseLeave = () => {
    setHoveredCard(null);
  };

  const getRarityClass = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('ultra rare') || r.includes('secret rare') || r.includes('ultimate rare')) return 'rarity-ur';
    if (r.includes('super rare') || r.includes('gold rare')) return 'rarity-sr';
    if (r.includes('rare')) return 'rarity-r';
    return 'rarity-n';
  };

  const getRarityAbbrev = (rarity: string) => {
    const r = rarity.toLowerCase();
    if (r.includes('ultra rare')) return 'UR';
    if (r.includes('secret rare')) return 'SE';
    if (r.includes('ultimate rare')) return 'UT';
    if (r.includes('super rare')) return 'SR';
    if (r.includes('rare')) return 'R';
    return 'C';
  };

  // Compile image proxy URL
  const getProxyImageUrl = (cardId: number, size: 'small' | 'large') => {
    const targetFolder = size === 'small' ? 'cards_small' : 'cards';
    const targetUrl = `https://images.ygoprodeck.com/images/${targetFolder}/${cardId}.jpg`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&output=webp`;
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        class="dialog-overlay"
        onClick={handleBackdropClick}
      >
        <div class="dialog-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div class="dialog-header">
            <div class="dialog-title-area">
              <Show when={props.set} fallback={<h2 class="dialog-title">Loading Set...</h2>}>
                {(activeSet) => (
                  <>
                    <h2 class="dialog-title">{activeSet().name}</h2>
                    <div class="dialog-subtitle">
                      <span class="set-code-badge">{activeSet().code}</span>
                      <span>•</span>
                      <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                        <Calendar size={13} />
                        {activeSet().tcg_date}
                      </span>
                      <span>•</span>
                      <span style="display: inline-flex; align-items: center; gap: 0.25rem;">
                        <Layers size={13} />
                        {activeSet().total_cards} Cards
                      </span>
                    </div>
                  </>
                )}
              </Show>
            </div>
            <button class="close-btn" onClick={props.onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>

          <Show when={!loading()} fallback={
            <div class="loading-container">
              <div class="spinner"></div>
              <p>Scanning card catalog...</p>
            </div>
          }>
            <Show when={data()}>
              {(setDetails) => {
                const missingCount = setDetails().missing_count;
                const avCount = setDetails().cards.length - missingCount;

                return (
                  <>
                    {/* Tabs */}
                    <div class="dialog-tabs">
                      <button
                        class={`tab-btn ${activeTab() === 'all' ? 'active' : ''}`}
                        onClick={() => setActiveTab('all')}
                      >
                        All Cards ({setDetails().cards.length})
                      </button>
                      <button
                        class={`tab-btn ${activeTab() === 'missing' ? 'active' : ''}`}
                        onClick={() => setActiveTab('missing')}
                        style={missingCount > 0 ? "color: var(--danger)" : ""}
                      >
                        Missing ({missingCount})
                      </button>
                      <button
                        class={`tab-btn ${activeTab() === 'available' ? 'active' : ''}`}
                        onClick={() => setActiveTab('available')}
                      >
                        In Master Duel ({avCount})
                      </button>
                    </div>

                    {/* Inner Search */}
                    <div style="padding: 1rem 1.5rem 0.5rem 1.5rem;">
                      <div class="search-input-wrapper" style="max-width: 100%;">
                        <Search class="search-icon" />
                        <input
                          type="text"
                          class="search-input"
                          placeholder="Search card name, type, or rarity in this set..."
                          value={cardSearch()}
                          onInput={(e) => setCardSearch(e.currentTarget.value)}
                        />
                      </div>
                    </div>

                    {/* Scrollable Card list */}
                    <div class="dialog-body">
                      <For each={filteredCards()}>
                        {(card) => {
                          const [imgLoaded, setImgLoaded] = createSignal(false);
                          
                          return (
                            <div
                              class="card-item-row"
                              onMouseMove={(e) => handleMouseMove(e, card)}
                              onMouseLeave={handleMouseLeave}
                            >
                              {/* Card Image Thumbnail */}
                              <div class="card-image-container">
                                <img
                                  src={getProxyImageUrl(card.id, 'small')}
                                  alt={card.name}
                                  class={`card-thumbnail ${imgLoaded() ? 'loaded' : ''}`}
                                  onLoad={() => setImgLoaded(true)}
                                  loading="lazy"
                                />
                                {!imgLoaded() && (
                                  <div class="card-image-fallback">
                                    {card.name.slice(0, 10)}...
                                  </div>
                                )}
                              </div>

                              {/* Card Info */}
                              <div class="card-info-main">
                                <h4 class="card-name-title" title={card.name}>{card.name}</h4>
                                <div class="card-tags">
                                  <span class={`rarity-badge ${getRarityClass(card.set_rarity)}`} title={card.set_rarity}>
                                    {getRarityAbbrev(card.set_rarity)}
                                  </span>
                                  <span class="card-tag" style="color: var(--text-muted)">{card.set_code}</span>
                                  <span class="card-tag">•</span>
                                  <span class="card-tag">{card.type}</span>
                                </div>
                                <Show when={card.atk !== undefined || card.def !== undefined}>
                                  <div class="card-stats">
                                    <span>ATK/ {card.atk ?? '?'}</span>
                                    <span>DEF/ {card.def ?? '?'}</span>
                                    <Show when={card.level !== undefined}>
                                      <span>★ {card.level}</span>
                                    </Show>
                                  </div>
                                </Show>
                              </div>

                              {/* MD Legality Status */}
                              <Show when={card.is_missing} fallback={
                                <span class="card-status-badge obtained" title="Available in Master Duel">
                                  <CheckCircle2 size={13} /> In Game
                                </span>
                              }>
                                <span class="card-status-badge missing" title="Missing from Master Duel">
                                  <AlertCircle size={13} /> Missing
                                </span>
                              </Show>
                            </div>
                          );
                        }}
                      </For>

                      {filteredCards().length === 0 && (
                        <div class="loading-container" style="min-height: 150px;">
                          <HelpCircle size={32} style="color: var(--text-muted);" />
                          <p>No cards match your search parameters in this tab.</p>
                        </div>
                      )}
                    </div>
                  </>
                );
              }}
            </Show>
          </Show>
        </div>

        {/* Floating Hover Card Popover */}
        <Show when={hoveredCard()}>
          {(card) => (
            <div
              class="card-detail-popover visible"
              style={{
                left: `${popoverPos().x}px`,
                top: `${popoverPos().y}px`
              }}
            >
              <img
                src={getProxyImageUrl(card().id, 'large')}
                alt={card().name}
                class="popover-image"
              />
              <h4 style="font-size: 1.1rem; margin-bottom: 0.25rem;">{card().name}</h4>
              <div style="font-size: 0.75rem; color: var(--accent); margin-bottom: 0.5rem; font-weight: 600;">
                {card().type} {card().attribute ? `| ${card().attribute}` : ''} {card().race ? `| ${card().race}` : ''}
              </div>
              <div class="popover-desc">{card().desc}</div>
            </div>
          )}
        </Show>
      </dialog>
    </>
  );
}
