import { StockModel } from "@/models/StockModel";
import {
  InstrumentModel,
  type InstrumentSearchResult,
} from "@/models/InstrumentModel";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";
import {
  calculatePriceRanges,
  calculateFibonacciLevels,
  findSupportResistanceLevels,
} from "@/lib/indicators";

export interface StockAnalysis {
  // Basic Info
  symbol: string;
  price: number;
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral";
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence_level: "very_high" | "high" | "moderate" | "low";

  // Historical Data
  candles: {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }[];

  // Price Ranges
  price_ranges: {
    day_3: { high: number; low: number };
    day_10: { high: number; low: number };
    day_30: { high: number; low: number };
  };

  // Trend Analysis
  trend_direction: "bullish" | "bearish" | "sideways" | "transitioning";
  trend_strength: "strong" | "moderate" | "weak";
  swing_score: number;
  swing_setup_quality: "excellent" | "good" | "fair" | "poor";
  volatility_percentile: number;
  volatility_rating: "very_high" | "high" | "moderate" | "low" | "very_low";

  // Moving Averages
  sma_50: number;
  sma_200: number;
  ema_21: number;
  ema_50: number;
  golden_cross: boolean;
  death_cross: boolean;

  // Momentum Indicators
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

  // Volume Analysis
  volume_20day_avg: number;
  volume_current: number;
  volume_vs_20day_avg: number;
  volume_trend_20day:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  volume_breakout: boolean;
  volume_quality: "excellent" | "good" | "average" | "poor";
  accumulation_distribution: number;

  // Support & Resistance
  support_levels: number[];
  resistance_levels: number[];
  nearest_support: number;
  nearest_resistance: number;
  support_distance_percent: number;
  resistance_distance_percent: number;
  weekly_pivot: number;
  fibonacci_levels: number[];

  // Risk Management
  atr_21: number;
  bollinger_upper: number;
  bollinger_lower: number;
  bollinger_position:
    | "above_upper"
    | "upper_half"
    | "middle"
    | "lower_half"
    | "below_lower";

  // Market Context
  market_regime:
    | "bull_market"
    | "bear_market"
    | "sideways"
    | "volatile"
    | "transitioning";
  sector_performance: number;
  relative_strength: number;
  sector_correlation: number;

  // AI Analysis & Trading Plan
  llm_opinion: string;
  buy_price: number;
  target_price_1: number;
  target_price_2: number;
  stop_loss: number;
  holding_period:
    | "1-2_weeks"
    | "2-4_weeks"
    | "1-2_months"
    | "2-3_months"
    | "long_term";
  position_size_percent: number;
  risk_reward_ratio: string;
  trading_plan: string;
  key_catalysts: string;
  risk_factors: string;
}

export class StockController {
  private upstoxApi: UpstoxAPI;
  private technicalAnalysis: TechnicalAnalysis;

  constructor(upstoxApi: UpstoxAPI, technicalAnalysis: TechnicalAnalysis) {
    this.upstoxApi = upstoxApi;
    this.technicalAnalysis = technicalAnalysis;
  }

  /**
   * Search for stocks by symbol or company name
   * Returns search results with relevance scores and match types
   */
  async searchStocks(
    query: string,
    limit: number = 10,
    exchange?: string
  ): Promise<InstrumentSearchResult[]> {
    return InstrumentModel.search(query, limit, exchange);
  }

  /**
   * Analyze a stock for trading opportunities
   */
  async analyzeStock(instrumentKey: string): Promise<StockAnalysis> {
    // First get instrument details
    const instrument = await InstrumentModel.findByInstrumentKey(instrumentKey);
    if (!instrument) {
      throw new Error("Instrument not found");
    }

    // Then find or create stock record
    let stock = await StockModel.findByInstrumentKey(instrumentKey);
    if (!stock) {
      stock = await StockModel.upsert({
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        instrument_key: instrumentKey,
      });
    }

    // Get historical data for analysis
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 60); // Get 60 days of data for better indicator calculation

    const upstoxCandles = await this.upstoxApi.getDailyCandles(
      instrumentKey,
      fromDate,
      toDate
    );

    // Convert candle format for technical analysis
    const candles = upstoxCandles.map((candle) => ({
      ...candle,
      timestamp: new Date(candle.timestamp).getTime(),
    }));

    // Ensure we have enough data
    if (candles.length < 20) {
      throw new Error("Insufficient historical data for analysis");
    }

    // Get current price from the last candle
    const currentPrice = candles[candles.length - 1].close;

    // Calculate technical indicators
    const indicators = await this.technicalAnalysis.calculateSwingIndicators(
      candles
    );
    const aiSignal = await this.technicalAnalysis.getAISignal(indicators);

    // Calculate support and resistance levels
    const { support, resistance } = findSupportResistanceLevels(candles);

    // Find nearest levels
    const nearestSupport =
      support.find((level: number) => level < currentPrice) || support[0];
    const nearestResistance =
      resistance.find((level: number) => level > currentPrice) || resistance[0];

    // Calculate distance percentages
    const supportDistancePercent =
      ((currentPrice - nearestSupport) / currentPrice) * 100;
    const resistanceDistancePercent =
      ((nearestResistance - currentPrice) / currentPrice) * 100;

    // Calculate price ranges and fibonacci levels
    const priceRanges = calculatePriceRanges(candles);
    const fibonacciLevels = calculateFibonacciLevels(candles);

    return {
      ...indicators,
      ...aiSignal,
      symbol: instrument.symbol,
      price: currentPrice,
      candles,
      price_ranges: priceRanges,
      support_levels: support,
      resistance_levels: resistance,
      nearest_support: nearestSupport,
      nearest_resistance: nearestResistance,
      support_distance_percent: supportDistancePercent,
      resistance_distance_percent: resistanceDistancePercent,
      fibonacci_levels: fibonacciLevels,
      // Add missing properties from StockAnalysis interface
      llm_opinion: aiSignal.opinion,
      buy_price: aiSignal.buyPrice,
      target_price_1: aiSignal.targetPrice1,
      target_price_2: aiSignal.targetPrice2,
      stop_loss: aiSignal.stopLoss,
      holding_period: aiSignal.holdingPeriod,
      position_size_percent: aiSignal.positionSizePercent,
      risk_reward_ratio: aiSignal.riskRewardRatio,
      trading_plan: aiSignal.tradingPlan,
      key_catalysts: aiSignal.keyCatalysts,
      risk_factors: aiSignal.riskFactors,
    };
  }
}
