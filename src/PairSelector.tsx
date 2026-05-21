import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, Star, ChevronDown, Check,
  TrendingUp, Globe, Bitcoin, BarChart2, Zap, X, Heart,
} from 'lucide-react';
import { ALL_PAIRS, PAIR_PAYOUTS } from '../lib/signalEngine';
import { UserSession } from '../lib/supabase';

export type MarketType = 'ALL' | 'OTC' | 'FOREX' | 'CRYPTO' | 'COMMODITY' | 'VOLATILITY';
export type Timeframe  = '30s' | '1m' | '2m' | '5m' | '15m';

export type PairSelection = {
  marketType: MarketType;
  pair: string;
  category: string;
  timeframe: Timeframe;
};

type Props = {
  value: PairSelection;
  onChange: (v: PairSelection) => void;
  session: UserSession;
};

const CAT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  OTC: Zap, FOREX: Globe, CRYPTO: Bitcoin, COMMODITY: BarChart2, VOLATILITY: TrendingUp,
};

const CAT_COLORS: Record<string, string> = {
  OTC:        '#c084fc',
  FOREX:      '#60a5fa',
  CRYPTO:     '#fbbf24',
  COMMODITY:  '#fb923c',
  VOLATILITY: '#f87171',
};

const TIMEFRAMES: { v: Timeframe; label: string }[] = [
  { v: '30s', label: '30s' },
  { v: '1m',  label: '1m'  },
  { v: '2m',  label: '2m'  },
  { v: '5m',  label: '5m'  },
  { v: '15m', label: '15m' },
];

const CATEGORIES: { id: MarketType; label: string }[] = [
  { id: 'ALL',        label: 'All'         },
  { id: 'OTC',        label: 'OTC'         },
  { id: 'FOREX',      label: 'Forex'       },
  { id: 'CRYPTO',     label: 'Crypto'      },
  { id: 'COMMODITY',  label: 'Commodity'   },
  { id: 'VOLATILITY', label: 'Volatility'  },
];

function getCategoryForPair(pair: string): string {
  for (const [cat, pairs] of Object.entries(ALL_PAIRS)) {
    if ((pairs as string[]).includes(pair)) return cat;
  }
  return 'OTC';
}

// Stable payouts so they don't flicker on re-render
const STABLE_PAYOUTS: Record<string, number> = {};
for (const [cat, pairs] of Object.entries(ALL_PAIRS)) {
  for (const p of pairs as string[]) {
    if (!STABLE_PAYOUTS[p]) {
      STABLE_PAYOUTS[p] = PAIR_PAYOUTS[p] ??
        (cat === 'OTC' ? 82 : cat === 'FOREX' ? 80 : cat === 'CRYPTO' ? 85 : cat === 'COMMODITY' ? 78 : 88);
    }
  }
}

export default function PairSelector({ value, onChange, session }: Props) {
  const [open, setOpen]             = useState(false);
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState<MarketType>('ALL');
  const [favorites, setFavorites]   = useState<string[]>([]);
  const [showFavOnly, setShowFavOnly] = useState(false);

  const wrapperRef  = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* ── favorites ─────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`phantom_favs_${session.telegramId}`);
      if (raw) setFavorites(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [session.telegramId]);

  function saveFavs(list: string[]) {
    setFavorites(list);
    localStorage.setItem(`phantom_favs_${session.telegramId}`, JSON.stringify(list));
  }

  function toggleFav(pair: string, e: React.MouseEvent) {
    e.stopPropagation();
    saveFavs(
      favorites.includes(pair) ? favorites.filter((f) => f !== pair) : [...favorites, pair]
    );
  }

  /* ── close on outside click ─────────────────── */
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* ── auto-focus search when opens ───────────── */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* ── build flat + grouped lists ─────────────── */
  const allPairList = useMemo(() => {
    const list: { pair: string; category: string }[] = [];
    for (const [cat, pairs] of Object.entries(ALL_PAIRS)) {
      for (const p of pairs as string[]) list.push({ pair: p, category: cat });
    }
    return list;
  }, []);

  const filtered = useMemo(() => {
    let list = allPairList;
    if (catFilter !== 'ALL') list = list.filter((p) => p.category === catFilter);
    if (showFavOnly)         list = list.filter((p) => favorites.includes(p.pair));
    if (search.trim())       list = list.filter((p) => p.pair.toLowerCase().includes(search.toLowerCase().trim()));
    return list;
  }, [allPairList, catFilter, showFavOnly, search, favorites]);

  const grouped = useMemo(() => {
    const g: Record<string, string[]> = {};
    for (const { pair, category } of filtered) {
      if (!g[category]) g[category] = [];
      g[category].push(pair);
    }
    return g;
  }, [filtered]);

  /* ── select pair ─────────────────────────────── */
  function selectPair(pair: string) {
    const cat = getCategoryForPair(pair);
    onChange({ ...value, pair, category: cat, marketType: cat as MarketType });
    setOpen(false);
    setSearch('');
    setShowFavOnly(false);
  }

  /* ── derived display values ──────────────────── */
  const category = value.category || getCategoryForPair(value.pair);
  const payout   = STABLE_PAYOUTS[value.pair] ?? 82;
  const CatIcon  = CAT_ICONS[category] ?? Zap;

  return (
    <div className="phantom-card p-5 space-y-5">

      {/* Label */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded bg-purple-500 flex-shrink-0" />
        <span className="font-orbitron font-bold text-xs tracking-[0.2em] text-purple-300">SELECT PAIR &amp; TIMEFRAME</span>
      </div>

      {/* ── Market-type quick filter buttons (OUTSIDE dropdown, always visible) ── */}
      <div>
        <div className="text-[10px] font-orbitron text-gray-600 tracking-widest mb-2 uppercase">Market Type</div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const active = catFilter === cat.id && !open
              ? false  // these buttons only filter the dropdown, so show active when dropdown open
              : catFilter === cat.id;
            // Show as active when this is the selected market type on the open dropdown
            const isActive = catFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCatFilter(cat.id);
                  // If a pair from the new category is needed, select first pair
                  if (cat.id !== 'ALL') {
                    const pairsInCat = allPairList.filter((p) => p.category === cat.id);
                    // Only switch pair if current pair is not in this category
                    const currentInCat = getCategoryForPair(value.pair) === cat.id;
                    if (!currentInCat && pairsInCat.length > 0) {
                      selectPair(pairsInCat[0].pair);
                      return; // selectPair already calls onChange
                    }
                  }
                  setOpen(true); // open dropdown to show filtered pairs
                }}
                className={[
                  'relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[11px] font-orbitron font-bold tracking-wider transition-all duration-200 select-none cursor-pointer',
                  isActive
                    ? 'border-purple-500/70 bg-purple-950/60 text-purple-200 shadow-[0_0_16px_rgba(168,85,247,0.35)]'
                    : 'border-gray-800/60 bg-gray-950/40 text-gray-500 hover:border-purple-700/40 hover:text-purple-400 hover:bg-purple-950/20',
                ].join(' ')}
              >
                {isActive && (
                  <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
                    <span className="block w-full h-full shimmer opacity-20" />
                  </span>
                )}
                {cat.id !== 'ALL' && (
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: CAT_COLORS[cat.id] ?? '#a855f7' }}
                  />
                )}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Pair dropdown ── */}
      <div ref={wrapperRef} className="relative">
        <div className="text-[10px] font-orbitron text-gray-600 tracking-widest mb-2 uppercase">Trading Pair</div>

        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={[
            'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 cursor-pointer',
            open
              ? 'border-purple-500/60 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
              : 'border-gray-800/60 bg-gray-950/50 hover:border-purple-700/40 hover:bg-purple-950/10',
          ].join(' ')}
        >
          {/* Icon */}
          <div className="w-9 h-9 rounded-xl bg-purple-950/60 border border-purple-700/40 flex items-center justify-center flex-shrink-0">
            <CatIcon className="w-4 h-4 text-purple-400" />
          </div>

          {/* Pair name + category + payout */}
          <div className="flex-1 min-w-0 text-left">
            <div className="text-white font-orbitron font-black text-base leading-tight truncate">{value.pair}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span
                className="text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border"
                style={{
                  color: CAT_COLORS[category] ?? '#a855f7',
                  borderColor: `${CAT_COLORS[category] ?? '#a855f7'}55`,
                  background:  `${CAT_COLORS[category] ?? '#a855f7'}18`,
                }}
              >
                {category}
              </span>
              <span className="text-green-400 text-[10px] font-tech font-bold">+{payout}%</span>
            </div>
          </div>

          {/* Star */}
          <button
            type="button"
            onClick={(e) => toggleFav(value.pair, e)}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-yellow-950/30 transition-colors"
          >
            <Star className={`w-4 h-4 transition-colors ${
              favorites.includes(value.pair) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700 hover:text-yellow-500'
            }`} />
          </button>

          <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180 text-purple-400' : ''}`} />
        </button>

        {/* ── Dropdown panel ── */}
        {open && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 mt-2 z-[999] rounded-2xl border border-purple-600/40 overflow-hidden"
            style={{
              background: 'rgb(5, 5, 10)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.97), 0 0 40px rgba(168,85,247,0.12)',
            }}
          >
            {/* Search + favorites toggle */}
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60">
              <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${filtered.length} pairs...`}
                className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-tech"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="p-0.5 text-gray-600 hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFavOnly((v) => !v)}
                className={[
                  'flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-orbitron font-bold transition-all',
                  showFavOnly
                    ? 'border-yellow-600/60 bg-yellow-950/40 text-yellow-400'
                    : 'border-gray-800 text-gray-600 hover:text-yellow-500 hover:border-yellow-800/40',
                ].join(' ')}
              >
                <Heart className="w-3 h-3" />
                FAVS
              </button>
            </div>

            {/* Category tabs inside dropdown */}
            <div className="flex gap-1 px-2 py-2 border-b border-gray-800/40 overflow-x-auto">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCatFilter(cat.id); }}
                  className={[
                    'flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-orbitron font-bold tracking-wide transition-all cursor-pointer',
                    catFilter === cat.id
                      ? 'bg-purple-950/70 border border-purple-500/60 text-purple-200'
                      : 'text-gray-600 hover:text-purple-400 hover:bg-purple-950/20',
                  ].join(' ')}
                >
                  {cat.label}
                  {cat.id !== 'ALL' && (
                    <span className="ml-1 text-gray-700">
                      ({ALL_PAIRS[cat.id]?.length ?? 0})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Pairs list */}
            <div className="overflow-y-auto" style={{ maxHeight: '260px' }}>
              {/* Favorites section */}
              {!showFavOnly && favorites.length > 0 && catFilter === 'ALL' && !search && (
                <div>
                  <div className="px-3 py-1.5 text-[9px] font-orbitron tracking-widest border-b border-gray-900/80 bg-yellow-950/20 text-yellow-600/80">
                    ★ FAVORITES
                  </div>
                  {favorites
                    .filter((f) => catFilter === 'ALL' || getCategoryForPair(f) === catFilter)
                    .map((pair) => (
                      <PairRow
                        key={`fav-${pair}`}
                        pair={pair}
                        selected={value.pair === pair}
                        isFav
                        onSelect={() => selectPair(pair)}
                        onFav={(e) => toggleFav(pair, e)}
                      />
                    ))
                  }
                </div>
              )}

              {/* No results */}
              {Object.keys(grouped).length === 0 && (
                <div className="px-4 py-8 text-center text-gray-600 text-xs font-tech">
                  {showFavOnly ? 'No favorites yet. Click ★ to add.' : 'No pairs found.'}
                </div>
              )}

              {/* Grouped pairs */}
              {Object.entries(grouped).map(([cat, pairs]) => (
                <div key={cat}>
                  <div
                    className="px-3 py-1.5 text-[9px] font-orbitron tracking-widest border-b border-gray-900/80 bg-gray-950/60 sticky top-0"
                    style={{ color: CAT_COLORS[cat] ?? '#a855f7' }}
                  >
                    {cat} <span className="text-gray-700 ml-1">({pairs.length})</span>
                  </div>
                  {pairs.map((pair) => (
                    <PairRow
                      key={pair}
                      pair={pair}
                      selected={value.pair === pair}
                      isFav={favorites.includes(pair)}
                      onSelect={() => selectPair(pair)}
                      onFav={(e) => toggleFav(pair, e)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Timeframe buttons ── */}
      <div>
        <div className="text-[10px] font-orbitron text-gray-600 tracking-widest mb-2 uppercase">Expiry / Timeframe</div>
        <div className="grid grid-cols-5 gap-2">
          {TIMEFRAMES.map((tf) => {
            const isActive = value.timeframe === tf.v;
            return (
              <button
                key={tf.v}
                type="button"
                onClick={() => onChange({ ...value, timeframe: tf.v })}
                className={[
                  'relative py-3 rounded-xl border text-center transition-all duration-200 cursor-pointer overflow-hidden',
                  isActive
                    ? 'border-purple-500/70 bg-purple-950/50 text-purple-200 shadow-[0_0_14px_rgba(168,85,247,0.3)]'
                    : 'border-gray-800/60 bg-gray-950/40 text-gray-600 hover:border-purple-700/40 hover:text-purple-400 hover:bg-purple-950/20',
                ].join(' ')}
              >
                {isActive && (
                  <span className="absolute inset-0 shimmer opacity-20 pointer-events-none" />
                )}
                <span className="relative text-[11px] font-orbitron font-bold">{tf.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Payout strip ── */}
      <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-gray-800/40 bg-black/50">
        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
        <span className="text-gray-500 text-xs font-tech">Payout if correct</span>
        <span className="text-green-400 font-orbitron font-black text-base ml-auto">+{payout}%</span>
      </div>
    </div>
  );
}

/* ── Pair row ─────────────────────────────────────────────────────── */
function PairRow({
  pair, selected, isFav, onSelect, onFav,
}: {
  pair: string;
  selected: boolean;
  isFav: boolean;
  onSelect: () => void;
  onFav: (e: React.MouseEvent) => void;
}) {
  const payout = STABLE_PAYOUTS[pair] ?? 82;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors cursor-pointer',
        selected ? 'bg-purple-950/40' : 'hover:bg-purple-950/15',
      ].join(' ')}
    >
      {/* Pair name */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-tech font-bold truncate block ${selected ? 'text-purple-200' : 'text-gray-300 hover:text-white'}`}>
          {pair}
        </span>
      </div>

      {/* Payout */}
      <span className="text-green-400 text-[10px] font-tech font-bold flex-shrink-0">+{payout}%</span>

      {/* Fav star */}
      <button
        type="button"
        onClick={onFav}
        className="flex-shrink-0 p-1 rounded hover:bg-yellow-950/30 transition-colors"
      >
        <Star className={`w-3.5 h-3.5 transition-colors ${isFav ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700 hover:text-yellow-500'}`} />
      </button>

      {/* Check */}
      {selected && <Check className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
    </button>
  );
}
