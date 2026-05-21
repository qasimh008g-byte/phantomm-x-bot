import { useEffect, useState, useCallback } from 'react';
import { Wifi, WifiOff, RefreshCw, Activity, Cpu, Zap } from 'lucide-react';
import { supabase, BotHeartbeat, EDGE_URL, EDGE_HEADERS } from '../lib/supabase';

export default function BotStatus() {
  const [heartbeat, setHeartbeat]   = useState<BotHeartbeat | null>(null);
  const [pinging, setPinging]       = useState(false);
  const [lastPing, setLastPing]     = useState('');
  const [isOnline, setIsOnline]     = useState(true); // optimistic default
  const [connecting, setConnecting] = useState(true);

  const fetchLast = useCallback(async () => {
    const { data } = await supabase
      .from('bot_heartbeat')
      .select('*')
      .order('pinged_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setHeartbeat(data as BotHeartbeat);
      const age = (Date.now() - new Date(data.pinged_at).getTime()) / 1000;
      setIsOnline(age < 180); // 3 min tolerance
      setLastPing(new Date(data.pinged_at).toLocaleTimeString('en-US', { hour12: false }));
    }
    setConnecting(false);
  }, []);

  const ping = useCallback(async (silent = false) => {
    if (!silent) setPinging(true);
    try {
      const res  = await fetch(`${EDGE_URL}?action=heartbeat`, {
        headers: EDGE_HEADERS,
        signal: AbortSignal.timeout(8000),
      });
      const json = await res.json();
      if (json.status === 'ONLINE') {
        setIsOnline(true);
        setLastPing(new Date().toLocaleTimeString('en-US', { hour12: false }));
        setConnecting(false);
      }
      await fetchLast();
    } catch {
      // Network failure — keep whatever the DB says, don't flip offline immediately
      await fetchLast();
    }
    if (!silent) setPinging(false);
  }, [fetchLast]);

  // On mount: fetch DB record first (instant), then do a live ping
  useEffect(() => {
    fetchLast().then(() => {
      // Give DB read a head-start, then do live ping
      const t = setTimeout(() => ping(true), 400);
      return () => clearTimeout(t);
    });
    // Refresh every 50s
    const iv = setInterval(() => ping(true), 50000);
    return () => clearInterval(iv);
  }, [fetchLast, ping]);

  const BARS = [35, 65, 100, 70, 45];

  return (
    <div className={`phantom-card p-4 transition-all duration-500 ${
      connecting
        ? ''
        : isOnline
        ? 'border-green-900/40 shadow-[0_0_20px_rgba(34,197,94,0.07)]'
        : 'border-red-900/30'
    }`}>
      <div className="flex items-center justify-between">

        {/* Left side */}
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${
              connecting
                ? 'border-gray-700/40 bg-gray-900/40'
                : isOnline
                ? 'border-green-700/50 bg-green-950/40'
                : 'border-red-800/40 bg-red-950/20'
            }`}>
              {connecting ? (
                <div className="w-4 h-4 border-2 border-gray-600/30 border-t-purple-500 rounded-full animate-spin" />
              ) : isOnline ? (
                <Wifi className="w-4 h-4 text-green-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            {!connecting && isOnline && (
              <div className="absolute inset-0 rounded-xl border border-green-500/20 animate-ping" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-orbitron font-black text-xs tracking-widest text-white">ENGINE</span>
              <span className={`text-[9px] font-orbitron font-black px-2 py-0.5 rounded border transition-all ${
                connecting
                  ? 'text-gray-500 border-gray-700/40 bg-gray-900/30'
                  : isOnline
                  ? 'text-green-400 border-green-700/40 bg-green-950/30'
                  : 'text-red-400 border-red-700/40 bg-red-950/30'
              }`}>
                {connecting ? 'CONNECTING...' : isOnline ? '24/7 ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-gray-600 text-[10px] font-tech mt-0.5 leading-tight">
              {connecting
                ? 'Establishing connection...'
                : lastPing
                ? `Last ping: ${lastPing}${heartbeat ? ` · ${heartbeat.pairs_scanned} pairs` : ''}`
                : 'Ready'
              }
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Animated heartbeat bars */}
          <div className="hidden sm:flex items-end gap-0.5 h-6">
            {BARS.map((h, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full transition-all duration-500 ${
                  isOnline && !connecting ? 'bg-green-500' : 'bg-gray-800'
                }`}
                style={{
                  height: `${isOnline && !connecting ? h : 15}%`,
                  animation: isOnline && !connecting
                    ? `heartbeat ${0.6 + i * 0.12}s ease-in-out infinite alternate`
                    : 'none',
                }}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => ping(false)}
            disabled={pinging || connecting}
            className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold text-gray-600 hover:text-purple-400 border border-gray-800/60 hover:border-purple-700/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-3 h-3 ${pinging ? 'animate-spin' : ''}`} />
            {pinging ? 'PINGING...' : 'PING'}
          </button>
        </div>
      </div>

      {/* Stats row — shown once we have heartbeat data */}
      {heartbeat && !connecting && (
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-800/40">
          {[
            { icon: Activity, label: 'Status',  value: heartbeat.status,                  color: 'text-green-400'  },
            { icon: Cpu,      label: 'Pairs',   value: `${heartbeat.pairs_scanned}`,       color: 'text-purple-400' },
            { icon: Zap,      label: 'Signals', value: `${heartbeat.signals_generated}`,   color: 'text-blue-400'   },
          ].map(({ icon: Ic, label, value, color }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <Ic className={`w-3 h-3 ${color}`} />
                <span className="text-gray-600 text-[9px] font-orbitron tracking-wider uppercase">{label}</span>
              </div>
              <div className={`text-xs font-orbitron font-black ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
