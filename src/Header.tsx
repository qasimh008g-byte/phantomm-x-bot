import { useState, useEffect } from 'react';
import { Zap, Menu, X, Activity, Shield, LogOut, Crown } from 'lucide-react';
import { UserSession } from '../lib/supabase';

type Props = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  session?: UserSession;
  onLogout?: () => void;
};

const TABS = [
  { id: 'dashboard', label: 'DASHBOARD' },
  { id: 'signals',   label: 'SIGNALS'   },
  { id: 'scanner',   label: 'SCANNER'   },
  { id: 'stats',     label: 'ANALYTICS' },
  { id: 'vip',       label: 'VIP'       },
  { id: 'admin',     label: 'ADMIN'     },
];

const TIER_ICON = { VIP: Crown, ELITE: Crown, ADMIN: Shield };
const TIER_CLR  = { VIP: 'text-yellow-400', ELITE: 'text-purple-300', ADMIN: 'text-cyan-400' };

export default function Header({ activeTab, onTabChange, session, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [time, setTime]         = useState(new Date());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const TierIcon = session ? (TIER_ICON[session.tier] ?? Shield) : Shield;
  const tierCls  = session ? (TIER_CLR[session.tier]  ?? 'text-purple-300') : '';

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'glass shadow-[0_4px_30px_rgba(0,0,0,0.9)]' : 'bg-black/95'}`}>
      {/* Top neon stripe */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-purple-500 to-transparent"
           style={{ boxShadow: '0 0 10px rgba(168,85,247,0.6)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-[58px]">

          {/* ── Logo ── */}
          <button onClick={() => onTabChange('dashboard')} className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex-shrink-0">
              <div className="absolute inset-0 rounded-full border border-purple-500/20 radiate" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-purple-900/80 to-black border border-purple-500/60 flex items-center justify-center phantom-glow group-hover:phantom-glow transition-all">
                <Zap className="w-5 h-5 text-purple-300 fill-purple-500/40" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border border-black animate-pulse" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-orbitron font-black text-base tracking-[0.15em] neon-text flicker">
                PHANTOM<span className="text-white"> X</span>
              </span>
              <span className="text-[9px] font-tech text-purple-500/60 tracking-[0.4em] uppercase mt-0.5">
                Tradowix · OTC Bot
              </span>
            </div>
          </button>

          {/* ── Desktop nav ── */}
          <nav className="hidden md:flex items-center gap-0.5">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-3 py-1.5 text-[11px] font-orbitron font-bold tracking-widest rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'text-purple-300 bg-purple-950/70 border border-purple-500/40 shadow-[0_0_14px_rgba(168,85,247,0.35)]'
                    : 'text-gray-500 hover:text-purple-400 hover:bg-purple-950/30'
                }`}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-[2px] bg-purple-400 rounded-full" />
                )}
              </button>
            ))}
          </nav>

          {/* ── Right indicators ── */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-950/30 border border-green-700/30 rounded-full px-2.5 py-1">
              <Activity className="w-3 h-3 text-green-400 animate-pulse" />
              <span className="text-green-400 text-[10px] font-orbitron font-bold tracking-widest">LIVE</span>
            </div>
            <span className="text-purple-400/60 text-[11px] font-tech tabular-nums">
              {time.toLocaleTimeString('en-US', { hour12: false })}
            </span>

            {/* Session user badge */}
            {session && (
              <div className="flex items-center gap-1.5 bg-gray-950 border border-gray-800/60 rounded-full pl-2 pr-1 py-1">
                <TierIcon className={`w-3 h-3 ${tierCls}`} />
                <span className="text-gray-300 text-[10px] font-tech max-w-[80px] truncate">{session.username}</span>
                <button
                  onClick={onLogout}
                  title="Log out"
                  className="ml-1 p-1 text-gray-600 hover:text-red-400 transition-colors rounded-full hover:bg-red-950/30"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2 text-purple-400" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-purple-900/40 px-4 py-3 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setMenuOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-[11px] font-orbitron font-bold tracking-widest rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'text-purple-300 bg-purple-950/70 border border-purple-500/40'
                  : 'text-gray-500 hover:text-purple-400'
              }`}
            >
              {tab.label}
            </button>
          ))}
          {session && (
            <button
              onClick={() => { onLogout?.(); setMenuOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-[11px] font-orbitron font-bold tracking-widest rounded-lg text-red-500 hover:bg-red-950/30 transition-all flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" /> LOGOUT
            </button>
          )}
        </div>
      )}
    </header>
  );
}
