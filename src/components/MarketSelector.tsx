import { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, TrendingUp, Bitcoin, Globe, BarChart2, Zap, X } from 'lucide-react';
import { ALL_PAIRS } from '../lib/signalEngine';

export type MarketType = 'OTC' | 'FOREX' | 'CRYPTO' | 'COMMODITY' | 'VOLATILITY';
export type Timeframe = '30s' | '1m' | '2m' | '5m' | '15m';

export type MarketSelection = {
  marketType: MarketType;
  pair: string;
  timeframe: Timeframe;
};

type Props = {
  value: MarketSelection;
  onChange: (v: MarketSelection) => void;
  onAnalyze: () => void;
  analyzing: boolean;
};

const MARKET_CONFIG: Record<MarketType, { label: string; icon: React.ComponentType<{ className?: string }>; tagClass: string; desc: string }> = {
  OTC:        { label: 'OTC Market',    icon: Zap,        tagClass: 'tag-otc',        desc: 'Over-the-counter pairs 24/7' },
  FOREX:      { label: 'Live Forex',    icon: Globe,      tagClass: 'tag-forex',      desc: 'Live currency markets' },
  CRYPTO:     { label: 'Crypto',        icon: Bitcoin,    tagClass: 'tag-crypto',     desc: 'Crypto spot markets' },
  COMMODITY:  { label: 'Commodities',   icon: BarChart2,  tagClass: 'tag-commodity',  desc: 'Gold, Oil, Natural Gas' },
  VOLATILITY: { label: 'Volatility',    icon: TrendingUp, tagClass: 'tag-volatility', desc: 'Volatility index pairs' },
};

const TIMEFRAMES: { value: Timeframe; label: string }[] = [
  { value: '30s', label: '30 Sec' },
  { value: '1m',  label: '1 Min'  },
  { value: '2m',  label: '2 Min'  },
  { value: '5m',  label: '5 Min'  },
  { value: '15m', label: '15 Min' },
];

export default function MarketSelector({ value, onChange, onAnalyze, analyzing }: Props) {
  const [pairOpen, setPairOpen] = useState(false);
  const [search, setSearch]     = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLInputElement>(null);

  const pairs = ALL_PAIRS[value.marketType] ?? [];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return q ? pairs.filter((p) => p.toLowerCase().includes(q)) : pairs;
  }, [pairs, search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPairOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-focus search when dropdown opens
  useEffect(() => {
    if (pairOpen) setTimeout(() => searchRef.current?.focus(), 50);
  }, [pairOpen]);

  function selectMarket(m: MarketType) {
    const defaultPair = ALL_PAIRS[m][0];
    onChange({ ...value, marketType: m, pair: defaultPair });
    setPairOpen(false);
    setSearch('');
  }

  function selectPair(p: string) {
    onChange({ ...value, pair: p });
    setPairOpen(false);
    setSearch('');
  }

  const cfg = MARKET_CONFIG[value.marketType];
  const Icon = cfg.icon;

  return (
    <div className="phantom-card p-5 space-y-5">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <div className="w-1 h-5 rounded bg-purple-500" />
        <span className="font-orbitron font-bold text-xs tracking-[0.2em] text-purple-300">SELECT MARKET</span>
      </div>

      {/* ── Market type pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {(Object.entries(MARKET_CONFIG) as [MarketType, typeof MARKET_CONFIG[MarketType]][]).map(([type, info]) => {
          const Ic = info.icon;
          const active = value.marketType === type;
          return (
            <button
              key={type}
              onClick={() => selectMarket(type)}
              className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all duration-200 ${
                active
                  ? `border-purple-500/60 bg-purple-950/50 shadow-[0_0_20px_rgba(168,85,247,0.25)]`
                  : 'border-gray-800/60 bg-gray-950/40 hover:border-gray-700 hover:bg-gray-900/40'
              }`}
            >
              {active && <div className="absolute inset-0 rounded-xl shimmer opacity-20 pointer-events-none" />}
              <Ic className={`w-4 h-4 ${active ? 'text-purple-400' : 'text-gray-600'}`} />
              <span className={`text-[10px] font-orbitron font-bold tracking-wider leading-tight ${
                active ? 'text-purple-300' : 'text-gray-600'
              }`}>
                {info.label}
              </span>
              {active && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Pair dropdown + Timeframe ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Pair selector */}
        <div ref={dropdownRef} className="relative">
          <div className="text-[10px] font-orbitron text-gray-600 tracking-widest mb-1.5 uppercase">Trading Pair</div>
          <button
            onClick={() => setPairOpen((v) => !v)}
            className={`w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border transition-all duration-200 ${
              pairOpen
                ? 'border-purple-500/60 bg-purple-950/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'border-gray-800/60 bg-gray-950/50 hover:border-gray-700'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${cfg.tagClass}`}>
                {value.marketType}
              </span>
              <span className="text-white font-bold text-sm truncate font-tech">{value.pair}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform ${pairOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown */}
          {pairOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 z-50 rounded-xl border border-purple-700/50 bg-gray-950/98 shadow-[0_8px_40px_rgba(0,0,0,0.9),0_0_30px_rgba(168,85,247,0.15)] overflow-hidden">
              {/* Search */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60">
                <Search className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search ${pairs.length} pairs...`}
                  className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-tech"
                />
                {search && (
                  <button onClick={() => setSearch('')}>
                    <X className="w-3.5 h-3.5 text-gray-600 hover:text-gray-400" />
                  </button>
                )}
              </div>

              {/* List */}
              <div className="max-h-48 overflow-y-auto">
                {filtered.length === 0 && (
                  <div className="px-4 py-3 text-gray-600 text-xs font-tech">No pairs found</div>
                )}
                {filtered.map((p) => (
                  <button
                    key={p}
                    onClick={() => selectPair(p)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors ${
                      value.pair === p
                        ? 'text-purple-300 bg-purple-950/50'
                        : 'text-gray-300 hover:text-white hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-tech">{p}</span>
                    {value.pair === p && <Check className="w-3.5 h-3.5 text-purple-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Timeframe */}
        <div>
          <div className="text-[10px] font-orbitron text-gray-600 tracking-widest mb-1.5 uppercase">Timeframe</div>
          <div className="grid grid-cols-5 gap-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => onChange({ ...value, timeframe: tf.value })}
                className={`py-3 rounded-xl border text-center transition-all duration-200 ${
                  value.timeframe === tf.value
                    ? 'border-purple-500/60 bg-purple-950/50 text-purple-300 shadow-[0_0_14px_rgba(168,85,247,0.25)]'
                    : 'border-gray-800/60 bg-gray-950/40 text-gray-600 hover:border-gray-700 hover:text-gray-400'
                }`}
              >
                <span className="text-[10px] font-orbitron font-bold tracking-wide leading-tight block">
                  {tf.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Analyze button ── */}
      <button
        onClick={onAnalyze}
        disabled={analyzing}
        className="btn-analyze w-full py-4 text-sm flex items-center justify-center gap-3"
      >
        {analyzing ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>ANALYZING MARKET...</span>
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            <span>ANALYZE MARKET</span>
          </>
        )}
      </button>

      {/* Market info pill */}
      <div className="flex items-center gap-2 bg-black/60 border border-gray-800/40 rounded-lg px-3 py-2">
        <Icon className="w-3 h-3 text-purple-400 flex-shrink-0" />
        <span className="text-gray-500 text-[11px]">{cfg.desc}</span>
        <span className="ml-auto text-purple-500/70 text-[10px] font-tech">{pairs.length} pairs</span>
      </div>
    </div>
  );
}
