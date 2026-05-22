import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const EDGE_URL      = `${supabaseUrl}/functions/v1/phantom-signal-engine`;
export const NOTIFY_URL    = `${supabaseUrl}/functions/v1/phantom-notify`;
export const EDGE_HEADERS  = {
  Authorization: `Bearer ${supabaseAnonKey}`,
  'Content-Type': 'application/json',
};

export type Signal = {
  id: string;
  asset: string;
  direction: 'BUY' | 'SELL';
  entry_time: string;
  trend: string;
  confidence: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  indicators: string[];
  confirmations: number;
  status: 'ACTIVE' | 'EXPIRED' | 'COMPLETED';
  result: 'WIN' | 'LOSS' | 'PENDING' | null;
  next_candle?: string;
  pair_category?: string;
  candle_open_time?: string;
  signal_sent_at?: string;
  timeframe?: number;
  created_at: string;
};

export type SignalStats = {
  id: string;
  total_signals: number;
  wins: number;
  losses: number;
  win_rate: number;
  streak: number;
  updated_at: string;
};

export type VipUser = {
  id: string;
  username: string;
  telegram_id: string;
  access_level: 'VIP' | 'ELITE' | 'ADMIN';
  is_active: boolean;
  expires_at: string | null;
  device_info?: string;
  last_active?: string;
  license_key?: string;
  created_at: string;
};

export type AdminSetting = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
};

export type PairRanking = {
  id: string;
  pair: string;
  category: string;
  confidence: number;
  trend: string;
  signal: 'BUY' | 'SELL' | 'WAIT';
  next_candle: string;
  rsi: number;
  macd_signal: string;
  ema_signal: string;
  bb_signal: string;
  volume_signal: string;
  confirmations: number;
  last_scanned_at: string;
};

export type BotHeartbeat = {
  id: string;
  pinged_at: string;
  status: 'ONLINE' | 'OFFLINE' | 'SCANNING';
  signals_generated: number;
  pairs_scanned: number;
  uptime_seconds: number;
};

export type LicenseKey = {
  id: string;
  key: string;
  user_telegram_id: string | null;
  username: string | null;
  device_info: string | null;
  status: 'UNUSED' | 'ACTIVE' | 'EXPIRED' | 'BANNED' | 'REVOKED';
  tier: 'VIP' | 'ELITE' | 'ADMIN';
  max_activations: number;
  activation_count: number;
  expires_at: string | null;
  activated_at: string | null;
  created_at: string;
  notes: string;
};

export type AdminConfig = {
  id: string;
  key: string;
  value: string;
  updated_at: string;
};

export type ActivationLog = {
  id: string;
  license_key: string;
  telegram_id: string;
  username: string;
  device_info: string | null;
  action: 'ACTIVATE' | 'REVOKE' | 'BAN' | 'EXPIRE';
  notified_admin: boolean;
  created_at: string;
};

export type UserSession = {
  licenseKey: string;
  telegramId: string;
  username: string;
  tier: 'VIP' | 'ELITE' | 'ADMIN';
  activatedAt: string;
};

