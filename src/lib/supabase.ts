import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types based on the requirements
export interface Session {
  id: string;
  session_date: string;
  title?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Stock {
  id: string;
  session_id: string;
  symbol: string;
  instrument_key?: string;
  exchange?: string;
  created_at: string;
  session?: Session;
  latestSignal?: Signal;
}

export interface Signal {
  id: string;
  stock_id: string;
  symbol: string;
  timestamp: string;

  // Price data
  price: number; // Current price from analysis

  // Technical Indicators (both old and new column names for compatibility)
  vwap?: number;
  rsi?: number; // Old column name (= rsi_14)
  rsi_14?: number; // New column name
  sma?: number; // Old column name (= sma_20)
  sma_20?: number; // New column name
  ema_9?: number;
  atr_14?: number;

  // Volume and Momentum
  volume?: number; // Trading volume
  volume_spike?: boolean;

  // 5-Day Volume Analysis
  volume_5day_avg?: number; // 5-day average volume
  volume_vs_5day_avg?: number; // Current volume as percentage of 5-day average
  volume_trend_5day?: string; // Volume trend over 5 days (increasing/decreasing/stable)
  volume_5day_high?: number; // Highest volume in last 5 days
  volume_5day_low?: number; // Lowest volume in last 5 days

  // Intraday Volume Statistics
  volume_avg_intraday?: number; // Average volume per minute during intraday session
  volume_max_intraday?: number; // Maximum volume in any single minute during intraday session
  volume_median_intraday?: number; // Median volume per minute during intraday session
  volume_total_intraday?: number; // Total volume across all intraday minutes
  volume_candle_count?: number; // Number of 1-minute candles used for volume calculations

  // Trend and Alignment
  trend?: string; // Old column name (= trend_alignment)
  trend_alignment?: string; // New column name

  // Breakout Signals
  breakout_day_high?: boolean;
  breakout_prev_day_range?: boolean;
  opening_range_breakout?: boolean;

  // Setup Quality
  clean_setup?: boolean;
  intraday_score?: number;

  // LLM Analysis
  signal: "strong" | "caution" | "neutral" | "risk";
  llm_opinion?: string;

  // Trading Plan
  direction?: "LONG" | "SHORT";
  buy_price?: number;
  target_price?: number;
  stop_loss?: number;
  trading_plan?: string;

  // Volume Range Recommendations
  min_volume?: number;
  max_volume?: number;
  recommended_volume?: number;
  position_size_percent?: number;
  volume_range_text?: string;

  created_at: string;
  stock?: Stock;

  // Cache metadata (added by API)
  fromCache?: boolean;
  cacheAge?: number;
}
