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
  created_at: string;
  session?: Session;
}

export interface Signal {
  id: string;
  stock_id: string;
  symbol: string;
  timestamp: string;

  // Price data
  price: number;

  // Technical Indicators
  vwap?: number;
  rsi_14?: number;
  sma_20?: number;
  ema_9?: number;
  atr_14?: number;

  // Volume and Momentum
  volume?: number;
  volume_spike?: boolean;

  // Trend and Alignment
  trend?: string;
  trend_alignment?: string;

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

  created_at: string;
  stock?: Stock;

  // Cache metadata (added by API)
  fromCache?: boolean;
  cacheAge?: number;
}
