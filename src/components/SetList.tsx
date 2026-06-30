import { createSignal, createMemo, For } from 'solid-js';
import { Search, Calendar, Layers, CheckCircle2, AlertTriangle } from 'lucide-solid';

export interface TcgSet {
  name: string;
  code: string;
  slug: string;
  tcg_date: string;
  total_cards: number;
  missing_count: number;
  missing_percentage: number;
}

interface SetListProps {
  sets: TcgSet[];
  onSelectSet: (set: TcgSet) => void;
}

export default function SetList(props: SetListProps) {
  const [searchQuery, setSearchQuery] = createSignal('');
  const [sortBy, setSortBy] = createSignal('date-desc');
  const [filterType, setFilterType] = createSignal('all');

  // Compute stats from sets
  const stats = createMemo(() => {
    let totalCards = 0;
    let totalMissing = 0;
    
    props.sets.forEach(set => {
      totalCards += set.total_cards;
      totalMissing += set.missing_count;
    });

    return {
      totalSets: props.sets.length,
      totalCards,
      totalMissing,
      totalAvailable: totalCards - totalMissing,
      overallCompletion: totalCards > 0 ? Math.round(((totalCards - totalMissing) / totalCards) * 1000) / 10 : 100
    };
  });

  // Filtered and sorted sets
  const filteredSets = createMemo(() => {
    let result = [...props.sets];

    // Search query filter
    const query = searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(
        set => set.name.toLowerCase().includes(query) || set.code.toLowerCase().includes(query)
      );
    }

    // Completion filters
    if (filterType() === 'complete') {
      result = result.filter(set => set.missing_count === 0);
    } else if (filterType() === 'incomplete') {
      result = result.filter(set => set.missing_count > 0);
    } else if (filterType() === 'high-missing') {
      result = result.filter(set => set.missing_percentage > 20);
    }

    // Sort sets
    result.sort((a, b) => {
      switch (sortBy()) {
        case 'date-desc':
          if (a.tcg_date === 'Unknown') return 1;
          if (b.tcg_date === 'Unknown') return -1;
          return new Date(b.tcg_date).getTime() - new Date(a.tcg_date).getTime();
        case 'date-asc':
          if (a.tcg_date === 'Unknown') return 1;
          if (b.tcg_date === 'Unknown') return -1;
          return new Date(a.tcg_date).getTime() - new Date(b.tcg_date).getTime();
        case 'missing-desc':
          return b.missing_count - a.missing_count;
        case 'missing-asc':
          return a.missing_count - b.missing_count;
        case 'pct-desc':
          return b.missing_percentage - a.missing_percentage;
        case 'name-asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  });

  // Helper for progress bar color
  const getProgressBarColor = (percentage: number) => {
    if (percentage === 0) return 'var(--success)';
    if (percentage < 10) return '#60a5fa'; // light blue
    if (percentage < 25) return '#f59e0b'; // amber
    return 'var(--danger)';
  };

  return (
    <div>
      {/* Statistics Dashboard */}
      <div class="stats-grid">
        <div class="stat-card">
          <span class="stat-label">Total TCG Sets</span>
          <span class="stat-value">{stats().totalSets}</span>
        </div>
        <div class="stat-card accent">
          <span class="stat-label">Master Duel Legality</span>
          <span class="stat-value">{stats().overallCompletion}%</span>
        </div>
        <div class="stat-card danger">
          <span class="stat-label">Missing Cards (TCG Sum)</span>
          <span class="stat-value">{stats().totalMissing}</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div class="controls-bar">
        <div class="search-input-wrapper">
          <Search class="search-icon" />
          <input
            type="text"
            class="search-input"
            placeholder="Search sets by name or code..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
          />
        </div>

        <div class="filters-wrapper">
          <select
            class="select-input"
            value={filterType()}
            onChange={(e) => setFilterType(e.currentTarget.value)}
          >
            <option value="all">All Sets</option>
            <option value="incomplete">Incomplete Sets (Has Missing)</option>
            <option value="complete">100% Complete Sets</option>
            <option value="high-missing">High Missing Ratio (&gt;20%)</option>
          </select>

          <select
            class="select-input"
            value={sortBy()}
            onChange={(e) => setSortBy(e.currentTarget.value)}
          >
            <option value="date-desc">Release Date: Newest First</option>
            <option value="date-asc">Release Date: Oldest First</option>
            <option value="missing-desc">Missing Count: High to Low</option>
            <option value="missing-asc">Missing Count: Low to High</option>
            <option value="pct-desc">Missing Ratio: High to Low</option>
            <option value="name-asc">Alphabetical: A to Z</option>
          </select>
        </div>
      </div>

      {/* Sets Grid */}
      <div class="sets-grid">
        <For each={filteredSets()}>
          {(set) => {
            const completionPct = 100 - set.missing_percentage;
            return (
              <div class="set-card" onClick={() => props.onSelectSet(set)}>
                <div class="set-header">
                  <h3 class="set-name" title={set.name}>{set.name}</h3>
                  <span class="set-code-badge">{set.code || 'TCG'}</span>
                </div>
                
                <div class="set-progress-section">
                  <div class="progress-stats">
                    <span class="progress-label">
                      {set.missing_count === 0 ? (
                        <span style="color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
                          <CheckCircle2 size={13} /> Complete
                        </span>
                      ) : (
                        <span style="display: flex; align-items: center; gap: 0.25rem;">
                          <AlertTriangle size={13} style={{ color: getProgressBarColor(set.missing_percentage) }} />
                          {set.missing_count} missing
                        </span>
                      )}
                    </span>
                    <span class="progress-value">{Math.round(completionPct * 10) / 10}%</span>
                  </div>
                  <div class="progress-bar-bg">
                    <div
                      class="progress-bar-fill"
                      style={{
                        width: `${completionPct}%`,
                        background: getProgressBarColor(set.missing_percentage)
                      }}
                    />
                  </div>
                </div>

                <div class="set-meta">
                  <span class="set-date">
                    <Calendar size={13} style="display: inline; margin-right: 0.25rem; vertical-align: text-top;" />
                    {set.tcg_date}
                  </span>
                  <span style="font-family: 'Outfit', sans-serif;">
                    <Layers size={13} style="display: inline; margin-right: 0.25rem; vertical-align: text-top;" />
                    {set.total_cards} cards
                  </span>
                </div>
              </div>
            );
          }}
        </For>
      </div>
      
      {filteredSets().length === 0 && (
        <div class="loading-container">
          <p>No sets match your filters.</p>
        </div>
      )}
    </div>
  );
}
