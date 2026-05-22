import { useEffect, useState } from 'react';
import { Brain, Search, Layers, TrendingUp, BarChart2, Zap, Activity } from 'lucide-react';

const STEPS = [
  { icon: Search,     text: 'Scanning Tradowix market structure...' },
  { icon: Layers,     text: 'Multi-timeframe analysis...' },
  { icon: BarChart2,  text: 'Computing RSI + MACD + EMA...' },
  { icon: TrendingUp, text: 'Detecting trend & momentum...' },
  { icon: Activity,   text: 'Smart Money + Liquidity scan...' },
  { icon: Brain,      text: 'AI multi-confirmation filter...' },
  { icon: Zap,        text: 'Generating next-candle signal...' },
];

type Props = {
  scanning: boolean;
  onScanComplete?: () => void;
};

export default function AiScanner({ scanning, onScanComplete }: Props) {
  const [step, setStep]         = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!scanning) { setStep(0); setProgress(0); return; }
    setStep(0); setProgress(0);

    const iv = setInterval(() => {
      setStep((s) => {
        const n = s + 1;
        setProgress(Math.round((n / STEPS.length) * 100));
        if (n >= STEPS.length) { clearInterval(iv); onScanComplete?.(); }
        return n;
      });
    }, 350);
    return () => clearInterval(iv);
  }, [scanning]);

  if (!scanning && step === 0) return null;

  const cur  = STEPS[Math.min(step, STEPS.length - 1)];
  const Icon = cur.icon;

  return (
    <div className="relative rounded-2xl border border-purple-700/50 bg-gradient-to-br from-purple-950/20 to-black overflow-hidden p-5 fade-slide-up"
         style={{ boxShadow: '0 0 35px rgba(168,85,247,0.18)' }}>
      {/* Corner brackets */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-purple-500/70 pointer-events-none" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-purple-500/70 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-purple-500/70 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-purple-500/70 pointer-events-none" />
      <div className="scan-line" />

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-purple-900/60 border border-purple-500/50 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-300 animate-pulse" />
          </div>
          <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-ping" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-orbitron font-black text-sm tracking-widest text-white">TRADOWIX AI SCANNING</div>
          <div className="text-purple-400/60 text-[10px] font-tech">Next-candle prediction engine</div>
        </div>
        <div className="font-orbitron font-black text-xl neon-text flex-shrink-0">{progress}%</div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #3b0764, #7c3aed, #a855f7)',
          }}
        />
      </div>

      {/* Step list */}
      <div className="space-y-1.5">
        {STEPS.map((s, i) => {
          const SI     = s.icon;
          const done   = i < step;
          const active = i === step;
          return (
            <div key={i} className={`flex items-center gap-2 transition-all duration-200 ${
              done ? 'opacity-35' : active ? 'opacity-100' : 'opacity-12'
            }`}>
              <SI className={`w-3 h-3 flex-shrink-0 ${
                active ? 'text-purple-400 animate-spin' : done ? 'text-green-500' : 'text-gray-700'
              }`} />
              <span className={`text-[11px] font-tech leading-tight ${
                active ? 'text-purple-300' : done ? 'text-green-500/70' : 'text-gray-700'
              }`}>
                {s.text}
              </span>
              {done   && <span className="ml-auto text-green-500 text-[10px]">✓</span>}
              {active && <span className="ml-auto text-purple-400 text-[9px] font-tech animate-pulse">processing...</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
