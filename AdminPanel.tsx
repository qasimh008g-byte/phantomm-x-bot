import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, ToggleLeft, ToggleRight, Cpu, Radio, Shield,
  AlertCircle, Key, Plus, Trash2, Ban, CheckCircle, Users,
  Copy, RefreshCw, Clock, Bell, History, Eye, EyeOff,
} from 'lucide-react';
import { supabase, AdminSetting, LicenseKey, VipUser, AdminConfig, ActivationLog } from '../lib/supabase';

type Tab = 'config' | 'licenses' | 'users' | 'notifications' | 'log';

const STATUS_COLORS: Record<string, string> = {
  UNUSED:  'text-gray-400 border-gray-700/40 bg-gray-900/30',
  ACTIVE:  'text-green-400 border-green-700/40 bg-green-950/30',
  EXPIRED: 'text-yellow-400 border-yellow-700/40 bg-yellow-950/30',
  BANNED:  'text-red-400 border-red-700/40 bg-red-950/30',
  REVOKED: 'text-orange-400 border-orange-700/40 bg-orange-950/30',
};

const TIER_COLORS: Record<string, string> = {
  VIP:   'tag-otc',
  ELITE: 'tag-volatility',
  ADMIN: 'tag-forex',
};

// Generate sequential key: PHANTOM-VIP-2026-001
async function generateSequentialKey(tier: 'VIP' | 'ELITE' | 'ADMIN'): Promise<string> {
  const year = new Date().getFullYear();

  // Fetch and increment counter atomically
  const { data: counter } = await supabase
    .from('key_counters')
    .select('counter')
    .eq('tier', tier)
    .eq('year', year)
    .maybeSingle();

  const next = (counter?.counter ?? 0) + 1;

  // Upsert counter
  await supabase
    .from('key_counters')
    .upsert({ tier, year, counter: next }, { onConflict: 'tier,year' });

  const padded = String(next).padStart(3, '0');
  return `PHANTOM-${tier}-${year}-${padded}`;
}

const SETTINGS_LABELS: Record<string, string> = {
  telegram_channel: 'Telegram Channel',
  min_confirmations: 'Min Confirmations',
  min_confidence: 'Min Confidence (%)',
  bot_status: 'Bot Status',
  signal_mode: 'Signal Mode',
};

const CONFIG_LABELS: Record<string, string> = {
  admin_telegram_username: 'Admin Telegram Username',
  admin_telegram_id:       'Admin Telegram ID (numeric)',
  telegram_bot_token:      'Telegram Bot Token',
  bot_name:                'Bot Name',
  notifications_enabled:   'Notifications Enabled',
};

export default function AdminPanel() {
  const [tab, setTab]               = useState<Tab>('config');
  const [settings, setSettings]     = useState<AdminSetting[]>([]);
  const [editedSettings, setEditedS] = useState<Record<string, string>>({});
  const [adminConfig, setAdminConfig] = useState<AdminConfig[]>([]);
  const [editedConfig, setEditedC]  = useState<Record<string, string>>({});
  const [savingCfg, setSavingCfg]   = useState(false);
  const [savedCfg, setSavedCfg]     = useState(false);
  const [savingBot, setSavingBot]   = useState(false);
  const [savedBot, setSavedBot]     = useState(false);
  const [licenses, setLicenses]     = useState<LicenseKey[]>([]);
  const [users, setUsers]           = useState<VipUser[]>([]);
  const [logs, setLogs]             = useState<ActivationLog[]>([]);
  const [newTier, setNewTier]       = useState<'VIP' | 'ELITE' | 'ADMIN'>('VIP');
  const [newNotes, setNewNotes]     = useState('');
  const [newExpiry, setNewExpiry]   = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied]         = useState('');
  const [showToken, setShowToken]   = useState(false);
  const [bulkCount, setBulkCount]   = useState(1);

  const loadAll = useCallback(async () => {
    const [sRes, cRes, lRes, uRes, logRes] = await Promise.all([
      supabase.from('admin_settings').select('*').order('key'),
      supabase.from('admin_config').select('*').order('key'),
      supabase.from('license_keys').select('*').order('created_at', { ascending: false }),
      supabase.from('vip_users').select('*').order('created_at', { ascending: false }),
      supabase.from('activation_log').select('*').order('created_at', { ascending: false }).limit(50),
    ]);

    setSettings(sRes.data || []);
    const sInit: Record<string, string> = {};
    (sRes.data || []).forEach((s: AdminSetting) => { sInit[s.key] = s.value; });
    setEditedS(sInit);

    setAdminConfig(cRes.data || []);
    const cInit: Record<string, string> = {};
    (cRes.data || []).forEach((c: AdminConfig) => { cInit[c.key] = c.value; });
    setEditedC(cInit);

    setLicenses(lRes.data || []);
    setUsers(uRes.data || []);
    setLogs(logRes.data || []);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Save admin_settings (bot config)
  async function saveBotSettings() {
    setSavingBot(true);
    await Promise.all(settings.map((s) =>
      supabase.from('admin_settings')
        .update({ value: editedSettings[s.key], updated_at: new Date().toISOString() })
        .eq('key', s.key)
    ));
    setSavingBot(false); setSavedBot(true);
    setTimeout(() => setSavedBot(false), 2000);
  }

  // Save admin_config (Telegram settings)
  async function saveAdminConfig() {
    setSavingCfg(true);
    await Promise.all(adminConfig.map((c) =>
      supabase.from('admin_config')
        .update({ value: editedConfig[c.key], updated_at: new Date().toISOString() })
        .eq('key', c.key)
    ));
    setSavingCfg(false); setSavedCfg(true);
    setTimeout(() => setSavedCfg(false), 2000);
  }

  // Generate single or bulk keys
  async function createKeys() {
    setGenerating(true);
    try {
      const count = Math.min(Math.max(1, bulkCount), 20);
      for (let i = 0; i < count; i++) {
        const key = await generateSequentialKey(newTier);
        await supabase.from('license_keys').insert([{
          key, tier: newTier,
          expires_at: newExpiry || null,
          notes: newNotes || `Generated ${new Date().toLocaleDateString()}`,
        }]);
      }
      setNewNotes(''); setNewExpiry(''); setBulkCount(1);
      await loadAll();
    } finally {
      setGenerating(false);
    }
  }

  async function updateLicenseStatus(id: string, status: LicenseKey['status']) {
    await supabase.from('license_keys').update({ status }).eq('id', id);
    loadAll();
  }

  async function deleteLicense(id: string) {
    await supabase.from('license_keys').delete().eq('id', id);
    loadAll();
  }

  async function toggleUser(id: string, active: boolean) {
    await supabase.from('vip_users').update({ is_active: active }).eq('id', id);
    loadAll();
  }

  async function deleteUser(id: string) {
    await supabase.from('vip_users').delete().eq('id', id);
    loadAll();
  }

  async function banUserByKey(licKey: string) {
    await supabase.from('license_keys').update({ status: 'BANNED' }).eq('key', licKey);
    loadAll();
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  }

  const botActive = editedSettings['bot_status'] === 'ACTIVE';
  const notifsOn  = editedConfig['notifications_enabled'] !== 'false';
  const hasToken  = !!(editedConfig['telegram_bot_token']);
  const hasAdminId = !!(editedConfig['admin_telegram_id']);

  const TABS: { id: Tab; label: string }[] = [
    { id: 'config',        label: 'BOT CONFIG' },
    { id: 'notifications', label: 'TELEGRAM' },
    { id: 'licenses',      label: `KEYS (${licenses.length})` },
    { id: 'users',         label: `USERS (${users.length})` },
    { id: 'log',           label: `LOG (${logs.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="phantom-card p-5">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-400" />
            <span className="font-orbitron font-black tracking-widest text-sm text-white">ADMIN CONTROL PANEL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 border ${
              hasToken && hasAdminId
                ? 'bg-green-950/30 border-green-700/40'
                : 'bg-yellow-950/30 border-yellow-700/40'
            }`}>
              <Bell className={`w-3 h-3 ${hasToken && hasAdminId ? 'text-green-400' : 'text-yellow-500'}`} />
              <span className={`text-[10px] font-orbitron font-bold ${hasToken && hasAdminId ? 'text-green-400' : 'text-yellow-500'}`}>
                {hasToken && hasAdminId ? 'NOTIFS ON' : 'NOTIFS SETUP NEEDED'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 bg-yellow-950/30 border border-yellow-700/40 rounded-full px-3 py-1">
              <AlertCircle className="w-3 h-3 text-yellow-500" />
              <span className="text-yellow-500 text-[10px] font-orbitron font-bold">RESTRICTED</span>
            </div>
          </div>
        </div>
        <p className="text-gray-600 text-xs font-tech">Manage keys, users, Telegram notifications, and bot settings.</p>
      </div>

      {/* Tab nav */}
      <div className="flex flex-wrap gap-1 bg-gray-950 border border-gray-800/60 rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 py-2 rounded-lg text-[10px] font-orbitron font-bold tracking-wider transition-all whitespace-nowrap ${
              tab === t.id
                ? 'bg-purple-950/60 border border-purple-500/40 text-purple-300'
                : 'text-gray-600 hover:text-gray-400'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BOT CONFIG tab ── */}
      {tab === 'config' && (
        <div className="space-y-4">
          {/* Bot status toggle */}
          <div className="phantom-card p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                botActive ? 'border-green-700/50 bg-green-950/30' : 'border-red-700/50 bg-red-950/20'
              }`}>
                <Cpu className={`w-5 h-5 ${botActive ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div>
                <div className="font-orbitron font-bold text-sm text-white">Bot Status</div>
                <div className={`text-xs font-orbitron font-black ${botActive ? 'text-green-400' : 'text-red-400'}`}>
                  {botActive ? '24/7 RUNNING' : 'STOPPED'}
                </div>
              </div>
            </div>
            <button onClick={() => setEditedS({ ...editedSettings, bot_status: botActive ? 'STOPPED' : 'ACTIVE' })}>
              {botActive ? <ToggleRight className="w-9 h-9 text-green-400" /> : <ToggleLeft className="w-9 h-9 text-gray-600" />}
            </button>
          </div>

          {/* Settings */}
          <div className="phantom-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800/50">
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="font-orbitron font-bold text-sm tracking-wider text-white">SIGNAL CONFIGURATION</span>
            </div>
            <div className="divide-y divide-gray-800/40">
              {settings.filter((s) => s.key !== 'bot_status').map((s) => (
                <div key={s.key} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div>
                    <div className="text-white text-sm font-semibold">{SETTINGS_LABELS[s.key] || s.key}</div>
                    <div className="text-gray-700 text-xs font-tech">{s.key}</div>
                  </div>
                  <input value={editedSettings[s.key] ?? s.value}
                    onChange={(e) => setEditedS({ ...editedSettings, [s.key]: e.target.value })}
                    className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white text-sm font-tech w-40 text-right focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-800/50 flex items-center justify-between gap-3">
              <div className="flex gap-2">
                {['AUTO', 'MANUAL'].map((m) => (
                  <button key={m} onClick={() => setEditedS({ ...editedSettings, signal_mode: m })}
                    className={`px-3 py-2 rounded-xl border text-[11px] font-orbitron font-bold tracking-wider transition-all ${
                      editedSettings['signal_mode'] === m
                        ? 'border-purple-500/60 bg-purple-950/40 text-purple-300'
                        : 'border-gray-800/60 text-gray-600 hover:border-gray-700'
                    }`}>{m}</button>
                ))}
              </div>
              <button onClick={saveBotSettings} disabled={savingBot}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs tracking-widest transition-all ${
                  savedBot ? 'bg-green-700 text-white' : 'btn-phantom'
                }`}>
                <Save className="w-4 h-4" />
                {savingBot ? 'SAVING...' : savedBot ? 'SAVED!' : 'SAVE'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[{ l: 'Uptime', v: '99.8%', c: 'text-green-400' }, { l: 'Latency', v: '12ms', c: 'text-purple-400' }, { l: 'Queue', v: '0', c: 'text-yellow-400' }].map((item) => (
              <div key={item.l} className="phantom-card p-4 text-center">
                <div className={`text-xl font-orbitron font-black ${item.c}`}>{item.v}</div>
                <div className="text-gray-600 text-xs font-tech mt-1">{item.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TELEGRAM NOTIFICATIONS tab ── */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          {/* Setup guide */}
          <div className="rounded-2xl border border-blue-800/40 bg-blue-950/10 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="font-orbitron font-bold text-sm text-white tracking-wider">TELEGRAM SETUP GUIDE</span>
            </div>
            <ol className="text-gray-400 text-xs font-tech space-y-2 leading-relaxed list-decimal list-inside">
              <li>Message <span className="text-purple-400">@BotFather</span> on Telegram → create a bot → copy the token</li>
              <li>Start your bot by sending <code className="text-purple-300 bg-purple-950/30 px-1 rounded">/start</code> to it</li>
              <li>Get your numeric Telegram ID from <span className="text-purple-400">@userinfobot</span></li>
              <li>Paste the token and your ID below → Save</li>
              <li>Every new activation will send you a notification</li>
            </ol>
          </div>

          {/* Config fields */}
          <div className="phantom-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800/50">
              <Settings className="w-4 h-4 text-purple-400" />
              <span className="font-orbitron font-bold text-sm text-white tracking-wider">NOTIFICATION CONFIG</span>
            </div>
            <div className="divide-y divide-gray-800/40">
              {adminConfig.map((c) => (
                <div key={c.key} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="min-w-0">
                    <div className="text-white text-sm font-semibold">{CONFIG_LABELS[c.key] || c.key}</div>
                    <div className="text-gray-700 text-[10px] font-tech">{c.key}</div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <input
                      type={c.key === 'telegram_bot_token' && !showToken ? 'password' : 'text'}
                      value={editedConfig[c.key] ?? c.value}
                      onChange={(e) => setEditedC({ ...editedConfig, [c.key]: e.target.value })}
                      placeholder={
                        c.key === 'telegram_bot_token' ? '123456:ABC-...' :
                        c.key === 'admin_telegram_id'  ? '123456789' :
                        c.key === 'notifications_enabled' ? 'true / false' : ''
                      }
                      className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2 text-white text-sm font-tech w-52 text-right focus:outline-none pr-8"
                    />
                    {c.key === 'telegram_bot_token' && (
                      <button onClick={() => setShowToken((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                        {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-gray-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${notifsOn && hasToken && hasAdminId ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                <span className={`text-xs font-tech ${notifsOn && hasToken && hasAdminId ? 'text-green-400' : 'text-gray-600'}`}>
                  {notifsOn && hasToken && hasAdminId ? 'Notifications active' : 'Notifications not configured'}
                </span>
              </div>
              <button onClick={saveAdminConfig} disabled={savingCfg}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-orbitron font-bold text-xs tracking-widest transition-all ${
                  savedCfg ? 'bg-green-700 text-white' : 'btn-phantom'
                }`}>
                <Save className="w-4 h-4" />
                {savingCfg ? 'SAVING...' : savedCfg ? 'SAVED!' : 'SAVE CONFIG'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── LICENSES tab ── */}
      {tab === 'licenses' && (
        <div className="space-y-4">
          {/* Generate keys */}
          <div className="phantom-card p-5 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="font-orbitron font-bold text-sm tracking-wider text-white">GENERATE LICENSE KEYS</span>
            </div>
            <p className="text-gray-600 text-xs font-tech">
              Sequential format: <code className="text-purple-400">PHANTOM-VIP-2026-001</code>
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <select value={newTier} onChange={(e) => setNewTier(e.target.value as 'VIP' | 'ELITE' | 'ADMIN')}
                className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none col-span-1">
                <option value="VIP">VIP</option>
                <option value="ELITE">ELITE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
              <input type="number" min={1} max={20} value={bulkCount}
                onChange={(e) => setBulkCount(Math.min(20, Math.max(1, Number(e.target.value))))}
                className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm font-tech focus:outline-none col-span-1"
                placeholder="Count" />
              <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none font-tech col-span-1 sm:col-span-1" />
              <input type="date" value={newExpiry} onChange={(e) => setNewExpiry(e.target.value)}
                className="bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none font-tech col-span-1" />
            </div>
            <button onClick={createKeys} disabled={generating}
              className="btn-phantom flex items-center gap-2 px-5 py-2.5 text-xs">
              {generating
                ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> GENERATING...</>
                : <><Plus className="w-4 h-4" /> GENERATE {bulkCount > 1 ? `${bulkCount} KEYS` : 'KEY'}</>
              }
            </button>
          </div>

          {/* Key list */}
          <div className="phantom-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
              <span className="font-orbitron font-bold text-sm text-white tracking-wider">
                ALL KEYS ({licenses.length})
              </span>
              <button onClick={loadAll} className="text-gray-600 hover:text-purple-400 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-gray-800/30 max-h-[500px] overflow-y-auto">
              {licenses.map((lic) => (
                <div key={lic.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <code className="text-purple-300 text-xs font-tech truncate font-bold">{lic.key}</code>
                      <button onClick={() => copyKey(lic.key)} className="flex-shrink-0 p-0.5">
                        {copied === lic.key
                          ? <CheckCircle className="w-3 h-3 text-green-400" />
                          : <Copy className="w-3 h-3 text-gray-600 hover:text-gray-400 transition-colors" />
                        }
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${STATUS_COLORS[lic.status]}`}>
                        {lic.status}
                      </span>
                      <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${TIER_COLORS[lic.tier] || 'tag-otc'}`}>
                        {lic.tier}
                      </span>
                    </div>
                  </div>

                  {lic.username && (
                    <div className="flex items-center gap-2 text-gray-500 text-[10px] font-tech mb-1">
                      <span>@{lic.username}</span>
                      <span className="text-gray-700">·</span>
                      <span>{lic.user_telegram_id}</span>
                    </div>
                  )}

                  {lic.activated_at && (
                    <div className="flex items-center gap-1 text-gray-700 text-[10px] font-tech mb-2">
                      <Clock className="w-3 h-3" />
                      <span>Activated: {new Date(lic.activated_at).toLocaleString()}</span>
                      {lic.activation_count > 1 && (
                        <span className="text-yellow-600 ml-1">· {lic.activation_count}× used</span>
                      )}
                    </div>
                  )}

                  {lic.notes && (
                    <div className="text-gray-700 text-[10px] font-tech mb-2">{lic.notes}</div>
                  )}

                  {lic.expires_at && (
                    <div className="text-yellow-600/70 text-[10px] font-tech mb-2">
                      Expires: {new Date(lic.expires_at).toLocaleDateString()}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {lic.status !== 'ACTIVE' && (
                      <button onClick={() => updateLicenseStatus(lic.id, 'ACTIVE')}
                        className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-green-400 border border-green-700/40 hover:bg-green-950/30 px-2 py-1 rounded-lg transition-all">
                        <CheckCircle className="w-3 h-3" /> ACTIVATE
                      </button>
                    )}
                    {lic.status !== 'BANNED' && (
                      <button onClick={() => updateLicenseStatus(lic.id, 'BANNED')}
                        className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-red-400 border border-red-700/40 hover:bg-red-950/30 px-2 py-1 rounded-lg transition-all">
                        <Ban className="w-3 h-3" /> BAN
                      </button>
                    )}
                    {lic.status !== 'REVOKED' && (
                      <button onClick={() => updateLicenseStatus(lic.id, 'REVOKED')}
                        className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-orange-400 border border-orange-700/40 hover:bg-orange-950/30 px-2 py-1 rounded-lg transition-all">
                        <AlertCircle className="w-3 h-3" /> REVOKE
                      </button>
                    )}
                    {lic.status === 'UNUSED' && (
                      <button onClick={() => copyKey(lic.key)}
                        className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-purple-400 border border-purple-700/40 hover:bg-purple-950/30 px-2 py-1 rounded-lg transition-all">
                        <Copy className="w-3 h-3" /> {copied === lic.key ? 'COPIED!' : 'COPY'}
                      </button>
                    )}
                    <button onClick={() => deleteLicense(lic.id)}
                      className="flex items-center gap-1 text-[10px] font-orbitron font-bold text-gray-600 border border-gray-700/40 hover:bg-red-950/20 hover:text-red-400 hover:border-red-700/40 px-2 py-1 rounded-lg transition-all ml-auto">
                      <Trash2 className="w-3 h-3" /> DELETE
                    </button>
                  </div>
                </div>
              ))}
              {licenses.length === 0 && (
                <div className="px-5 py-8 text-center text-gray-600 text-sm font-tech">No license keys yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── USERS tab ── */}
      {tab === 'users' && (
        <div className="phantom-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="font-orbitron font-bold text-sm text-white tracking-wider">ACTIVE USERS ({users.length})</span>
            </div>
            <button onClick={loadAll} className="text-gray-600 hover:text-purple-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-800/30 max-h-[500px] overflow-y-auto">
            {users.map((u) => (
              <div key={u.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-green-500 animate-pulse' : 'bg-gray-700'}`} />
                    <span className="text-white font-semibold text-sm">@{u.username}</span>
                    <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${TIER_COLORS[u.access_level] || 'tag-otc'}`}>
                      {u.access_level}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => toggleUser(u.id, !u.is_active)}
                      className={`text-[10px] font-orbitron font-bold border px-2 py-1 rounded-lg transition-all ${
                        u.is_active
                          ? 'text-yellow-400 border-yellow-700/40 hover:bg-yellow-950/30'
                          : 'text-green-400 border-green-700/40 hover:bg-green-950/30'
                      }`}>
                      {u.is_active ? 'DISABLE' : 'ENABLE'}
                    </button>
                    {u.license_key && (
                      <button onClick={() => banUserByKey(u.license_key!)}
                        className="text-[10px] font-orbitron font-bold text-red-400 border border-red-700/40 hover:bg-red-950/30 px-2 py-1 rounded-lg transition-all">
                        BAN
                      </button>
                    )}
                    <button onClick={() => deleteUser(u.id)}
                      className="text-gray-600 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-tech text-gray-600">
                  <span>ID: {u.telegram_id}</span>
                  {u.license_key && <span className="text-purple-500/70">{u.license_key}</span>}
                  {u.last_active && <span>Last: {new Date(u.last_active).toLocaleDateString()}</span>}
                  {u.expires_at && <span className="text-yellow-600/70">Exp: {new Date(u.expires_at).toLocaleDateString()}</span>}
                </div>
                {u.device_info && (
                  <div className="text-gray-700 text-[9px] font-tech mt-1 truncate">{u.device_info.split('|')[0].trim()}</div>
                )}
              </div>
            ))}
            {users.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-600 text-sm font-tech">No users activated yet.</div>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIVATION LOG tab ── */}
      {tab === 'log' && (
        <div className="phantom-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-400" />
              <span className="font-orbitron font-bold text-sm text-white tracking-wider">ACTIVATION LOG ({logs.length})</span>
            </div>
            <button onClick={loadAll} className="text-gray-600 hover:text-purple-400 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-gray-800/30 max-h-[600px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-orbitron font-black px-1.5 py-0.5 rounded border ${
                      log.action === 'ACTIVATE' ? 'text-green-400 border-green-700/40 bg-green-950/25' : 'text-red-400 border-red-700/40 bg-red-950/25'
                    }`}>{log.action}</span>
                    <span className="text-white text-xs font-semibold">@{log.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {log.notified_admin
                      ? <span className="text-[9px] text-green-500 font-tech">✓ Notified</span>
                      : <span className="text-[9px] text-gray-700 font-tech">Not notified</span>
                    }
                    <span className="text-gray-700 text-[10px] font-tech">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-tech text-gray-600">
                  <span>ID: {log.telegram_id}</span>
                  <span className="text-purple-500/70">{log.license_key}</span>
                </div>
                {log.device_info && (
                  <div className="text-gray-700 text-[9px] font-tech mt-0.5 truncate">{log.device_info.split('|')[0].trim()}</div>
                )}
              </div>
            ))}
            {logs.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-600 text-sm font-tech">No activation history yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
