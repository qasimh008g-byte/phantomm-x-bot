import {
  TrendingUp, TrendingDown, Clock, Target, AlertTriangle,
  CheckCircle, XCircle, Cpu, ArrowUp, ArrowDown, Timer, Zap,
} from 'lucide-react';
import { Signal } from '../lib/supabase';

type Props = {
  signal: Signal;
  isNew?: boolean;
};

const CAT_TAG: Record<string, string> = {
  OTC: 'tag-otc', FOREX: 'tag-forex', CRYPTO: 'tag-crypto',
  COMMODITY: 'tag-commodity', VOLATILITY: 'tag-volatility',
};

export default function SignalCard({ signal, isNew = false }: Props) {
  const isBuy  = signal.direction === 'BUY';
  const nextUp = signal.next_candle === 'UP' || (!signal.next_candle && isBuy);
  const cat    = signal.pair_category || 'OTC';

  const riskConfig = {
    LOW:    { cls: 'text-green-400 border-green-700/40 bg-green-950/30', label: 'LOW' },
    MEDIUM: { cls: 'text-yellow-400 border-yellow-700/40 bg-yellow-950/30', label: 'MEDIUM' },
    HIGH:   { cls: 'text-red-400 border-red-700/40 bg-red-950/30', label: 'HIGH' },
  }[signal.risk_level];

  return (
    <div className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
      isNew
        ? 'animate-pulse-once shadow-[0_0_40px_rgba(168,85,247,0.35)]'
        : isBuy
        ? 'shadow-[0_0_20px_rgba(34,197,94,0.07)]'
        : 'shadow-[0_0_20px_rgba(239,68,68,0.07)]'
    } ${isBuy ? 'signal-card-buy' : 'signal-card-sell'}`}>

      {/* Scan line (new signals only) */}
      {isNew && <div className="scan-line" />}

      {/* NEW badge */}
      {isNew && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-purple-900/70 border border-purple-500/60 rounded-full px-2.5 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
          <span className="text-purple-200 text-[9px] font-orbitron font-black tracking-widest">LIVE</span>
        </div>
      )}

      <div className="p-4 space-y-3">

        {/* ── Header separator ── */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-800/60" />
          <div className="flex items-center gap-1.5 shrink-0">
            <Cpu className="w-3 h-3 text-purple-500" />
            <span className="font-orbitron text-[9px] font-black text-purple-500 tracking-[0.25em]">PHANTOM X BOT</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-800/60" />
        </div>

        {/* ── Pair + category ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
              isBuy ? 'bg-green-950/60 border border-green-800/40' : 'bg-red-950/60 border border-red-800/40'
            }`}>
              {isBuy
                ? <TrendingUp  className="w-4 h-4 text-green-400" />
                : <TrendingDown className="w-4 h-4 text-red-400" />
              }
            </div>
            <div>
              <div className="text-white font-orbitron font-black text-sm tracking-wide">{signal.asset}</div>
              <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${CAT_TAG[cat]}`}>
                {cat}
              </span>
            </div>
          </div>

          {/* Current candle status */}
          <div className="text-right">
            <div className="flex items-center gap-1 justify-end text-gray-500 text-[10px] mb-0.5">
              <Timer className="w-3 h-3" />
              <span>Candle Running...</span>
            </div>
            <span className={`text-xs font-orbitron font-black tracking-wider ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
              ⚡ NEXT: {signal.direction}
            </span>
          </div>
        </div>

        {/* ── Next candle hero ── */}
        <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${
          nextUp
            ? 'border-green-700/40 bg-green-950/20'
            : 'border-red-700/40 bg-red-950/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${
              nextUp ? 'border-green-600/40 bg-green-950/50' : 'border-red-600/40 bg-red-950/50'
            }`}>
              {nextUp
                ? <ArrowUp   className="w-5 h-5 text-green-400" />
                : <ArrowDown className="w-5 h-5 text-red-400" />
              }
            </div>
            <div>
              <div className={`font-orbitron font-black text-sm tracking-wider ${nextUp ? 'text-green-400' : 'text-red-400'}`}>
                NEXT CANDLE {nextUp ? 'UP 🟢' : 'DOWN 🔴'}
              </div>
              <div className="text-gray-600 text-[10px] mt-0.5">Enter on next candle open</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-purple-200 font-orbitron font-black text-xl">{signal.confidence}%</div>
            <div className="text-gray-600 text-[10px]">confidence</div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Clock,         label: 'Entry',  value: signal.entry_time,             color: 'text-white font-tech' },
            { icon: Target,        label: 'Trend',  value: signal.trend.split(' ')[0],    color: isBuy ? 'text-green-400' : 'text-red-400' },
            { icon: AlertTriangle, label: 'Risk',   value: signal.risk_level,             color: riskConfig.cls.split(' ')[0] },
          ].map(({ icon: Ic, label, value, color }) => (
            <div key={label} className="bg-black/50 rounded-xl p-2.5 border border-gray-800/40 text-center">
              <Ic className="w-3 h-3 text-purple-500 mx-auto mb-1" />
              <div className={`font-bold text-xs ${color}`}>{value}</div>
              <div className="text-gray-700 text-[9px] mt-0.5 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Confidence bar ── */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-600 text-[10px] font-orbitron tracking-wider">AI CONFIDENCE</span>
            <span className="text-purple-400 text-[10px] font-tech">{signal.confirmations}x confirmations</span>
          </div>
          <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${signal.confidence}%`,
                background: signal.confidence >= 90
                  ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)'
                  : signal.confidence >= 85
                  ? 'linear-gradient(90deg, #1d4ed8, #7c3aed, #a855f7)'
                  : 'linear-gradient(90deg, #374151, #6b21a8)',
              }}
            />
          </div>
        </div>

        {/* ── Indicators ── */}
        <div className="flex flex-wrap gap-1">
          {(signal.indicators as string[]).map((ind, i) => (
            <span
              key={i}
              className="text-[9px] text-gray-500 bg-gray-900/70 border border-gray-800/60 rounded px-1.5 py-0.5 font-tech"
            >
              {ind}
            </span>
          ))}
        </div>

        {/* ── Timing note ── */}
        <div className="flex items-center gap-2 bg-purple-950/20 border border-purple-800/30 rounded-lg px-3 py-2">
          <Zap className="w-3 h-3 text-purple-500 flex-shrink-0" />
          <span className="text-purple-500/80 text-[10px] font-tech">
            Signal sent 15 sec before candle open
          </span>
          <span className="ml-auto text-gray-700 text-[10px] font-tech">
            {new Date(signal.created_at).toLocaleTimeString('en-US', { hour12: false })}
          </span>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-800/40">
          <span className={`text-[10px] font-orbitron font-black px-2 py-0.5 rounded border ${
            signal.status === 'ACTIVE'
              ? 'text-purple-300 border-purple-500/40 bg-purple-950/40'
              : signal.status === 'COMPLETED'
              ? 'text-gray-500 border-gray-700/40'
              : 'text-orange-400 border-orange-700/40'
          }`}>
            {signal.status}
          </span>
          {signal.result === 'WIN' && (
            <span className="flex items-center gap-1 text-green-400 text-xs font-orbitron font-black">
              <CheckCircle className="w-3.5 h-3.5" /> WIN
            </span>
          )}
          {signal.result === 'LOSS' && (
            <span className="flex items-center gap-1 text-red-400 text-xs font-orbitron font-black">
              <XCircle className="w-3.5 h-3.5" /> LOSS
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
