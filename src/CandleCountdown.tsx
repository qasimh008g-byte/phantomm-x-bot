import { useEffect, useState } from 'react';
import { Clock, ArrowUp, ArrowDown, Zap } from 'lucide-react';
import { getSecondsToNextCandle, getNextCandleOpen } from '../lib/signalEngine';

type Props = {
  latestSignal: { direction: 'BUY' | 'SELL'; next_candle?: string; asset?: string } | null;
};

export default function CandleCountdown({ latestSignal }: Props) {
  const [seconds, setSeconds]     = useState(getSecondsToNextCandle());
  const [candleTime, setCandleTime] = useState('');

  useEffect(() => {
    const update = () => {
      setSeconds(getSecondsToNextCandle());
      setCandleTime(
        getNextCandleOpen().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
      );
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  const isUrgent = seconds <= 15;
  const progress = ((60 - seconds) / 60) * 100;
  const isBuy    = latestSignal?.next_candle === 'UP' || latestSignal?.direction === 'BUY';

  return (
    <div className={`phantom-card p-4 transition-all duration-300 ${
      isUrgent ? 'border-purple-500/60 shadow-[0_0_25px_rgba(168,85,247,0.3)]' : ''
    }`}>
      {isUrgent && <div className="absolute inset-0 rounded-2xl bg-purple-500/5 animate-pulse pointer-events-none" />}

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clock className={`w-4 h-4 ${isUrgent ? 'text-purple-400 animate-pulse' : 'text-gray-600'}`} />
          <span className="font-orbitron font-black text-xs tracking-widest text-white">CANDLE TIMER</span>
        </div>
        {isUrgent && (
          <div className="flex items-center gap-1.5 bg-purple-950/60 border border-purple-500/50 rounded-full px-2.5 py-1 animate-pulse">
            <Zap className="w-3 h-3 text-purple-300" />
            <span className="text-purple-200 text-[9px] font-orbitron font-black tracking-widest">SIGNAL WINDOW</span>
          </div>
        )}
      </div>

      <div className="flex items-end justify-between mb-3">
        <div>
          <div className={`text-4xl font-tech tabular-nums font-bold ${
            isUrgent ? 'neon-text' : 'text-white'
          }`}>
            {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </div>
          <div className="text-gray-700 text-[10px] font-tech mt-1">
            next candle opens {candleTime}
          </div>
        </div>

        {latestSignal && (
          <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-xl border ${
            isBuy ? 'border-green-700/40 bg-green-950/25' : 'border-red-700/40 bg-red-950/25'
          }`}>
            {isBuy ? <ArrowUp className="w-5 h-5 text-green-400" /> : <ArrowDown className="w-5 h-5 text-red-400" />}
            <span className={`text-[10px] font-orbitron font-black ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
              NEXT {isBuy ? 'UP' : 'DOWN'}
            </span>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: isUrgent
              ? 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)'
              : 'linear-gradient(90deg, #374151, #6b7280)',
          }}
        />
      </div>

      {/* Urgent entry prompt */}
      {isUrgent && latestSignal && (
        <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2 border ${
          isBuy ? 'border-green-700/40 bg-green-950/20' : 'border-red-700/40 bg-red-950/20'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-ping ${isBuy ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs font-orbitron font-black tracking-wider ${isBuy ? 'text-green-400' : 'text-red-400'}`}>
            ENTER {latestSignal.direction} — {latestSignal.asset}
          </span>
        </div>
      )}
    </div>
  );
}
