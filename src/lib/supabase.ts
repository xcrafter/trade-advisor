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
