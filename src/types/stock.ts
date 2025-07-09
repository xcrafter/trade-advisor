export interface Stock {
  id: string;
  session_id?: string | null;
  symbol: string;
  exchange: string;
  instrument_key: string;
  sector?: string;
  industry?: string;
  market_cap_category?: "large_cap" | "mid_cap" | "small_cap";
  created_at: string;
}

// ===== COMPREHENSIVE SWING TRADING SIGNAL INTERFACE =====
export interface Signal {
  id: string;
  stock_id: string;
  symbol: string;
  timestamp: string;

  // ===== BASIC PRICE DATA =====
  price: number;

  // ===== TREND ANALYSIS (SWING TIMEFRAMES) =====
  sma_50?: number;
  sma_200?: number;
  ema_21?: number;
  ema_50?: number;
  trend_direction?: "bullish" | "bearish" | "sideways" | "transitioning";
  trend_strength?: "strong" | "moderate" | "weak";
  golden_cross?: boolean; // SMA50 > SMA200
  death_cross?: boolean; // SMA50 < SMA200

  // ===== MOMENTUM INDICATORS =====
  rsi_14?: number;
  rsi_21?: number;
  rsi_signal?: "oversold" | "bearish" | "neutral" | "bullish" | "overbought";

  macd_line?: number;
  macd_signal?: number;
  macd_histogram?: number;
  macd_bullish_crossover?: boolean;

  stochastic?: number;
  stochastic_signal?:
    | "oversold"
    | "bearish"
    | "neutral"
    | "bullish"
    | "overbought";

  // ===== VOLUME ANALYSIS (20-DAY SWING FOCUS) =====
  volume_20day_avg?: number;
  volume_current?: number;
  volume_vs_20day_avg?: number; // Percentage vs 20-day average
  volume_trend_20day?:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  volume_breakout?: boolean;
  accumulation_distribution?: number;
  volume_quality?: "excellent" | "good" | "average" | "poor";

  // ===== VOLATILITY & RISK MANAGEMENT =====
  atr_21?: number; // 21-day Average True Range
  bollinger_upper?: number;
  bollinger_lower?: number;
  bollinger_position?:
    | "above_upper"
    | "upper_half"
    | "middle"
    | "lower_half"
    | "below_lower";
  volatility_percentile?: number;
  volatility_rating?: "very_high" | "high" | "moderate" | "low" | "very_low";

  // ===== SUPPORT & RESISTANCE LEVELS =====
  support_levels?: number[]; // JSON array
  resistance_levels?: number[]; // JSON array
  nearest_support?: number;
  nearest_resistance?: number;
  support_distance_percent?: number;
  resistance_distance_percent?: number;
  weekly_pivot?: number;
  fibonacci_levels?: number[]; // JSON array

  // ===== SWING TRADING SPECIFICS =====
  swing_score?: number; // 0-10 scale
  swing_setup_quality?: "excellent" | "good" | "fair" | "poor";
  holding_period?:
    | "1-2_weeks"
    | "2-4_weeks"
    | "1-2_months"
    | "2-3_months"
    | "long_term";
  position_size_percent?: number; // 0.1-10% of portfolio

  // ===== ENTRY & EXIT STRATEGY =====
  entry_strategy?: string;
  buy_price?: number;
  target_price_1?: number; // Conservative target
  target_price_2?: number; // Aggressive target
  stop_loss?: number;
  risk_reward_ratio?: string; // e.g., "1:2.5"
  risk_amount_percent?: number; // 0.5-5% risk per trade

  // ===== MARKET CONTEXT =====
  market_regime?:
    | "bull_market"
    | "bear_market"
    | "sideways"
    | "volatile"
    | "transitioning";
  sector_performance?: number; // Sector performance vs benchmark
  relative_strength?: number; // Stock vs sector/index
  sector_correlation?: number; // -1 to 1
  market_cap_bias?:
    | "large_cap_outperforming"
    | "mid_cap_outperforming"
    | "small_cap_outperforming"
    | "mixed";

  // ===== AI ANALYSIS =====
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral";
  confidence_level?: "very_high" | "high" | "moderate" | "low";
  llm_opinion?: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  trading_plan?: string;
  key_catalysts?: string; // What could drive the swing trade
  risk_factors?: string; // What could go wrong

  // ===== METADATA =====
  created_at: string;
  updated_at?: string;

  // ===== RELATIONSHIPS =====
  stock?: Stock;
}

// ===== DASHBOARD INTERFACES =====
export interface SwingTradingDashboard extends Signal {
  sector?: string;
  market_cap_category?: string;
}

// ===== UTILITY TYPES =====
export type SignalType = Signal["signal"];
export type DirectionType = Signal["direction"];
export type TrendDirection = Signal["trend_direction"];
export type VolumeQuality = Signal["volume_quality"];
export type HoldingPeriod = Signal["holding_period"];
export type ConfidenceLevel = Signal["confidence_level"];

// Type for high-quality swing setups (filtered dashboard items)
export type HighQualitySwingSetup = SwingTradingDashboard;
