import { createSignal, onMount, Show } from 'solid-js';
import { Layers, Database, ShieldCheck } from 'lucide-solid';
import SetList, { type TcgSet } from './components/SetList';
import SetDetail from './components/SetDetail';
import MissingCardSearch from './components/MissingCardSearch';

function App() {
  const [activeTab, setActiveTab] = createSignal<'sets' | 'missing'>('sets');
  const [loading, setLoading] = createSignal(true);
  const [sets, setSets] = createSignal<TcgSet[]>([]);
  const [selectedSet, setSelectedSet] = createSignal<TcgSet | null>(null);

  onMount(async () => {
    try {
      const response = await fetch('./data/sets.json');
      if (!response.ok) throw new Error('Failed to load card sets index');
      const data = await response.json();
      setSets(data);
    } catch (e) {
      console.error('Error fetching sets metadata:', e);
    } finally {
      setLoading(false);
    }
  });

  return (
    <div class="app-container">
      {/* Header */}
      <header class="header">
        <a href="/" class="logo-container" onClick={(e) => { e.preventDefault(); setActiveTab('sets'); }}>
          <Database class="logo-icon" />
          <h1 class="logo-text">MD Missing Cards</h1>
        </a>

        <div class="nav-links">
          <button
            class={`nav-btn ${activeTab() === 'sets' ? 'active' : ''}`}
            onClick={() => setActiveTab('sets')}
          >
            <Layers size={16} /> TCG Sets
          </button>
          <button
            class={`nav-btn ${activeTab() === 'missing' ? 'active' : ''}`}
            onClick={() => setActiveTab('missing')}
          >
            <ShieldCheck size={16} /> Global Missing
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main class="main-content">
        <Show when={!loading()} fallback={
          <div class="loading-container">
            <div class="spinner"></div>
            <p>Initializing card sets catalog...</p>
          </div>
        }>
          <Show when={activeTab() === 'sets'} fallback={<MissingCardSearch />}>
            <SetList
              sets={sets()}
              onSelectSet={(set) => setSelectedSet(set)}
            />
          </Show>
        </Show>
      </main>

      {/* Set Details Overlay */}
      <SetDetail
        set={selectedSet()}
        onClose={() => setSelectedSet(null)}
      />
    </div>
  );
}

export default App;
