import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import StatsPanel from './components/StatsPanel';
import VipSection from './components/VipSection';
import AdminPanel from './components/AdminPanel';
import PairScanner from './components/PairScanner';
import SignalCard from './components/SignalCard';
import LicenseGate from './components/LicenseGate';
import { supabase, SignalStats, Signal, UserSession } from './lib/supabase';

type Tab = 'dashboard' | 'signals' | 'scanner' | 'stats' | 'vip' | 'admin';

export default function App() {
  const [session, setSession]       = useState<UserSession | null>(null);
  const [sessionReady, setReady]    = useState(false);
  const [activeTab, setActiveTab]   = useState<Tab>('dashboard');
  const [stats, setStats]           = useState<SignalStats | null>(null);
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [sigLoading, setSigLoading] = useState(false);

  // Restore + validate session on mount
  useEffect(() => {
    async function restore() {
      const raw = localStorage.getItem('phantom_session');
      if (raw) {
        try {
          const s = JSON.parse(raw) as UserSession;

          // Quick DB check: verify key is still valid
          const { data } = await supabase
            .from('license_keys')
            .select('status, tier')
            .eq('key', s.licenseKey)
            .maybeSingle();

          if (data && (data.status === 'ACTIVE' || data.status === 'UNUSED')) {
            setSession({ ...s, tier: data.tier ?? s.tier });
          } else if (!data) {
            // Key not found — keep local session (offline tolerance)
            setSession(s);
          } else {
            // Banned / revoked / expired → force re-login
            localStorage.removeItem('phantom_session');
            localStorage.removeItem('phantom_session_token');
          }
        } catch {
          // Network failure or parse error — keep session to avoid locking user out
          try { setSession(JSON.parse(raw) as UserSession); } catch { /* corrupt */ }
        }
      }
      setReady(true);
    }
    restore();
  }, []);

  const fetchStats = useCallback(async () => {
    const { data } = await supabase.from('signal_stats').select('*').maybeSingle();
    if (data) setStats(data as SignalStats);
  }, []);

  const fetchAllSignals = useCallback(async () => {
    setSigLoading(true);
    const { data } = await supabase
      .from('signals')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);
    setAllSignals((data || []) as Signal[]);
    setSigLoading(false);
  }, []);

  useEffect(() => { if (session) fetchStats(); }, [session, fetchStats]);

  useEffect(() => {
    if (activeTab === 'signals' && session) fetchAllSignals();
  }, [activeTab, session, fetchAllSignals]);

  function handleLogout() {
    localStorage.removeItem('phantom_session');
    localStorage.removeItem('phantom_session_token');
    setSession(null);
    setStats(null);
    setAllSignals([]);
    setActiveTab('dashboard');
  }

  // While validating stored session — render nothing (HTML splash is visible)
  if (!sessionReady) return null;

  // License gate for unauthenticated users
  if (!session) return <LicenseGate onActivated={setSession} />;

  const SectionHeader = ({ title, count }: { title: string; count?: string }) => (
    <div className="flex items-center gap-3 mb-6">
      <div className="w-1.5 h-6 rounded bg-purple-500 flex-shrink-0" />
      <h2 className="font-orbitron font-black text-lg tracking-widest text-white">{title}</h2>
      {count && <span className="text-gray-700 text-sm font-tech">({count})</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-black">
      <Header
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t as Tab)}
        session={session}
        onLogout={handleLogout}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

        {activeTab === 'dashboard' && (
          <Dashboard stats={stats} onStatsUpdate={fetchStats} session={session} />
        )}

        {activeTab === 'signals' && (
          <div>
            <SectionHeader title="ALL SIGNALS" count={`${allSignals.length}`} />
            {sigLoading && (
              <div className="phantom-card p-16 text-center">
                <div className="w-7 h-7 border-2 border-purple-800/40 border-t-purple-500 rounded-full animate-spin mx-auto mb-3" />
                <div className="text-gray-600 text-sm font-tech">Loading signals...</div>
              </div>
            )}
            {!sigLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allSignals.map((s) => <SignalCard key={s.id} signal={s} />)}
                {allSignals.length === 0 && (
                  <div className="col-span-3 phantom-card p-16 text-center text-gray-600 text-sm font-tech">
                    No signals yet. Use Analyze on the Dashboard.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'scanner' && (
          <div>
            <SectionHeader title="PAIR SCANNER" />
            <PairScanner />
          </div>
        )}

        {activeTab === 'stats' && (
          <div>
            <SectionHeader title="ANALYTICS" />
            <StatsPanel stats={stats} />
          </div>
        )}

        {activeTab === 'vip' && (
          <div>
            <SectionHeader title="VIP ACCESS" />
            <VipSection />
          </div>
        )}

        {activeTab === 'admin' && (
          <div>
            <SectionHeader title="ADMIN PANEL" />
            <AdminPanel />
          </div>
        )}
      </main>

      {/* Bottom glow line */}
      <div className="fixed bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-700/25 to-transparent pointer-events-none" />
    </div>
  );
}
