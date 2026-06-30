import { createSignal, onMount, createMemo, For, Show } from 'solid-js';
import { Search, HelpCircle, ChevronLeft, ChevronRight, Info } from 'lucide-solid';

interface MissingCard {
  id: number;
  name: string;
  type: string;
  atk?: number;
  def?: number;
  level?: number;
  race: string;
  attribute: string;
  archetype: string;
}

export default function MissingCardSearch() {
  const [loading, setLoading] = createSignal(true);
  const [allMissingCards, setAllMissingCards] = createSignal<MissingCard[]>([]);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [cardType, setCardType] = createSignal('all');
  const [attribute, setAttribute] = createSignal('all');
  const [currentPage, setCurrentPage] = createSignal(1);
  const itemsPerPage = 48;

  // Hover card state
  const [hoveredCard, setHoveredCard] = createSignal<MissingCard | null>(null);
  const [popoverPos, setPopoverPos] = createSignal({ x: 0, y: 0 });

  onMount(async () => {
    try {
      const response = await fetch('./data/missing_cards.json');
      if (!response.ok) throw new Error('Failed to load global missing cards');
      const data = await response.json();
      setAllMissingCards(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  });

  // Filtered and sorted missing cards
  const filteredCards = createMemo(() => {
    let result = [...allMissingCards()];

    // 1. Search Query Filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(
        c => 
          c.name.toLowerCase().includes(query) || 
          c.archetype.toLowerCase().includes(query) ||
          c.race.toLowerCase().includes(query)
      );
    }

    // 2. Card Type Filter
    const type = cardType();
    if (type !== 'all') {
      if (type === 'monster') {
        result = result.filter(c => !c.type.includes('Spell') && !c.type.includes('Trap'));
      } else if (type === 'spell') {
        result = result.filter(c => c.type.includes('Spell'));
      } else if (type === 'trap') {
        result = result.filter(c => c.type.includes('Trap'));
      }
    }

    // 3. Attribute Filter
    const attr = attribute();
    if (attr !== 'all') {
      result = result.filter(c => c.attribute && c.attribute.toLowerCase() === attr);
    }

    // Reset page if filters change
    setCurrentPage(1);

    return result;
  });

  // Paginated chunk
  const paginatedCards = createMemo(() => {
    const start = (currentPage() - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return filteredCards().slice(start, end);
  });

  const totalPages = createMemo(() => {
    return Math.ceil(filteredCards().length / itemsPerPage);
  });

  const getProxyImageUrl = (cardId: number, size: 'small' | 'large') => {
    const targetFolder = size === 'small' ? 'cards_small' : 'cards';
    const targetUrl = `https://images.ygoprodeck.com/images/${targetFolder}/${cardId}.jpg`;
    return `https://images.weserv.nl/?url=${encodeURIComponent(targetUrl)}&output=webp`;
  };

  const handleMouseMove = (e: MouseEvent, card: MissingCard) => {
    setHoveredCard(card);
    const popoverWidth = 320;
    const popoverHeight = 450;
    
    let x = e.clientX - popoverWidth - 20;
    if (x < 20) {
      x = e.clientX + 20;
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

  return (
    <div>
      <div style="margin-bottom: 2rem;">
        <h2 style="font-size: 1.75rem; margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">
          Global Missing Cards Catalog
        </h2>
        <p style="color: var(--text-secondary); font-size: 0.95rem;">
          Explore all Yu-Gi-Oh! cards that are currently missing in Master Duel. 
          Use the search bar and filter controls to narrow down cards by type or attribute.
        </p>
      </div>

      <Show when={!loading()} fallback={
        <div class="loading-container">
          <div class="spinner"></div>
          <p>Compiling database of missing cards...</p>
        </div>
      }>
        {/* Controls Bar */}
        <div class="controls-bar">
          <div class="search-input-wrapper">
            <Search class="search-icon" />
            <input
              type="text"
              class="search-input"
              placeholder="Search missing card by name or archetype..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
            />
          </div>

          <div class="filters-wrapper">
            <select
              class="select-input"
              value={cardType()}
              onChange={(e) => setCardType(e.currentTarget.value)}
            >
              <option value="all">All Types</option>
              <option value="monster">Monsters</option>
              <option value="spell">Spell Cards</option>
              <option value="trap">Trap Cards</option>
            </select>

            <select
              class="select-input"
              value={attribute()}
              disabled={cardType() === 'spell' || cardType() === 'trap'}
              onChange={(e) => setAttribute(e.currentTarget.value)}
            >
              <option value="all">All Attributes</option>
              <option value="light">LIGHT</option>
              <option value="dark">DARK</option>
              <option value="fire">FIRE</option>
              <option value="water">WATER</option>
              <option value="wind">WIND</option>
              <option value="earth">EARTH</option>
              <option value="divine">DIVINE</option>
            </select>

            <span style="font-size: 0.9rem; color: var(--text-secondary); margin-left: 0.5rem; font-weight: 550;">
              Found: {filteredCards().length} cards
            </span>
          </div>
        </div>

        {/* Global Cards Grid */}
        <div class="global-cards-grid">
          <For each={paginatedCards()}>
            {(card) => {
              const [imgLoaded, setImgLoaded] = createSignal(false);
              return (
                <div
                  class="global-card-box"
                  onMouseMove={(e) => handleMouseMove(e, card)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div class="card-image-container" style="inline-size: 48px;">
                    <img
                      src={getProxyImageUrl(card.id, 'small')}
                      alt={card.name}
                      class={`card-thumbnail ${imgLoaded() ? 'loaded' : ''}`}
                      onLoad={() => setImgLoaded(true)}
                      loading="lazy"
                    />
                    {!imgLoaded() && (
                      <div class="card-image-fallback" style="font-size: 0.45rem;">
                        {card.name.slice(0, 8)}
                      </div>
                    )}
                  </div>

                  <div class="card-info-main">
                    <h4 class="card-name-title" title={card.name}>{card.name}</h4>
                    <div class="card-tags">
                      <span class="card-tag" style="color: var(--accent); font-weight: 600;">{card.type}</span>
                      <Show when={card.level}>
                        <span class="card-tag">•</span>
                        <span class="card-tag" style="font-family: 'Outfit', sans-serif;">★ {card.level}</span>
                      </Show>
                      <Show when={card.attribute}>
                        <span class="card-tag">•</span>
                        <span class="card-tag" style="font-size: 0.7rem; font-weight: bold; opacity: 0.8;">{card.attribute}</span>
                      </Show>
                    </div>
                  </div>
                  
                  <div title="Hover to view full details" style="color: var(--text-muted); cursor: help;">
                    <Info size={16} />
                  </div>
                </div>
              );
            }}
          </For>
        </div>

        {filteredCards().length === 0 && (
          <div class="loading-container">
            <HelpCircle size={36} style="color: var(--text-muted);" />
            <p>No missing cards match your active filter search.</p>
          </div>
        )}

        {/* Pagination Navigation */}
        <Show when={totalPages() > 1}>
          <div class="pagination">
            <button
              class="pagination-btn"
              disabled={currentPage() === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span style="font-size: 0.9rem; color: var(--text-secondary); font-family: 'Outfit', sans-serif;">
              Page {currentPage()} of {totalPages()}
            </span>
            <button
              class="pagination-btn"
              disabled={currentPage() === totalPages()}
              onClick={() => setCurrentPage(p => Math.min(totalPages(), p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </Show>
      </Show>

      {/* Hover Card Popover */}
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
            <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; font-family: 'Outfit', sans-serif;">
              Card ID: {card().id} {card().archetype ? `| Archetype: ${card().archetype}` : ''}
            </div>
            <div class="popover-desc" style="max-height: 140px;">
              Hovering over cards provides detailed descriptors of their physical printings, text, and in-game statuses.
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
