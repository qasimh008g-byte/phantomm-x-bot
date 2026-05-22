import { useState, useEffect, useCallback } from 'react';
import { Radio, TrendingUp, TrendingDown, Minus, RefreshCw, Filter, Search } from 'lucide-react';
import { supabase, PairRanking } from '../lib/supabase';

const CATS = ['ALL', 'OTC', 'FOREX', 'CRYPTO', 'COMMODITY', 'VOLATILITY'];

const CAT_TAG: Record<string, string> = {
  OTC: 'tag-otc', FOREX: 'tag-forex', CRYPTO: 'tag-crypto',
  COMMODITY: 'tag-commodity', VOLATILITY: 'tag-volatility',
};

export default function PairScanner() {
  const [rankings, setRankings]   = useState<PairRanking[]>([]);
  const [filter, setFilter]       = useState('ALL');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [lastUpdated, setLast]    = useState('');

  const fetch = useCallback(async () => {
    const { data } = await supabase
      .from('pair_rankings')
      .select('*')
      .order('confidence', { ascending: false });
    setRankings((data || []) as PairRanking[]);
    setLast(new Date().toLocaleTimeString('en-US', { hour12: false }));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch();
    const iv = setInterval(fetch, 30000);
    return () => clearInterval(iv);
  }, [fetch]);

  const displayed = rankings
    .filter((r) => filter === 'ALL' || r.category === filter)
    .filter((r) => !search || r.pair.toLowerCase().includes(search.toLowerCase()));

  const top5 = displayed.slice(0, 5);
  const rest  = displayed.slice(5);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="phantom-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="font-orbitron font-black text-sm tracking-widest text-white">PAIR SCANNER</span>
            <span className="text-gray-700 text-xs font-tech">({displayed.length})</span>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-gray-700 text-[10px] font-tech">Updated {lastUpdated}</span>
            )}
            <button onClick={fetch} className="text-gray-600 hover:text-purple-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-gray-950/80 border border-gray-800/60 rounded-xl px-3 py-2 mb-3">
          <Search className="w-3.5 h-3.5 text-gray-600" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pairs..."
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none font-tech"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1.5">
          <Filter className="w-3 h-3 text-gray-700 mt-1 flex-shrink-0" />
          {CATS.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`text-[10px] font-orbitron font-black px-3 py-1 rounded-full border tracking-widest transition-all ${
                filter === cat
                  ? 'border-purple-500/60 bg-purple-950/50 text-purple-300'
                  : 'border-gray-800/60 text-gray-600 hover:border-gray-700 hover:text-gray-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="phantom-card p-10 text-center text-gray-600 text-sm font-tech animate-pulse">
          Scanning all pairs...
        </div>
      )}

      {/* Top 5 */}
      {!loading && top5.length > 0 && (
        <div className="space-y-2">
          <div className="text-gray-700 text-[10px] font-orbitron uppercase tracking-widest px-1">
            Top Opportunities
          </div>
          {top5.map((r, i) => <PairRow key={r.id} r={r} rank={i + 1} highlighted />)}
        </div>
      )}

      {/* Rest */}
      {!loading && rest.length > 0 && (
        <div className="phantom-card overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-800/40">
            <span className="text-gray-700 text-[10px] font-orbitron uppercase tracking-widest">All Pairs</span>
          </div>
          <div className="divide-y divide-gray-800/30">
            {rest.map((r, i) => <PairRow key={r.id} r={r} rank={i + 6} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function PairRow({ r, rank, highlighted = false }: { r: PairRanking; rank: number; highlighted?: boolean }) {
  const isBuy  = r.signal === 'BUY';
  const isWait = r.signal === 'WAIT';

  const inner = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors">
      <div className={`w-5 text-center text-[10px] font-orbitron font-black ${rank <= 3 ? 'text-purple-400' : 'text-gray-700'}`}>
        {rank}
      </div>

      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 border ${
        isBuy  ? 'bg-green-950/50 border-green-700/40' :
        isWait ? 'bg-gray-900 border-gray-800' :
                 'bg-red-950/50 border-red-700/40'
      }`}>
        {isBuy  ? <TrendingUp   className="w-3.5 h-3.5 text-green-400" /> :
         isWait ? <Minus        className="w-3.5 h-3.5 text-gray-600"  /> :
                  <TrendingDown className="w-3.5 h-3.5 text-red-400"   />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-white font-orbitron font-bold text-xs truncate">{r.pair}</div>
        <div className="text-gray-600 text-[10px] font-tech truncate">{r.trend}</div>
      </div>

      <span className={`hidden sm:inline text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${CAT_TAG[r.category]}`}>
        {r.category}
      </span>

      <div className="hidden md:flex flex-col items-center flex-shrink-0">
        <span className="text-[9px] text-gray-700">RSI</span>
        <span className={`text-xs font-tech font-bold ${Number(r.rsi) < 35 ? 'text-green-400' : Number(r.rsi) > 65 ? 'text-red-400' : 'text-gray-400'}`}>
          {Number(r.rsi).toFixed(0)}
        </span>
      </div>

      <div className="hidden sm:flex flex-col items-center flex-shrink-0">
        <span className="text-[9px] text-gray-700">CONF</span>
        <span className="text-xs font-orbitron font-bold text-purple-400">{r.confirmations}x</span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="hidden sm:block w-14 h-1.5 bg-gray-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${r.confidence}%`,
              background: r.confidence >= 90 ? '#a855f7' : r.confidence >= 85 ? '#3b82f6' : '#4b5563',
            }}
          />
        </div>
        <span className={`text-xs font-orbitron font-black w-8 text-right ${
          r.confidence >= 90 ? 'text-purple-300' : r.confidence >= 85 ? 'text-blue-300' : 'text-gray-600'
        }`}>
          {r.confidence}%
        </span>
      </div>

      <span className={`text-[10px] font-orbitron font-black px-2 py-0.5 rounded border flex-shrink-0 ${
        isBuy  ? 'text-green-400 border-green-700/40 bg-green-950/30' :
        isWait ? 'text-gray-600 border-gray-700/40' :
                 'text-red-400 border-red-700/40 bg-red-950/30'
      }`}>
        {r.signal}
      </span>
    </div>
  );

  if (highlighted) {
    return (
      <div className={`rounded-xl overflow-hidden ${
        r.confidence >= 90
          ? 'border border-purple-700/40 shadow-[0_0_15px_rgba(168,85,247,0.1)] bg-gradient-to-r from-purple-950/15 to-black'
          : 'phantom-card'
      }`}>
        {inner}
      </div>
    );
  }
  return inner;
}
