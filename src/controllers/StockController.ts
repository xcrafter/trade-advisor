import { StockModel } from "@/models/StockModel";
import {
  InstrumentModel,
  type InstrumentSearchResult,
} from "@/models/InstrumentModel";
import { StockAnalysisModel } from "@/models/StockAnalysisModel";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";
import { type CandleData } from "@/types/upstox";
import {
  calculatePriceRanges,
  calculateFibonacciLevels,
  findSupportResistanceLevels,
} from "@/lib/indicators";

export interface StockAnalysis {
  // Basic Info
  symbol: string;
  price: number;
  price_change: number;
  price_change_percent: number;
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

  // Swing Trading Evaluation
  swing_setup_quality: "excellent" | "good" | "fair" | "poor";
  liquidity_check: "high" | "moderate" | "low";
  volatility_check: "optimal" | "adequate" | "insufficient";
  market_trend_alignment: "strong" | "moderate" | "weak" | "against_trend";

  // Swing Trading Pattern Detection
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

  last_updated_at: string;
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
  async analyzeStock(
    instrumentKey: string,
    forceRefresh: boolean = false
  ): Promise<StockAnalysis> {
    // First get instrument details
    const instrument = await InstrumentModel.findByInstrumentKey(instrumentKey);
    if (!instrument) {
      throw new Error("Instrument not found");
    }

    // Check if we have recent analysis and don't need to refresh
    if (!forceRefresh) {
      try {
        const cachedAnalysis = await StockAnalysisModel.getBySymbol(
          instrument.symbol
        );
        if (cachedAnalysis) {
          const lastUpdated = new Date(cachedAnalysis.last_updated_at);
          const now = new Date();
          const hoursSinceUpdate =
            (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

          // Use cached data if less than 4 hours old
          if (hoursSinceUpdate < 4) {
            // Add fallback values for new fields if they don't exist in cached data
            if (cachedAnalysis.price_change === undefined) {
              cachedAnalysis.price_change = 0;
            }
            if (cachedAnalysis.price_change_percent === undefined) {
              cachedAnalysis.price_change_percent = 0;
            }
            return cachedAnalysis;
          }
        }
      } catch (error) {
        console.warn(
          "Failed to check cached analysis, proceeding with fresh analysis:",
          error
        );
      }
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

    // Get historical data for analysis - REAL DATA ONLY
    const toDate = new Date();
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 60); // Get 60 days of data for better indicator calculation

    let candles: CandleData[];
    try {
      console.log(
        `[StockController] Fetching candles for ${instrument.symbol} (${instrumentKey})`
      );
      const upstoxCandles = await this.upstoxApi.getDailyCandles(
        instrumentKey,
        fromDate,
        toDate
      );
      console.log(
        `[StockController] Received ${upstoxCandles.length} candles for ${instrument.symbol}`
      );

      // Convert candle format for technical analysis
      candles = upstoxCandles.map((candle) => ({
        ...candle,
        timestamp: new Date(candle.timestamp).getTime(),
      }));

      if (candles.length === 0) {
        throw new Error("No historical data available from Upstox API");
      }

      if (candles.length < 20) {
        throw new Error(
          `Insufficient data for analysis: only ${candles.length} candles available, minimum 20 required`
        );
      }
    } catch (error) {
      console.error("Failed to fetch real market data:", error);
      throw new Error(
        `Unable to analyze ${
          instrument.symbol
        }: Real market data unavailable. ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    // Get real-time current price and change information
    let currentPrice: number;
    let priceChange: number;
    let priceChangePercent: number;

    try {
      console.log(
        `[StockController] Fetching real-time quote for ${instrument.symbol}`
      );
      const quote = await this.upstoxApi.getMarketQuote(instrumentKey);
      currentPrice = quote.ltp;
      priceChange = quote.change;
      priceChangePercent = quote.changePercent;
      console.log(
        `[StockController] Real-time quote for ${
          instrument.symbol
        }: ₹${currentPrice} (${priceChangePercent.toFixed(2)}%)`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[StockController] Market appears to be offline, using historical data for ${instrument.symbol}`,
        errorMessage
      );

      // Use last candle close price
      currentPrice = candles[candles.length - 1].close;

      // Calculate change from previous candle
      const previousClose =
        candles.length > 1 ? candles[candles.length - 2].close : currentPrice;
      priceChange = currentPrice - previousClose;
      priceChangePercent =
        previousClose > 0
          ? ((currentPrice - previousClose) / previousClose) * 100
          : 0;

      console.log(
        `[StockController] Using historical data for ${
          instrument.symbol
        }: ₹${currentPrice} (${priceChangePercent.toFixed(
          2
        )}% from previous candle)`
      );
    }

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

    const analysis: StockAnalysis = {
      ...indicators,
      ...aiSignal,
      symbol: instrument.symbol,
      price: currentPrice,
      price_change: priceChange,
      price_change_percent: priceChangePercent,
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

      // Swing Trading Evaluation
      swing_setup_quality: aiSignal.swingSetupQuality,
      liquidity_check: aiSignal.liquidityCheck,
      volatility_check: aiSignal.volatilityCheck,
      market_trend_alignment: aiSignal.marketTrendAlignment,

      last_updated_at: new Date().toISOString(),
    };

    // Save analysis to database (with error handling)
    try {
      await StockAnalysisModel.upsert(analysis, instrumentKey);
    } catch (error) {
      console.error("Failed to save analysis to database:", error);
      // Continue without saving to database
    }

    return analysis;
  }

  /**
   * Get recently analyzed stocks
   */
  async getRecentAnalysis(limit: number = 10): Promise<StockAnalysis[]> {
    return StockAnalysisModel.getRecent(limit);
  }

  /**
   * Search analyzed stocks
   */
  async searchAnalyzedStocks(
    query: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    return StockAnalysisModel.search(query, limit);
  }
}
