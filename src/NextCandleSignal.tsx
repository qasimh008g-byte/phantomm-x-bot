import { useEffect, useState } from 'react';
import {
  ArrowUp, ArrowDown, Cpu, Clock, Target, AlertTriangle,
  Zap, TrendingUp, TrendingDown, BarChart2, Activity, Timer,
} from 'lucide-react';
import { AnalysisResult } from '../lib/signalEngine';
import { getSecondsToNextCandle } from '../lib/signalEngine';

type Props = {
  result: AnalysisResult;
  isNew?: boolean;
};

export default function NextCandleSignal({ result, isNew = false }: Props) {
  const [secs, setSecs] = useState(getSecondsToNextCandle());

  useEffect(() => {
    const iv = setInterval(() => setSecs(getSecondsToNextCandle()), 1000);
    return () => clearInterval(iv);
  }, []);

  const isBuy   = result.direction === 'BUY';
  const isUrgent = secs <= 15;

  const CAT_TAG: Record<string, string> = {
    OTC: 'tag-otc', FOREX: 'tag-forex', CRYPTO: 'tag-crypto',
    COMMODITY: 'tag-commodity', VOLATILITY: 'tag-volatility',
  };

  const riskCls = {
    LOW:    'text-green-400 border-green-700/40 bg-green-950/25',
    MEDIUM: 'text-yellow-400 border-yellow-700/40 bg-yellow-950/25',
    HIGH:   'text-red-400 border-red-700/40 bg-red-950/25',
  }[result.riskLevel];

  const INDICATOR_MAP: Record<string, string> = {
    ema5_20:   result.scores.ema5_20 === 'BULL' ? '✓ EMA5 > EMA20' : '✗ EMA5 < EMA20',
    ema20_50:  result.scores.ema20_50 === 'BULL' ? '✓ EMA20 > EMA50' : result.scores.ema20_50 === 'BEAR' ? '✗ EMA20 < EMA50' : '~ EMA20/50 Neutral',
    ema50_200: result.scores.ema50_200 !== 'NEUTRAL' ? (result.scores.ema50_200 === 'BULL' ? '✓ EMA50 > EMA200' : '✗ EMA50 < EMA200') : '',
    rsi:       `RSI ${result.scores.rsi.toFixed(1)} (${result.scores.rsiSignal})`,
    macd:      `MACD ${result.scores.macd}`,
    bb:        `BB ${result.scores.bb === 'LOWER' ? 'Lower Band ↑' : result.scores.bb === 'UPPER' ? 'Upper Band ↓' : 'Mid Band'}`,
    volume:    `Volume ${result.scores.volume}`,
    pattern:   result.scores.pattern,
    sr:        result.scores.sr === 'SUPPORT' ? 'Support Bounce' : 'Resistance Reject',
    smc:       result.scores.smc === 'DEMAND' ? 'SMC Demand Zone' : 'SMC Supply Zone',
    liq:       result.scores.liquiditySweep !== 'NONE' ? (result.scores.liquiditySweep === 'LOW_SWEPT' ? 'Liquidity Low Swept' : 'Liquidity High Swept') : '',
    momentum:  `Momentum ${result.scores.momentum}`,
    volatility:`Volatility ${result.scores.volatility}`,
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
      isNew ? 'animate-pulse-once' : ''
    } ${isBuy ? 'signal-card-buy' : 'signal-card-sell'} ${
      isNew ? isBuy ? 'shadow-[0_0_50px_rgba(34,197,94,0.2)]' : 'shadow-[0_0_50px_rgba(239,68,68,0.2)]' : ''
    }`}>

      {/* Scan line for new signals */}
      {isNew && <div className="scan-line" />}

      <div className="p-5 space-y-4">

        {/* ── Bot header ── */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-800/60" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Cpu className="w-3 h-3 text-purple-500" />
            <span className="font-orbitron text-[9px] font-black text-purple-500 tracking-[0.3em]">PHANTOM X BOT</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-800/60" />
        </div>

        {/* ── Pair row ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isBuy ? 'bg-green-950/60 border-green-800/40' : 'bg-red-950/60 border-red-800/40'
            }`}>
              {isBuy ? <TrendingUp className="w-5 h-5 text-green-400" /> : <TrendingDown className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <div className="text-white font-orbitron font-black text-base tracking-wider">{result.pair}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${CAT_TAG[result.category] || 'tag-otc'}`}>
                  {result.category}
                </span>
                <span className="text-gray-600 text-[10px] font-tech flex items-center gap-1">
                  <Timer className="w-3 h-3" /> Current Candle Running...
                </span>
              </div>
            </div>
          </div>
          <div className={`text-[10px] font-orbitron font-black px-2 py-1 rounded-lg border ${
            isUrgent ? 'text-purple-200 border-purple-500/60 bg-purple-950/50 animate-pulse' : 'text-gray-500 border-gray-700/40'
          }`}>
            {String(Math.floor(secs / 60)).padStart(2, '0')}:{String(secs % 60).padStart(2, '0')}
          </div>
        </div>

        {/* ── Next candle hero ── */}
        <div className={`relative rounded-2xl px-5 py-4 border overflow-hidden ${
          isBuy ? 'border-green-700/40 bg-green-950/20' : 'border-red-700/40 bg-red-950/20'
        }`}>
          {/* Shimmer if urgent */}
          {isUrgent && <div className="absolute inset-0 shimmer opacity-30 pointer-events-none" />}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Big arrow */}
              <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center border ${
                isBuy ? 'border-green-600/40 bg-green-950/50' : 'border-red-600/40 bg-red-950/50'
              }`}>
                {isNew && <div className={`absolute inset-0 rounded-2xl border ${isBuy ? 'border-green-500/30' : 'border-red-500/30'} animate-ping`} />}
                {isBuy
                  ? <ArrowUp   className="w-7 h-7 text-green-400" />
                  : <ArrowDown className="w-7 h-7 text-red-400"   />
                }
              </div>
              <div>
                <div className="text-gray-500 text-[10px] font-tech mb-0.5">⚡ NEXT SIGNAL</div>
                <div className={`font-orbitron font-black text-2xl ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
                  {result.direction} {isBuy ? '🟢' : '🔴'}
                </div>
                <div className={`text-xs font-orbitron font-black tracking-wider mt-0.5 ${isBuy ? 'text-green-500/70' : 'text-red-500/70'}`}>
                  NEXT CANDLE {result.nextCandle}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="font-orbitron font-black text-3xl text-white">{result.confidence}%</div>
              <div className="text-gray-600 text-[10px] font-tech">confidence</div>
            </div>
          </div>

          {/* Entry instruction */}
          <div className={`mt-3 flex items-center gap-2 bg-black/40 rounded-xl px-3 py-2 border ${
            isBuy ? 'border-green-800/30' : 'border-red-800/30'
          }`}>
            <Clock className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
            <span className="text-gray-400 text-xs font-tech">
              🕒 ENTRY TIME: NEXT MINUTE &nbsp;·&nbsp; ⌛ EXPIRY: {result.expiry}
            </span>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock,         label: 'Entry',   val: result.entryTime,              cls: 'text-white font-tech' },
            { icon: Target,        label: 'Trend',   val: result.trend.split(' ')[0],    cls: isBuy ? 'text-green-400' : 'text-red-400' },
            { icon: AlertTriangle, label: 'Risk',    val: result.riskLevel,              cls: riskCls.split(' ')[0] },
          ].map(({ icon: Ic, label, val, cls }) => (
            <div key={label} className="bg-black/50 rounded-xl p-3 border border-gray-800/40 text-center">
              <Ic className="w-3.5 h-3.5 text-purple-500 mx-auto mb-1" />
              <div className={`font-bold text-xs ${cls}`}>{val}</div>
              <div className="text-gray-700 text-[9px] mt-0.5 uppercase font-orbitron tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Confidence bar ── */}
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-gray-600 text-[10px] font-orbitron tracking-wider">AI CONFIDENCE</span>
            <span className="text-purple-400 text-[10px] font-tech">{result.confirmations}× confirmations</span>
          </div>
          <div className="h-2 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${result.confidence}%`,
                background: result.confidence >= 92
                  ? 'linear-gradient(90deg,#6d28d9,#a855f7,#c084fc)'
                  : result.confidence >= 85
                  ? 'linear-gradient(90deg,#1d4ed8,#7c3aed,#a855f7)'
                  : 'linear-gradient(90deg,#374151,#6b21a8)',
              }}
            />
          </div>
        </div>

        {/* ── Indicator breakdown ── */}
        <div>
          <div className="text-gray-600 text-[10px] font-orbitron tracking-widest mb-2">INDICATOR ANALYSIS</div>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.values(INDICATOR_MAP).filter(Boolean).map((ind, i) => {
              const isBullInd = ind.startsWith('✓') || (isBuy && !ind.startsWith('✗'));
              return (
                <div key={i} className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 border text-[10px] font-tech ${
                  isBullInd
                    ? 'border-green-900/40 bg-green-950/15 text-green-400/80'
                    : 'border-red-900/40 bg-red-950/15 text-red-400/80'
                }`}>
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${isBullInd ? 'bg-green-500' : 'bg-red-500'}`} />
                  {ind.replace(/^[✓✗~] /, '')}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Timing note ── */}
        <div className="flex items-center gap-2 bg-purple-950/20 border border-purple-800/30 rounded-xl px-3.5 py-2.5">
          <Zap className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
          <span className="text-purple-500/80 text-[10px] font-tech">Signal sent 15 sec before candle open</span>
          {isUrgent && (
            <span className="ml-auto font-orbitron font-black text-[10px] text-purple-300 animate-pulse">ENTER NOW</span>
          )}
        </div>

      </div>
    </div>
  );
}
