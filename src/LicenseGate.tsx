import { useState } from 'react';
import {
  Zap, Shield, Key, Lock, ChevronRight, Activity,
  Eye, EyeOff, CheckCircle, AlertCircle, Globe,
} from 'lucide-react';
import { supabase, NOTIFY_URL, EDGE_HEADERS, UserSession } from '../lib/supabase';

type Props = {
  onActivated: (session: UserSession) => void;
};

type Step = 'intro' | 'activate';

const FEATURES = [
  'Next-Candle AI Prediction',
  '13-Indicator Engine',
  '130+ Tradowix Pairs',
  'OTC · Live · Crypto · Commodities',
  'Smart Money Concepts',
  '24/7 Signal Engine',
];

export default function LicenseGate({ onActivated }: Props) {
  const [step, setStep]       = useState<Step>('intro');
  const [licKey, setLicKey]   = useState('');
  const [tgId, setTgId]       = useState('');
  const [username, setUser]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [showKey, setShowKey] = useState(false);

  async function activate() {
    setError('');
    const key   = licKey.trim().toUpperCase();
    const tid   = tgId.trim().replace(/^@/, '');
    const uname = username.trim().replace(/^@/, '');

    if (!key)   { setError('Please enter your license key.'); return; }
    if (!tid)   { setError('Please enter your Telegram ID (numeric).'); return; }
    if (!uname) { setError('Please enter your Telegram username.'); return; }

    setLoading(true);

    try {
      // 1. Fetch key
      const { data: lic, error: fetchErr } = await supabase
        .from('license_keys')
        .select('*')
        .eq('key', key)
        .maybeSingle();

      if (fetchErr) throw new Error('Database error. Please try again.');
      if (!lic)     throw new Error('License key not found. Double-check your key or contact @OfficialPhantomXWix.');

      // 2. Status checks
      if (lic.status === 'BANNED')   throw new Error('This key has been banned. Contact @OfficialPhantomXWix.');
      if (lic.status === 'REVOKED')  throw new Error('This key has been revoked. Contact admin.');
      if (lic.status === 'EXPIRED')  throw new Error('This key has expired.');
      if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
        await supabase.from('license_keys').update({ status: 'EXPIRED' }).eq('key', key);
        throw new Error('This key has expired.');
      }

      // 3. Anti-clone: bound to a different user
      if (lic.status === 'ACTIVE' && lic.user_telegram_id && lic.user_telegram_id !== tid) {
        throw new Error('This key is already active on another account. One key = one user. Contact @OfficialPhantomXWix for a new key.');
      }

      // 4. Activate
      const sessionToken = `${tid}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const deviceInfo   = `${navigator.userAgent.substring(0, 100)} | ${window.screen.width}x${window.screen.height} | ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;
      const now          = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from('license_keys')
        .update({
          status:           'ACTIVE',
          user_telegram_id:  tid,
          username:          uname,
          device_info:       deviceInfo,
          activated_at:      lic.activated_at ?? now,
          activation_count: (lic.activation_count || 0) + 1,
          session_token:     sessionToken,
          last_seen_at:      now,
        })
        .eq('key', key);

      if (updateErr) throw new Error('Activation failed. Please try again.');

      // 5. Upsert vip_users
      const { data: existing } = await supabase
        .from('vip_users').select('id').eq('telegram_id', tid).maybeSingle();

      if (existing) {
        await supabase.from('vip_users').update({
          username, access_level: lic.tier, is_active: true,
          device_info: deviceInfo, last_active: now, license_key: key,
        }).eq('id', existing.id);
      } else {
        await supabase.from('vip_users').insert([{
          telegram_id: tid, username: uname, access_level: lic.tier,
          is_active: true, device_info: deviceInfo, license_key: key,
          expires_at: lic.expires_at,
        }]);
      }

      // 6. Admin notification (fire-and-forget)
      fetch(NOTIFY_URL, {
        method: 'POST', headers: EDGE_HEADERS,
        body: JSON.stringify({
          username: uname, telegramId: tid, licenseKey: key,
          tier: lic.tier, deviceInfo, activatedAt: now,
        }),
      }).catch(() => {});

      // 7. Build + persist session
      const session: UserSession = {
        licenseKey: key, telegramId: tid, username: uname,
        tier: lic.tier, activatedAt: now,
      };
      localStorage.setItem('phantom_session',       JSON.stringify(session));
      localStorage.setItem('phantom_session_token', sessionToken);

      onActivated(session);

    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Activation failed. Please try again.');
    }

    setLoading(false);
  }

  /* ── Intro screen ───────────────────────────────────────────────── */
  if (step === 'intro') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full bg-purple-600/7 blur-3xl pointer-events-none" />
        <div className="absolute top-10 left-1/4 w-px h-32 bg-gradient-to-b from-purple-500 to-transparent opacity-30 lightning pointer-events-none" />
        <div className="absolute top-20 right-1/3 w-px h-24 bg-gradient-to-b from-purple-400 to-transparent opacity-20 lightning pointer-events-none" style={{ animationDelay: '2s' }} />

        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-md">
          {/* Logo */}
          <div className="relative mb-6 float">
            <div className="absolute inset-0 rounded-full border border-purple-500/15 radiate pointer-events-none" />
            <div className="absolute inset-2 rounded-full border border-purple-500/08 radiate pointer-events-none" style={{ animationDelay: '.8s' }} />
            <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-900/80 to-black border border-purple-500/55 flex items-center justify-center phantom-glow">
              <Zap className="w-12 h-12 text-purple-300 fill-purple-600/50" />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-orbitron font-black text-4xl sm:text-5xl text-white tracking-widest mb-1 glitch">
            PHANTOM<span className="neon-text"> X</span>
          </h1>
          <div className="font-tech text-purple-500/60 text-xs tracking-[0.4em] mb-1 uppercase">Tradowix OTC Signal Bot</div>
          <div className="divider-neon w-52 mx-auto mb-6" />

          <p className="text-gray-400 text-sm font-tech leading-relaxed mb-6 px-2">
            Elite AI-powered next-candle prediction system.<br />
            Activate your license key to access premium signals.
          </p>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-2 w-full mb-8">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-left bg-gray-950/60 border border-gray-800/50 rounded-xl px-3 py-2">
                <CheckCircle className="w-3 h-3 text-purple-500 flex-shrink-0" />
                <span className="text-gray-400 text-[11px] font-tech">{f}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setStep('activate')}
            className="btn-analyze w-full py-4 text-sm flex items-center justify-center gap-3 mb-4"
          >
            <Key className="w-4 h-4" />
            ACTIVATE LICENSE
            <ChevronRight className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 text-gray-700 text-[11px] font-tech">
            <Globe className="w-3 h-3" />
            <span>Browser-based · No install required · Works on Chrome</span>
          </div>

          <div className="mt-3 text-gray-700 text-[10px] font-tech">
            Need a key? Contact <span className="text-purple-500">@OfficialPhantomXWix</span>
          </div>
        </div>
      </div>
    );
  }

  /* ── Activate screen ────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-purple-600/7 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="flex flex-col items-center mb-7">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-900/80 to-black border border-purple-500/55 flex items-center justify-center phantom-glow mb-3">
            <Lock className="w-7 h-7 text-purple-300" />
          </div>
          <h2 className="font-orbitron font-black text-2xl text-white tracking-widest">ACTIVATE BOT</h2>
          <p className="text-gray-600 text-xs font-tech mt-1">Enter your license credentials below</p>
        </div>

        <div className="phantom-card p-6 space-y-4">

          {/* License key */}
          <div>
            <label className="text-[10px] font-orbitron text-gray-500 tracking-widest uppercase block mb-1.5">
              License Key
            </label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 pointer-events-none" />
              <input
                type={showKey ? 'text' : 'password'}
                value={licKey}
                onChange={(e) => { setLicKey(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && activate()}
                placeholder="PHANTOM-VIP-2026-001"
                autoComplete="off"
                spellCheck={false}
                className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl pl-10 pr-10 py-3 text-white text-sm font-tech placeholder-gray-700 focus:outline-none transition-colors tracking-widest"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Telegram ID */}
          <div>
            <label className="text-[10px] font-orbitron text-gray-500 tracking-widest uppercase block mb-1.5">
              Telegram ID <span className="text-gray-700 normal-case font-sans">(numeric, e.g. 123456789)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 text-sm font-tech select-none pointer-events-none">#</span>
              <input
                type="text"
                inputMode="numeric"
                value={tgId}
                onChange={(e) => { setTgId(e.target.value.replace(/[^0-9]/g, '')); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && activate()}
                placeholder="123456789"
                className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl pl-8 pr-4 py-3 text-white text-sm font-tech placeholder-gray-700 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="text-[10px] font-orbitron text-gray-500 tracking-widest uppercase block mb-1.5">
              Telegram Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-600 text-sm font-tech select-none pointer-events-none">@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => { setUser(e.target.value.replace(/^@/, '')); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && activate()}
                placeholder="your_username"
                className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl pl-8 pr-4 py-3 text-white text-sm font-tech placeholder-gray-700 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/30 border border-red-700/40 rounded-xl px-3.5 py-3">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-red-400 text-xs font-tech leading-relaxed">{error}</span>
            </div>
          )}

          {/* Activate button */}
          <button
            type="button"
            onClick={activate}
            disabled={loading}
            className="btn-analyze w-full py-4 text-sm flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                VERIFYING KEY...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                ACTIVATE &amp; ENTER DASHBOARD
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => { setStep('intro'); setError(''); }}
            className="w-full text-gray-600 text-xs font-tech py-2 hover:text-gray-400 transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Info strip */}
        <div className="mt-4 space-y-1.5">
          <div className="flex items-center justify-center gap-2 text-gray-700 text-[10px] font-tech">
            <Shield className="w-3 h-3" />
            <span>1 key = 1 user · Anti-clone protection · Admin notified</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-gray-700 text-[10px] font-tech">
            <Activity className="w-3 h-3" />
            <span>Works in Chrome, Safari, Firefox · Desktop &amp; Mobile</span>
          </div>
          <div className="text-center text-gray-700 text-[10px] font-tech">
            Need a key? Contact <span className="text-purple-500 font-bold">@OfficialPhantomXWix</span>
          </div>
        </div>
      </div>
    </div>
  );
}
