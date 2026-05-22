import { useState, useEffect, useCallback, memo } from 'react';
import {
  Zap, TrendingUp, TrendingDown, RefreshCw,
  Activity, BarChart2, ArrowUp, ArrowDown, XCircle,
} from 'lucide-react';
import { supabase, Signal, SignalStats, EDGE_URL, EDGE_HEADERS, UserSession } from '../lib/supabase';
import {
  analyzeNextCandle, generateSignalFromPair, scorePair,
  getSecondsToNextCandle, AnalysisResult,
} from '../lib/signalEngine';
import TradowixMarket, { PairSelection } from './TradowixMarket';
import NextCandleSignal from './NextCandleSignal';
import AiScanner from './AiScanner';
import CandleCountdown from './CandleCountdown';
import BotStatus from './BotStatus';

type Props = {
  stats: SignalStats | null;
  onStatsUpdate: () => void;
  session: UserSession;
};

const DEFAULT_PAIR: PairSelection = {
  pair: 'EUR/USD OTC',
  category: 'OTC',
  timeframe: '1m',
};

/* ── Memoised signal history card ──────────────────────────────────── */
const SignalHistoryCard = memo(({ s }: { s: Signal }) => {
  const isBuy  = s.direction === 'BUY';
  const nextUp = s.next_candle === 'UP' || (!s.next_candle && isBuy);
  return (
    <div className={`${isBuy ? 'signal-card-buy' : 'signal-card-sell'} rounded-2xl p-4 space-y-2 fade-slide-up`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-white font-orbitron font-black text-sm truncate">{s.asset}</div>
          <div className="text-gray-600 text-[10px] font-tech">{new Date(s.created_at).toLocaleString()}</div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border flex-shrink-0 ${
          nextUp ? 'border-green-700/40 bg-green-950/30' : 'border-red-700/40 bg-red-950/30'
        }`}>
          {nextUp
            ? <ArrowUp   className="w-4 h-4 text-green-400" />
            : <ArrowDown className="w-4 h-4 text-red-400"   />
          }
          <span className={`font-orbitron font-black text-sm ${nextUp ? 'text-green-400' : 'text-red-400'}`}>
            {s.direction}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${s.confidence}%`,
              background: 'linear-gradient(90deg,#4c1d95,#7c3aed,#a855f7)',
            }}
          />
        </div>
        <span className="text-purple-300 text-xs font-orbitron font-black flex-shrink-0">{s.confidence}%</span>
        {s.result === 'WIN'  && <span className="text-green-400  text-[10px] font-orbitron font-black">WIN</span>}
        {s.result === 'LOSS' && <span className="text-red-400    text-[10px] font-orbitron font-black">LOSS</span>}
      </div>
    </div>
  );
});
SignalHistoryCard.displayName = 'SignalHistoryCard';

/* ── Dashboard ─────────────────────────────────────────────────────── */
export default function Dashboard({ stats, onStatsUpdate, session }: Props) {
  const [signals, setSignals]         = useState<Signal[]>([]);
  const [scanning, setScanning]       = useState(false);
  const [autoMode, setAutoMode]       = useState(true);
  const [pair, setPair]               = useState<PairSelection>(DEFAULT_PAIR);
  const [currentResult, setResult]    = useState<AnalysisResult | null>(null);
  const [isNewResult, setIsNewResult] = useState(false);
  const [loading, setLoading]         = useState(true);

  const fetchSignals = useCallback(async () => {
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    setSignals((data || []) as Signal[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSignals(); }, [fetchSignals]);

  // Auto-scan 15s before each candle opens
  useEffect(() => {
    if (!autoMode) return;
    let fired = false;
    const iv = setInterval(() => {
      const s = getSecondsToNextCandle();
      if (s <= 16 && s >= 14 && !fired) {
        fired = true;
        runAutoScan();
      }
      if (s > 20) fired = false;
    }, 1000);
    return () => clearInterval(iv);
  }, [autoMode, pair]);

  async function runAutoScan() {
    try {
      const res  = await fetch(`${EDGE_URL}?action=auto`, {
        headers: EDGE_HEADERS,
        signal: AbortSignal.timeout(10000),
      });
      const json = await res.json();
      if (json.signal_generated) { await fetchSignals(); onStatsUpdate(); }
    } catch { /* silent */ }
  }

  function handleAnalyze() {
    if (scanning) return;
    setScanning(true);
    setResult(null);
    setIsNewResult(false);
  }

  async function onScanComplete() {
    const result = analyzeNextCandle(pair.pair, pair.category);
    setResult(result);
    setIsNewResult(true);

    if (result.isValid) {
      const scored = scorePair(pair.pair, pair.category);
      if (scored) {
        const signalData = generateSignalFromPair(scored);
        const { data } = await supabase.from('signals').insert([signalData]).select().single();
        if (data) { await fetchSignals(); onStatsUpdate(); }
      }
    }

    setTimeout(() => setIsNewResult(false), 8000);
    setScanning(false);
  }

  const latestSignal = signals[0] ?? null;
  const buyCount     = signals.filter((s) => s.direction === 'BUY').length;
  const sellCount    = signals.filter((s) => s.direction === 'SELL').length;

  return (
    <div className="space-y-5">

      {/* ══════════════════════════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden border border-purple-900/40" style={{ isolation: 'isolate' }}>
        {/* Decorative layers — pointer-events: none prevents blocking clicks */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-950/22 via-black to-black pointer-events-none" />
        <div className="absolute inset-0 cyber-grid opacity-30 pointer-events-none" />
        <div className="absolute top-0 right-0 w-44 h-full pointer-events-none overflow-hidden">
          <div className="absolute top-4  right-5  w-px h-24 bg-gradient-to-b from-purple-500 to-transparent opacity-30 lightning" />
          <div className="absolute top-0  right-14 w-px h-18 bg-gradient-to-b from-purple-400 to-transparent opacity-20 lightning" style={{ animationDelay: '1.5s' }} />
          <div className="absolute top-8  right-1  w-px h-32 bg-gradient-to-b from-purple-600 to-transparent opacity-15 lightning" style={{ animationDelay: '3s' }} />
        </div>
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-purple-600/9 blur-3xl pointer-events-none" />

        <div className="relative z-10 px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">

              {/* Status row */}
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="flex items-center gap-1.5 bg-green-950/40 border border-green-700/40 rounded-full px-3 py-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                  <span className="text-green-400 text-[10px] font-orbitron font-bold tracking-widest whitespace-nowrap">24/7 ACTIVE</span>
                </span>
                <span className="flex items-center gap-1.5 bg-purple-950/40 border border-purple-700/40 rounded-full px-3 py-1">
                  <span className="text-purple-300 text-[10px] font-orbitron font-bold tracking-widest">{session.tier}</span>
                </span>
                <span className="flex items-center gap-1.5 bg-gray-900/60 border border-gray-700/40 rounded-full px-3 py-1">
                  <span className="text-gray-400 text-[10px] font-tech">@{session.username}</span>
                </span>
              </div>

              {/* Title */}
              <h1 className="font-orbitron font-black text-3xl sm:text-4xl tracking-widest leading-none mb-1 glitch">
                <span className="text-white">PHANTOM</span><span className="neon-text"> X</span>
              </h1>
              <p className="text-gray-600 text-[10px] font-tech tracking-[0.22em] uppercase mb-1">
                TRADOWIX · Next-Candle AI · 130+ Pairs
              </p>
              <div className="divider-neon w-40 mb-4" />

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setAutoMode((v) => !v)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-[11px] font-orbitron font-bold tracking-wider transition-all ${
                    autoMode
                      ? 'border-green-700/50 bg-green-950/30 text-green-400'
                      : 'border-gray-700/50 bg-gray-900/20 text-gray-500 hover:border-gray-600 hover:text-gray-300'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  AUTO {autoMode ? 'ON' : 'OFF'}
                </button>
                <button
                  type="button"
                  onClick={fetchSignals}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-800/50 bg-gray-900/20 text-gray-500 hover:text-purple-400 hover:border-purple-700/40 text-[11px] font-orbitron font-bold tracking-wider transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  REFRESH
                </button>
              </div>
            </div>

            {/* Logo icon */}
            <div className="hidden sm:block flex-shrink-0">
              <div className="relative w-18 h-18 float">
                <div className="absolute inset-0 rounded-full border border-purple-500/15 radiate pointer-events-none" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-900/60 to-black border border-purple-500/45 flex items-center justify-center phantom-glow">
                  <Zap className="w-8 h-8 text-purple-300 fill-purple-600/40" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MAIN 2-COLUMN LAYOUT
          Left: pair market panel | Right: analyze + result
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-5 items-start">

        {/* ── LEFT: Tradowix Market Panel ────────────────────────────── */}
        <TradowixMarket
          value={pair}
          onChange={setPair}
          telegramId={session.telegramId}
        />

        {/* ── RIGHT: Analysis column ─────────────────────────────────── */}
        <div className="space-y-4">

          {/* Selected pair info card */}
          <div className="phantom-card px-5 py-4">
            <div className="text-gray-600 text-[9px] font-orbitron tracking-widest mb-1">ANALYZING</div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-white font-orbitron font-black text-lg truncate">{pair.pair}</div>
              <span className="text-purple-400 text-[10px] font-orbitron font-bold border border-purple-700/40 bg-purple-950/30 px-2 py-0.5 rounded flex-shrink-0">
                {pair.timeframe}
              </span>
            </div>
            <div className="text-gray-600 text-[10px] font-tech mt-0.5">{pair.category} Market · Entry on next candle</div>
          </div>

          {/* Analyze button */}
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={scanning}
            className="btn-analyze w-full py-5 text-sm flex items-center justify-center gap-3"
          >
            {scanning ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="font-orbitron font-black tracking-widest">ANALYZING MARKET...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span className="font-orbitron font-black tracking-widest">⚡ ANALYZE NEXT CANDLE</span>
              </>
            )}
          </button>

          {/* Scanner animation */}
          {scanning && <AiScanner scanning={scanning} onScanComplete={onScanComplete} />}

          {/* Signal result */}
          {currentResult && !scanning && (
            currentResult.isValid ? (
              <NextCandleSignal result={currentResult} isNew={isNewResult} />
            ) : (
              <div className="phantom-card p-5 fade-slide-up">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/30 border border-red-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <div className="text-red-400 font-orbitron font-bold text-sm tracking-wider">NO SIGNAL</div>
                    <div className="text-gray-500 text-xs font-tech mt-1 leading-relaxed">{currentResult.skipReason}</div>
                  </div>
                </div>
              </div>
            )
          )}

          {/* Bot status */}
          <BotStatus />

          {/* Candle countdown */}
          <CandleCountdown
            latestSignal={latestSignal
              ? { direction: latestSignal.direction, next_candle: latestSignal.next_candle, asset: latestSignal.asset }
              : null}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          QUICK STATS
      ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: Activity,     label: 'Win Rate', value: stats ? `${Number(stats.win_rate).toFixed(1)}%` : '—', color: 'text-green-400'  },
          { icon: BarChart2,    label: 'Signals',  value: stats?.total_signals.toString() ?? '—',              color: 'text-purple-400' },
          { icon: TrendingUp,   label: 'BUY',      value: buyCount.toString(),                                  color: 'text-green-400'  },
          { icon: TrendingDown, label: 'SELL',      value: sellCount.toString(),                                 color: 'text-red-400'    },
        ].map(({ icon: Ic, label, value, color }) => (
          <div key={label} className="phantom-card p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Ic className={`w-3.5 h-3.5 ${color}`} />
              <span className="text-gray-600 text-[10px] font-orbitron uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-orbitron font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════
          SIGNAL HISTORY
      ══════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1.5 h-4 rounded bg-purple-500 flex-shrink-0" />
          <span className="font-orbitron font-bold tracking-widest text-sm text-white">SIGNAL HISTORY</span>
          <span className="text-gray-700 text-xs font-tech ml-1">({signals.length})</span>
        </div>

        {loading && (
          <div className="phantom-card p-10 text-center">
            <div className="w-7 h-7 border-2 border-purple-800/40 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
            <div className="text-gray-600 text-sm font-tech">Loading signals...</div>
          </div>
        )}

        {!loading && signals.length === 0 && (
          <div className="phantom-card p-10 text-center">
            <Zap className="w-8 h-8 text-gray-800 mx-auto mb-3" />
            <div className="text-gray-600 text-sm font-tech">Select a pair and tap Analyze Next Candle.</div>
          </div>
        )}

        {!loading && signals.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {signals.map((s) => <SignalHistoryCard key={s.id} s={s} />)}
          </div>
        )}
      </div>
    </div>
  );
}
