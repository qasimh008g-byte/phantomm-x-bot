import { useState, useMemo, useRef, useCallback, memo } from 'react';
import {
  Search, Star, X, TrendingUp, TrendingDown,
  Zap, Globe, Bitcoin, BarChart2, Activity,
} from 'lucide-react';
import { ALL_PAIRS, PAIR_PAYOUTS } from '../lib/signalEngine';

export type MarketFilter = 'ALL' | 'OTC' | 'LIVE' | 'CRYPTO' | 'COMMODITY' | 'VOLATILITY';
export type Timeframe    = '30s' | '1m' | '2m' | '3m' | '5m';

export type PairSelection = {
  pair: string;
  category: string;
  timeframe: Timeframe;
};

type Props = {
  value: PairSelection;
  onChange: (v: PairSelection) => void;
  telegramId: string;
};

/* ── Stable computed data ─────────────────────────────────────────── */
type PairMeta = {
  pair: string;
  category: string;
  tag: 'OTC' | 'LIVE' | 'CRYPTO' | 'COMMODITY' | 'VOLATILITY';
  payout: number;
  volatility: 'LOW' | 'MED' | 'HIGH';
  signalStrength: number; // 1-5 bars
};

function categoryToTag(cat: string): PairMeta['tag'] {
  if (cat === 'FOREX')     return 'LIVE';
  if (cat === 'CRYPTO')    return 'CRYPTO';
  if (cat === 'COMMODITY') return 'COMMODITY';
  if (cat === 'VOLATILITY')return 'VOLATILITY';
  return 'OTC';
}

// Build pair metadata once — stable across renders
const PAIR_META_LIST: PairMeta[] = (() => {
  const list: PairMeta[] = [];
  const volSeed: Record<string, PairMeta['volatility']> = {};
  const strSeed: Record<string, number> = {};

  for (const [cat, pairs] of Object.entries(ALL_PAIRS)) {
    for (const pair of pairs as string[]) {
      if (!volSeed[pair]) {
        const r = Math.random();
        volSeed[pair] = r < 0.35 ? 'LOW' : r < 0.7 ? 'MED' : 'HIGH';
        strSeed[pair] = Math.floor(Math.random() * 3) + 3; // 3-5
      }
      list.push({
        pair,
        category: cat,
        tag: categoryToTag(cat),
        payout: PAIR_PAYOUTS[pair] ?? 82,
        volatility: volSeed[pair],
        signalStrength: strSeed[pair],
      });
    }
  }
  return list;
})();

const META_BY_PAIR: Record<string, PairMeta> = {};
PAIR_META_LIST.forEach((m) => { META_BY_PAIR[m.pair] = m; });

/* ── Constants ────────────────────────────────────────────────────── */
const TIMEFRAMES: { v: Timeframe; label: string }[] = [
  { v: '30s', label: '30s' }, { v: '1m', label: '1m' },
  { v: '2m', label: '2m' },  { v: '3m', label: '3m' },
  { v: '5m', label: '5m' },
];

const FILTER_TABS: { id: MarketFilter; label: string; count: number }[] = [
  { id: 'ALL',        label: 'ALL',        count: PAIR_META_LIST.length },
  { id: 'OTC',        label: 'OTC',        count: PAIR_META_LIST.filter((p) => p.tag === 'OTC').length },
  { id: 'LIVE',       label: 'LIVE',       count: PAIR_META_LIST.filter((p) => p.tag === 'LIVE').length },
  { id: 'CRYPTO',     label: 'CRYPTO',     count: PAIR_META_LIST.filter((p) => p.tag === 'CRYPTO').length },
  { id: 'COMMODITY',  label: 'COMMODITY',  count: PAIR_META_LIST.filter((p) => p.tag === 'COMMODITY').length },
  { id: 'VOLATILITY', label: 'VOLATILITY', count: PAIR_META_LIST.filter((p) => p.tag === 'VOLATILITY').length },
];

const TAG_COLORS: Record<string, { text: string; border: string; bg: string }> = {
  OTC:       { text: 'text-purple-300', border: 'border-purple-600/35', bg: 'bg-purple-950/25' },
  LIVE:      { text: 'text-green-400',  border: 'border-green-600/35',  bg: 'bg-green-950/25'  },
  CRYPTO:    { text: 'text-yellow-400', border: 'border-yellow-600/35', bg: 'bg-yellow-950/20' },
  COMMODITY: { text: 'text-orange-400', border: 'border-orange-600/35', bg: 'bg-orange-950/20' },
  VOLATILITY:{ text: 'text-red-400',    border: 'border-red-600/35',    bg: 'bg-red-950/20'    },
};

const VOL_COLORS: Record<string, string> = {
  LOW: 'bg-green-500', MED: 'bg-yellow-400', HIGH: 'bg-red-500',
};

/* ── Sub-components (memo'd to prevent re-renders) ────────────────── */
const SignalBars = memo(({ strength, isBuy }: { strength: number; isBuy: boolean }) => (
  <div className="flex items-end gap-[2px] h-3.5">
    {[1, 2, 3, 4, 5].map((i) => (
      <span
        key={i}
        className="w-[3px] rounded-sm"
        style={{
          height: `${30 + i * 14}%`,
          background: i <= strength
            ? isBuy ? '#22c55e' : '#ef4444'
            : '#1f1f2e',
        }}
      />
    ))}
  </div>
));
SignalBars.displayName = 'SignalBars';

const PairCard = memo(({
  meta, selected, isFav, isBuy,
  onSelect, onFav,
}: {
  meta: PairMeta;
  selected: boolean;
  isFav: boolean;
  isBuy: boolean;
  onSelect: () => void;
  onFav: (e: React.MouseEvent) => void;
}) => {
  const tagClr = TAG_COLORS[meta.tag];
  const payout = meta.payout;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`pair-card w-full text-left px-3 py-3 flex items-center gap-3 group ${selected ? 'selected' : ''}`}
    >
      {/* Direction indicator */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
        isBuy
          ? 'bg-green-950/40 border-green-700/30'
          : 'bg-red-950/40 border-red-700/30'
      }`}>
        {isBuy
          ? <TrendingUp   className="w-3.5 h-3.5 text-green-400" />
          : <TrendingDown className="w-3.5 h-3.5 text-red-400"   />
        }
      </div>

      {/* Pair name + tag */}
      <div className="flex-1 min-w-0">
        <div className={`text-[13px] font-orbitron font-bold leading-tight truncate ${selected ? 'text-purple-200' : 'text-gray-100'}`}>
          {meta.pair}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[9px] font-orbitron font-black px-1 py-0.5 rounded border ${tagClr.text} ${tagClr.border} ${tagClr.bg}`}>
            {meta.tag}
          </span>
          <span className={`text-[9px] font-tech ${meta.volatility === 'HIGH' ? 'text-red-400/70' : meta.volatility === 'MED' ? 'text-yellow-400/70' : 'text-green-400/70'}`}>
            {meta.volatility}
          </span>
        </div>
      </div>

      {/* Signal bars */}
      <SignalBars strength={meta.signalStrength} isBuy={isBuy} />

      {/* Payout */}
      <div className="text-right flex-shrink-0">
        <div className="text-green-400 text-[11px] font-orbitron font-black">+{payout}%</div>
        <div className="text-gray-700 text-[9px] font-tech">payout</div>
      </div>

      {/* Fav star */}
      <button
        type="button"
        onClick={onFav}
        className="flex-shrink-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: isFav ? 1 : undefined }}
      >
        <Star className={`w-3.5 h-3.5 ${isFav ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600 hover:text-yellow-400'}`} />
      </button>
    </button>
  );
});
PairCard.displayName = 'PairCard';

/* ── Main component ───────────────────────────────────────────────── */
export default function TradowixMarket({ value, onChange, telegramId }: Props) {
  const [filter, setFilter]       = useState<MarketFilter>('ALL');
  const [search, setSearch]       = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(`phantom_favs_${telegramId}`) ?? '[]');
    } catch { return []; }
  });
  const searchRef = useRef<HTMLInputElement>(null);

  const saveFavs = useCallback((list: string[]) => {
    setFavorites(list);
    localStorage.setItem(`phantom_favs_${telegramId}`, JSON.stringify(list));
  }, [telegramId]);

  const toggleFav = useCallback((pair: string, e: React.MouseEvent) => {
    e.stopPropagation();
    saveFavs(
      favorites.includes(pair) ? favorites.filter((f) => f !== pair) : [...favorites, pair]
    );
  }, [favorites, saveFavs]);

  // Memoised filter computation — zero extra work on parent re-renders
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PAIR_META_LIST.filter((m) => {
      const matchFilter = filter === 'ALL' || m.tag === filter;
      const matchSearch = !q || m.pair.toLowerCase().includes(q);
      return matchFilter && matchSearch;
    });
  }, [filter, search]);

  // Stable direction seed so cards don't re-render on selection change
  const directionMap = useMemo(() => {
    const m: Record<string, boolean> = {};
    PAIR_META_LIST.forEach((p) => { m[p.pair] = Math.random() > 0.5; });
    return m;
  }, []);

  function selectPair(meta: PairMeta) {
    onChange({ pair: meta.pair, category: meta.category, timeframe: value.timeframe });
  }

  const selectedMeta = META_BY_PAIR[value.pair];

  return (
    <div className="phantom-card overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-800/40">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-purple-400" />
          <span className="font-orbitron font-black text-xs tracking-[0.2em] text-purple-300">TRADOWIX SIGNAL ENGINE</span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-[9px] font-orbitron font-bold tracking-widest">LIVE</span>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-black/60 border border-gray-800/60 rounded-xl px-3 py-2.5 mb-3">
          <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${filteredList.length} pairs...`}
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-tech"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-gray-600 hover:text-white transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={[
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[10px] font-orbitron font-bold tracking-wide transition-all cursor-pointer',
                filter === tab.id
                  ? 'border-purple-500/60 bg-purple-950/60 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                  : 'border-gray-800/60 bg-transparent text-gray-600 hover:border-purple-700/30 hover:text-purple-400',
              ].join(' ')}
            >
              <FilterIcon id={tab.id} />
              {tab.label}
              <span className={`text-[9px] ${filter === tab.id ? 'text-purple-400/70' : 'text-gray-700'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Selected pair summary ───────────────────────────────────── */}
      {selectedMeta && (
        <div className="px-4 py-3 border-b border-gray-800/30 bg-purple-950/10">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-orbitron font-black text-sm">{value.pair}</span>
                <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${
                  TAG_COLORS[selectedMeta.tag]?.text} ${TAG_COLORS[selectedMeta.tag]?.border} ${TAG_COLORS[selectedMeta.tag]?.bg
                }`}>{selectedMeta.tag}</span>
              </div>
              <div className="text-gray-500 text-[10px] font-tech mt-0.5">Selected for analysis</div>
            </div>
            <div className="text-green-400 font-orbitron font-black text-lg">+{selectedMeta.payout}%</div>
          </div>

          {/* Timeframe row */}
          <div className="flex gap-1.5 mt-2.5">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.v}
                type="button"
                onClick={() => onChange({ ...value, timeframe: tf.v })}
                className={[
                  'flex-1 py-2 rounded-lg border text-[11px] font-orbitron font-bold transition-all cursor-pointer',
                  value.timeframe === tf.v
                    ? 'border-purple-500/60 bg-purple-950/50 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.25)]'
                    : 'border-gray-800/50 bg-transparent text-gray-600 hover:border-purple-700/30 hover:text-purple-400',
                ].join(' ')}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Pair list ──────────────────────────────────────────────── */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: '340px', overscrollBehavior: 'contain' }}
      >
        {/* Favorites section */}
        {filter === 'ALL' && !search && favorites.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-[9px] font-orbitron tracking-widest text-yellow-600/70 bg-yellow-950/10 border-b border-gray-800/30 sticky top-0 z-10">
              ★ FAVORITES ({favorites.length})
            </div>
            {favorites
              .map((p) => META_BY_PAIR[p])
              .filter(Boolean)
              .map((meta) => (
                <PairCard
                  key={`fav-${meta.pair}`}
                  meta={meta}
                  selected={value.pair === meta.pair}
                  isFav
                  isBuy={directionMap[meta.pair] ?? true}
                  onSelect={() => selectPair(meta)}
                  onFav={(e) => toggleFav(meta.pair, e)}
                />
              ))
            }
            <div className="border-b border-gray-800/30" />
          </div>
        )}

        {filteredList.length === 0 && (
          <div className="px-4 py-10 text-center text-gray-600 text-xs font-tech">No pairs found.</div>
        )}

        {filteredList.map((meta) => (
          <PairCard
            key={meta.pair}
            meta={meta}
            selected={value.pair === meta.pair}
            isFav={favorites.includes(meta.pair)}
            isBuy={directionMap[meta.pair] ?? true}
            onSelect={() => selectPair(meta)}
            onFav={(e) => toggleFav(meta.pair, e)}
          />
        ))}
      </div>

      {/* ── Market stats strip ─────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-gray-800/30 flex items-center gap-4 bg-black/30">
        {[
          { label: 'OTC',    count: PAIR_META_LIST.filter((p) => p.tag === 'OTC').length,        color: 'text-purple-400' },
          { label: 'LIVE',   count: PAIR_META_LIST.filter((p) => p.tag === 'LIVE').length,       color: 'text-green-400'  },
          { label: 'CRYPTO', count: PAIR_META_LIST.filter((p) => p.tag === 'CRYPTO').length,     color: 'text-yellow-400' },
          { label: 'COMMOD', count: PAIR_META_LIST.filter((p) => p.tag === 'COMMODITY').length,  color: 'text-orange-400' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1">
            <span className={`${s.color} font-orbitron font-black text-[11px]`}>{s.count}</span>
            <span className="text-gray-700 text-[9px] font-tech">{s.label}</span>
          </div>
        ))}
        <div className="ml-auto text-gray-700 text-[9px] font-tech">{PAIR_META_LIST.length} total</div>
      </div>
    </div>
  );
}

/* ── Filter icon helper ───────────────────────────────────────────── */
function FilterIcon({ id }: { id: MarketFilter }) {
  const cls = 'w-3 h-3 flex-shrink-0';
  switch (id) {
    case 'OTC':        return <Zap      className={`${cls} text-purple-500`} />;
    case 'LIVE':       return <Activity className={`${cls} text-green-500`}  />;
    case 'CRYPTO':     return <Bitcoin  className={`${cls} text-yellow-500`} />;
    case 'COMMODITY':  return <BarChart2 className={`${cls} text-orange-500`} />;
    case 'VOLATILITY': return <TrendingUp className={`${cls} text-red-500`}  />;
    default:           return <Globe    className={`${cls} text-gray-500`}   />;
  }
}
