import { Trophy, TrendingUp, TrendingDown, Activity, Flame, Target, BarChart3, Award } from 'lucide-react';
import { SignalStats } from '../lib/supabase';

type Props = { stats: SignalStats | null };

export default function StatsPanel({ stats }: Props) {
  if (!stats) return (
    <div className="phantom-card p-10 text-center text-gray-600 text-sm font-tech animate-pulse">
      Loading analytics...
    </div>
  );

  const pct = Number(stats.win_rate).toFixed(1);

  const CARDS = [
    { icon: Activity,    label: 'Total Signals', value: stats.total_signals, color: 'text-purple-400', border: 'border-purple-800/30 bg-purple-950/20' },
    { icon: Trophy,      label: 'Win Rate',       value: `${pct}%`,          color: 'text-green-400',  border: 'border-green-800/30 bg-green-950/20' },
    { icon: TrendingUp,  label: 'Wins',           value: stats.wins,         color: 'text-green-400',  border: 'border-green-800/30 bg-green-950/20' },
    { icon: TrendingDown,label: 'Losses',         value: stats.losses,       color: 'text-red-400',    border: 'border-red-800/30 bg-red-950/20' },
    { icon: Flame,       label: 'Streak',         value: `${stats.streak}x`, color: 'text-orange-400', border: 'border-orange-800/30 bg-orange-950/20' },
    { icon: Target,      label: 'Accuracy',       value: `${pct}%`,          color: 'text-purple-300', border: 'border-purple-800/30 bg-purple-950/20' },
  ];

  return (
    <div className="space-y-5">
      {/* Hero win rate */}
      <div className="phantom-card p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 cyber-grid opacity-20" />
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Award className="w-4 h-4 text-purple-400" />
            <span className="font-orbitron font-bold text-xs tracking-widest text-purple-400 uppercase">Overall Performance</span>
          </div>
          <div className="font-orbitron font-black text-6xl text-white mb-1">
            {pct}<span className="neon-text">%</span>
          </div>
          <div className="text-gray-600 text-sm font-tech mb-4">Win Rate</div>

          {/* Bar */}
          <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-green-700 to-green-500 transition-all duration-1000"
              style={{ width: `${stats.win_rate}%` }}
            />
            <div className="h-full bg-gradient-to-r from-red-700 to-red-500 flex-1" />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-green-500 text-xs font-orbitron font-bold">{stats.wins} WINS</span>
            <span className="text-red-500 text-xs font-orbitron font-bold">{stats.losses} LOSSES</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CARDS.map(({ icon: Ic, label, value, color, border }) => (
          <div key={label} className={`rounded-xl border p-4 ${border}`}>
            <div className="flex items-center gap-2 mb-2">
              <Ic className={`w-4 h-4 ${color}`} />
              <span className="text-gray-600 text-[10px] font-orbitron uppercase tracking-wider">{label}</span>
            </div>
            <div className={`text-2xl font-orbitron font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Performance bars */}
      <div className="phantom-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-purple-400" />
          <span className="font-orbitron font-bold text-sm tracking-wider text-white">SIGNAL PERFORMANCE</span>
        </div>
        <div className="flex items-end gap-1.5 h-28">
          {[72, 88, 65, 91, 78, 94, 82, 89, 76, 92, 85, 96].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm transition-all duration-700"
              style={{
                height: `${h}%`,
                background: h >= 85
                  ? 'linear-gradient(to top, #6d28d9, #a855f7)'
                  : h >= 75
                  ? 'linear-gradient(to top, #15803d, #22c55e)'
                  : 'linear-gradient(to top, #991b1b, #ef4444)',
              }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-gray-700 text-[10px] font-tech">Last 12 sessions</span>
          <span className="text-purple-400 text-[10px] font-orbitron font-bold">Avg: 85.7%</span>
        </div>
      </div>
    </div>
  );
}
