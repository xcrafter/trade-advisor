import { Stock } from "./stock";

export interface SwingTradingIndicators {
  symbol: string;
  timestamp: string;
  price: number;

  // ===== TREND ANALYSIS =====
  sma_50: number;
  sma_200: number;
  ema_21: number;
  ema_50: number;
  trend_direction: "bullish" | "bearish" | "sideways" | "transitioning";
  trend_strength: "strong" | "moderate" | "weak";
  golden_cross: boolean;
  death_cross: boolean;

  // ===== MOMENTUM INDICATORS =====
  rsi_14: number;
  rsi_21: number;
  rsi_signal: "oversold" | "bearish" | "neutral" | "bullish" | "overbought";

  macd_line: number;
  macd_signal: number;
  macd_histogram: number;
  macd_bullish_crossover: boolean;

  stochastic: number;
  stochastic_signal:
    | "oversold"
    | "bearish"
    | "neutral"
    | "bullish"
    | "overbought";

  // ===== VOLUME ANALYSIS =====
  volume_20day_avg: number;
  volume_current: number;
  volume_vs_20day_avg: number;
  volume_trend_20day:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  volume_breakout: boolean;
  accumulation_distribution: number;
  volume_quality: "excellent" | "good" | "average" | "poor";

  // ===== VOLATILITY & RISK =====
  atr_21: number;
  suggested_stop_loss: number; // ATR-based stop loss
  suggested_take_profit: number; // ATR-based take profit
  bollinger_upper: number;
  bollinger_lower: number;
  bollinger_position:
    | "above_upper"
    | "upper_half"
    | "middle"
    | "lower_half"
    | "below_lower";
  volatility_percentile: number;
  volatility_rating: "very_high" | "high" | "moderate" | "low" | "very_low";

  // ===== SUPPORT & RESISTANCE =====
  support_levels: number[];
  resistance_levels: number[];
  nearest_support: number;
  nearest_resistance: number;
  support_distance_percent: number;
  resistance_distance_percent: number;
  weekly_pivot: number;
  fibonacci_levels: number[];

  // ===== MARKET CONTEXT =====
  market_regime:
    | "bull_market"
    | "bear_market"
    | "sideways"
    | "volatile"
    | "transitioning";
  sector_performance: number;
  relative_strength: number;
  sector_correlation: number;

  // ===== SWING TRADING SPECIFICS =====
  swing_score: number;
  swing_setup_quality: "excellent" | "good" | "fair" | "poor";

  // ===== SWING TRADING PATTERN DETECTION =====
  breakout_pattern: "cup_and_handle" | "flag" | "wedge" | "triangle" | "none";
  breakout_confidence: "high" | "medium" | "low";
  atr_validation: boolean;
  atr_percent: number;
  price_range_valid: boolean;
  price_range: string;
  pullback_to_support: boolean;
  support_distance: number;
  volume_breakout_detected: boolean;
  volume_multiple: number;
  rsi_bounce_zone: boolean;
  rsi_zone: string;
  macd_bullish_crossover_detected: boolean;
  macd_signal_status: string;
  rising_volume: boolean;
  volume_trend: string;
}

export interface AISignal {
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral";
  confidence_level: "very_high" | "high" | "moderate" | "low";
  opinion: string;
  direction: "LONG" | "SHORT" | "NEUTRAL";
  buyPrice: number;
  targetPrice1: number;
  targetPrice2: number;
  stopLoss: number;
  holdingPeriod:
    | "1-2_weeks"
    | "2-4_weeks"
    | "1-2_months"
    | "2-3_months"
    | "long_term";
  positionSizePercent: number;
  riskRewardRatio: string;
  tradingPlan: string;
  swingScore: number;
  keyCatalysts: string;
  riskFactors: string;
  swingSetupQuality: "excellent" | "good" | "fair" | "poor";
  liquidityCheck: "high" | "moderate" | "low";
  volatilityCheck: "optimal" | "adequate" | "insufficient";
  marketTrendAlignment: "strong" | "moderate" | "weak" | "against_trend";
}

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

export interface SwingTradingDashboard extends Signal {
  sector?: string;
  market_cap_category?: string;
}

// Type alias for high-quality setups - used as a marker type to identify filtered setups
export type HighQualitySwingSetup = SwingTradingDashboard;

export type SignalType = Signal["signal"];
export type DirectionType = Signal["direction"];
export type TrendDirection = Signal["trend_direction"];
export type VolumeQuality = Signal["volume_quality"];
export type HoldingPeriod = Signal["holding_period"];
export type ConfidenceLevel = Signal["confidence_level"];
