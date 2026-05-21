import { useState, useEffect } from 'react';
import { Crown, Shield, Star, Zap, Lock, Users, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { supabase, VipUser } from '../lib/supabase';

const TIERS = [
  {
    id: 'VIP',    icon: Star,   label: 'VIP',   color: 'text-yellow-400',
    border: 'border-yellow-700/40', bg: 'bg-yellow-950/15', glow: '',
    features: ['All signal alerts','Real-time notifications','Signal history','Basic analytics'],
  },
  {
    id: 'ELITE',  icon: Crown,  label: 'ELITE', color: 'text-purple-300',
    border: 'border-purple-500/50', bg: 'bg-purple-950/25', glow: 'shadow-[0_0_25px_rgba(168,85,247,0.2)]',
    features: ['Everything in VIP','AI breakdown reports','Priority alerts','Win/loss tracking','Custom filters'],
    badge: 'POPULAR',
  },
  {
    id: 'ADMIN',  icon: Shield, label: 'ADMIN', color: 'text-cyan-400',
    border: 'border-cyan-700/40',   bg: 'bg-cyan-950/15',   glow: '',
    features: ['Everything in ELITE','Bot configuration','User management','Full analytics','Telegram admin'],
  },
];

export default function VipSection() {
  const [users, setUsers]   = useState<VipUser[]>([]);
  const [loading, setLoad]  = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]     = useState({ username: '', telegram_id: '', access_level: 'VIP' as VipUser['access_level'] });

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase.from('vip_users').select('*').order('created_at', { ascending: false });
    setUsers(data || []);
    setLoad(false);
  }

  async function add() {
    if (!form.username || !form.telegram_id) return;
    await supabase.from('vip_users').insert([form]);
    setForm({ username: '', telegram_id: '', access_level: 'VIP' });
    setShowAdd(false);
    load();
  }

  async function remove(id: string) {
    await supabase.from('vip_users').delete().eq('id', id);
    load();
  }

  return (
    <div className="space-y-5">
      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const Ic = tier.icon;
          return (
            <div key={tier.id} className={`relative rounded-2xl border ${tier.border} ${tier.bg} ${tier.glow} p-5`}>
              {tier.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[9px] font-orbitron font-black px-3 py-1 rounded-full tracking-widest">
                  {tier.badge}
                </div>
              )}
              <div className="flex items-center gap-2 mb-3">
                <Ic className={`w-5 h-5 ${tier.color}`} />
                <span className={`font-orbitron font-black text-base tracking-widest ${tier.color}`}>{tier.label}</span>
              </div>
              <ul className="space-y-2 mb-4">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-400 text-xs">
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded-xl border ${tier.border} ${tier.color} text-[11px] font-orbitron font-bold tracking-widest hover:bg-white/5 transition-all`}>
                <Lock className="w-3 h-3 inline mr-1.5" />
                REQUEST ACCESS
              </button>
            </div>
          );
        })}
      </div>

      {/* Members */}
      <div className="phantom-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <span className="font-orbitron font-bold text-sm tracking-wider text-white">VIP MEMBERS</span>
            <span className="text-purple-400 text-xs bg-purple-950/50 border border-purple-800/40 rounded px-2 py-0.5 ml-1 font-orbitron font-black">
              {users.length}
            </span>
          </div>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1.5 text-[10px] font-orbitron font-bold text-purple-400 border border-purple-700/50 hover:bg-purple-950/40 px-3 py-1.5 rounded-lg transition-all"
          >
            <Plus className="w-3.5 h-3.5" />ADD
          </button>
        </div>

        {showAdd && (
          <div className="px-5 py-4 border-b border-gray-800/40 bg-purple-950/10">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              {(['username','telegram_id'] as const).map((f) => (
                <input
                  key={f}
                  value={form[f]}
                  onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                  placeholder={f === 'username' ? 'Username' : 'Telegram ID'}
                  className="bg-gray-950 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none transition-colors font-tech"
                />
              ))}
              <select
                value={form.access_level}
                onChange={(e) => setForm({ ...form, access_level: e.target.value as VipUser['access_level'] })}
                className="bg-gray-950 border border-gray-700 focus:border-purple-500 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none transition-colors"
              >
                <option value="VIP">VIP</option>
                <option value="ELITE">ELITE</option>
                <option value="ADMIN">ADMIN</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={add} className="btn-phantom px-5 py-2 text-xs">ADD USER</button>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white text-xs px-4 py-2 transition-all">CANCEL</button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-800/30">
          {loading && <div className="px-5 py-8 text-center text-gray-600 text-sm font-tech animate-pulse">Loading members...</div>}
          {!loading && users.length === 0 && <div className="px-5 py-8 text-center text-gray-600 text-sm font-tech">No VIP members yet.</div>}
          {users.map((u) => {
            const tier  = TIERS.find((t) => t.id === u.access_level) || TIERS[0];
            const TIc   = tier.icon;
            return (
              <div key={u.id} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl border ${tier.border} flex items-center justify-center ${tier.bg}`}>
                    <TIc className={`w-4 h-4 ${tier.color}`} />
                  </div>
                  <div>
                    <div className="text-white font-semibold text-sm">{u.username}</div>
                    <div className="text-gray-600 text-xs font-tech">{u.telegram_id}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[9px] font-orbitron font-black px-2 py-0.5 rounded border ${tier.border} ${tier.color} ${tier.bg}`}>
                    {u.access_level}
                  </span>
                  <div className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-gray-700'}`} />
                  <button onClick={() => remove(u.id)} className="text-gray-700 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telegram block */}
      <div className="phantom-card p-5">
        <div className="flex items-center gap-3 mb-3">
          <Zap className="w-5 h-5 text-purple-400" />
          <span className="font-orbitron font-bold tracking-wider text-white text-sm">TELEGRAM INTEGRATION</span>
        </div>
        <p className="text-gray-500 text-sm font-tech mb-4">
          Join the PHANTOM X BOT Telegram channel to receive real-time OTC signals directly to your device.
        </p>
        <div className="flex items-center gap-3 bg-black/60 border border-gray-800/50 rounded-xl px-4 py-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-green-400 text-sm font-tech font-bold">@PhantomXBot</span>
          <span className="ml-auto text-gray-600 text-xs font-orbitron">ACTIVE</span>
        </div>
      </div>
    </div>
  );
}
