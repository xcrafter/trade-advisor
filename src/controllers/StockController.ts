import {
  InstrumentModel,
  type InstrumentSearchResult,
} from "@/models/InstrumentModel";
import { StockAnalysisModel } from "@/models/StockAnalysisModel";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";
import { OpenAIService } from "@/services/openai";

export interface StockAnalysis {
  // Basic Info
  symbol: string;
  instrument_key: string;
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
   * Analyze a stock for trading opportunities for a specific user
   */
  async analyzeStock(
    instrumentKey: string,
    userId: string,
    forceRefresh: boolean = false
  ): Promise<StockAnalysis> {
    if (!userId) {
      throw new Error("User ID is required for stock analysis");
    }

    // First get instrument details
    const instrument = await InstrumentModel.findByInstrumentKey(instrumentKey);
    if (!instrument) {
      throw new Error("Instrument not found");
    }

    // Validate symbol
    if (!instrument.symbol || instrument.symbol.trim() === "") {
      throw new Error("Invalid instrument: symbol cannot be empty");
    }

    // Check if we have recent analysis and don't need to refresh
    if (!forceRefresh) {
      try {
        // First try to find by instrument key (more precise)
        let cachedAnalysis = await StockAnalysisModel.getByInstrumentKey(
          instrumentKey,
          userId
        );

        // If not found, try by symbol (fallback)
        if (!cachedAnalysis) {
          cachedAnalysis = await StockAnalysisModel.getBySymbol(
            instrument.symbol,
            userId
          );
        }

        if (cachedAnalysis) {
          const lastUpdated = new Date(cachedAnalysis.last_updated_at);
          const now = new Date();
          const hoursSinceUpdate =
            (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60);

          // Use cached data if less than 4 hours old
          if (hoursSinceUpdate < 4) {
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

    // Get historical data
    const candles = await this.upstoxApi.getLastTradingDaysData(instrumentKey);
    if (!candles || candles.length === 0) {
      throw new Error("No historical data available");
    }

    // Get current market price
    let currentPrice: number;
    let priceChange: number;
    let priceChangePercent: number;

    const skipDays = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) || 0;
    if (skipDays > 0) {
      // Use the last candle's close price when skipping days
      currentPrice = candles[candles.length - 1].close;
      const previousClose = candles[candles.length - 2]?.close || currentPrice;
      priceChange = currentPrice - previousClose;
      priceChangePercent = (priceChange / previousClose) * 100;
    } else {
      // Get real-time price when not skipping days
      const quote = await this.upstoxApi.getMarketQuote(instrumentKey);
      currentPrice = quote.ltp;
      priceChange = quote.change;
      priceChangePercent = quote.changePercent;
    }

    // Perform technical analysis
    const technicalAnalysisResult = await this.technicalAnalysis.analyze(
      candles,
      currentPrice
    );

    // Create the base analysis object with required fields
    const baseAnalysis: StockAnalysis = {
      symbol: instrument.symbol,
      instrument_key: instrumentKey,
      price: currentPrice,
      price_change: priceChange,
      price_change_percent: priceChangePercent,
      candles: candles,
      last_updated_at: new Date().toISOString(),

      // Default values for required fields
      signal: "neutral",
      direction: "NEUTRAL",
      confidence_level: "low",
      trend_direction: "sideways",
      trend_strength: "weak",
      swing_score: 0,
      volatility_percentile: 0,
      volatility_rating: "low",
      sma_50: 0,
      sma_200: 0,
      ema_21: 0,
      ema_50: 0,
      golden_cross: false,
      death_cross: false,
      rsi_14: 0,
      rsi_21: 0,
      rsi_signal: "neutral",
      macd_line: 0,
      macd_signal: 0,
      macd_histogram: 0,
      macd_bullish_crossover: false,
      stochastic: 0,
      stochastic_signal: "neutral",
      volume_20day_avg: 0,
      volume_current: 0,
      volume_vs_20day_avg: 0,
      volume_trend_20day: "stable",
      volume_breakout: false,
      volume_quality: "poor",
      accumulation_distribution: 0,
      support_levels: [],
      resistance_levels: [],
      nearest_support: 0,
      nearest_resistance: 0,
      support_distance_percent: 0,
      resistance_distance_percent: 0,
      weekly_pivot: 0,
      fibonacci_levels: [],
      atr_21: 0,
      bollinger_upper: 0,
      bollinger_lower: 0,
      bollinger_position: "middle",
      market_regime: "sideways",
      sector_performance: 0,
      relative_strength: 0,
      sector_correlation: 0,
      llm_opinion: "",
      buy_price: 0,
      target_price_1: 0,
      target_price_2: 0,
      stop_loss: 0,
      holding_period: "1-2_weeks",
      position_size_percent: 0,
      risk_reward_ratio: "0:0",
      trading_plan: "",
      key_catalysts: "",
      risk_factors: "",
      swing_setup_quality: "poor",
      liquidity_check: "low",
      volatility_check: "insufficient",
      market_trend_alignment: "weak",
      breakout_pattern: "none",
      breakout_confidence: "low",
      atr_validation: false,
      atr_percent: 0,
      price_range_valid: false,
      price_range: "0-0",
      pullback_to_support: false,
      support_distance: 0,
      volume_breakout_detected: false,
      volume_multiple: 0,
      rsi_bounce_zone: false,
      rsi_zone: "0",
      macd_bullish_crossover_detected: false,
      macd_signal_status: "neutral",
      rising_volume: false,
      volume_trend: "stable",
      price_ranges: {
        day_3: { high: 0, low: 0 },
        day_10: { high: 0, low: 0 },
        day_30: { high: 0, low: 0 },
      },
    };

    // Get AI signal
    const openAIService = new OpenAIService();
    const aiSignal = await openAIService.getAISignal({
      symbol: instrument.symbol,
      timestamp: new Date().toISOString(),
      price: currentPrice,
      sma_50: technicalAnalysisResult.sma_50 || 0,
      sma_200: technicalAnalysisResult.sma_200 || 0,
      ema_21: technicalAnalysisResult.ema_21 || 0,
      ema_50: technicalAnalysisResult.ema_50 || 0,
      trend_direction: technicalAnalysisResult.trend_direction || "sideways",
      trend_strength: technicalAnalysisResult.trend_strength || "weak",
      golden_cross: technicalAnalysisResult.golden_cross || false,
      death_cross: technicalAnalysisResult.death_cross || false,
      rsi_14: technicalAnalysisResult.rsi_14 || 0,
      rsi_21: technicalAnalysisResult.rsi_21 || 0,
      rsi_signal: technicalAnalysisResult.rsi_signal || "neutral",
      macd_line: technicalAnalysisResult.macd_line || 0,
      macd_signal: technicalAnalysisResult.macd_signal || 0,
      macd_histogram: technicalAnalysisResult.macd_histogram || 0,
      macd_bullish_crossover:
        technicalAnalysisResult.macd_bullish_crossover || false,
      stochastic: technicalAnalysisResult.stochastic || 0,
      stochastic_signal: technicalAnalysisResult.stochastic_signal || "neutral",
      volume_20day_avg: technicalAnalysisResult.volume_20day_avg || 0,
      volume_current: technicalAnalysisResult.volume_current || 0,
      volume_vs_20day_avg: technicalAnalysisResult.volume_vs_20day_avg || 0,
      volume_trend_20day:
        technicalAnalysisResult.volume_trend_20day || "stable",
      volume_breakout: technicalAnalysisResult.volume_breakout || false,
      accumulation_distribution:
        technicalAnalysisResult.accumulation_distribution || 0,
      volume_quality: technicalAnalysisResult.volume_quality || "poor",
      atr_21: technicalAnalysisResult.atr_21 || 0,
      suggested_stop_loss:
        technicalAnalysisResult.stop_loss || currentPrice * 0.985,
      suggested_take_profit:
        technicalAnalysisResult.target_price_2 || currentPrice * 1.04,
      bollinger_upper: technicalAnalysisResult.bollinger_upper || 0,
      bollinger_lower: technicalAnalysisResult.bollinger_lower || 0,
      bollinger_position:
        technicalAnalysisResult.bollinger_position || "middle",
      volatility_percentile: technicalAnalysisResult.volatility_percentile || 0,
      volatility_rating: technicalAnalysisResult.volatility_rating || "low",
      support_levels: technicalAnalysisResult.support_levels || [],
      resistance_levels: technicalAnalysisResult.resistance_levels || [],
      nearest_support: technicalAnalysisResult.nearest_support || 0,
      nearest_resistance: technicalAnalysisResult.nearest_resistance || 0,
      support_distance_percent:
        technicalAnalysisResult.support_distance_percent || 0,
      resistance_distance_percent:
        technicalAnalysisResult.resistance_distance_percent || 0,
      weekly_pivot: technicalAnalysisResult.weekly_pivot || 0,
      fibonacci_levels: technicalAnalysisResult.fibonacci_levels || [],
      market_regime: technicalAnalysisResult.market_regime || "sideways",
      sector_performance: technicalAnalysisResult.sector_performance || 0,
      relative_strength: technicalAnalysisResult.relative_strength || 0,
      sector_correlation: technicalAnalysisResult.sector_correlation || 0,
      swing_score: technicalAnalysisResult.swing_score || 0,
      swing_setup_quality:
        technicalAnalysisResult.swing_setup_quality || "poor",
      breakout_pattern: technicalAnalysisResult.breakout_pattern || "none",
      breakout_confidence: technicalAnalysisResult.breakout_confidence || "low",
      atr_validation: technicalAnalysisResult.atr_validation || false,
      atr_percent: technicalAnalysisResult.atr_percent || 0,
      price_range_valid: technicalAnalysisResult.price_range_valid || false,
      price_range: technicalAnalysisResult.price_range || "",
      pullback_to_support: technicalAnalysisResult.pullback_to_support || false,
      support_distance: technicalAnalysisResult.support_distance || 0,
      volume_breakout_detected:
        technicalAnalysisResult.volume_breakout_detected || false,
      volume_multiple: technicalAnalysisResult.volume_multiple || 0,
      rsi_bounce_zone: technicalAnalysisResult.rsi_bounce_zone || false,
      rsi_zone: technicalAnalysisResult.rsi_zone || "",
      macd_bullish_crossover_detected:
        technicalAnalysisResult.macd_bullish_crossover_detected || false,
      macd_signal_status: technicalAnalysisResult.macd_signal_status || "",
      rising_volume: technicalAnalysisResult.rising_volume || false,
      volume_trend: technicalAnalysisResult.volume_trend || "",
    });

    // Merge technical analysis results while preserving required fields
    const stockAnalysis: StockAnalysis = {
      ...baseAnalysis,
      ...technicalAnalysisResult,
      // Add AI signal data
      signal: aiSignal.signal,
      direction: aiSignal.direction,
      confidence_level: aiSignal.confidence_level,
      llm_opinion: aiSignal.opinion,
      buy_price: aiSignal.buy_price,
      target_price_1: aiSignal.target_price_1,
      target_price_2: aiSignal.target_price_2,
      stop_loss: aiSignal.stop_loss,
      holding_period: aiSignal.holding_period,
      position_size_percent: aiSignal.position_size_percent,
      risk_reward_ratio: aiSignal.risk_reward_ratio,
      trading_plan: aiSignal.trading_plan,
      key_catalysts: aiSignal.key_catalysts,
      risk_factors: aiSignal.risk_factors,
      swing_setup_quality: aiSignal.swing_setup_quality,
      liquidity_check: aiSignal.liquidity_check,
      volatility_check: aiSignal.volatility_check,
      market_trend_alignment: aiSignal.market_trend_alignment,
      // Ensure critical fields are not overwritten
      symbol: instrument.symbol,
      instrument_key: instrumentKey,
      price: currentPrice,
      price_change: priceChange,
      price_change_percent: priceChangePercent,
      candles: candles,
      last_updated_at: new Date().toISOString(),
    };

    // Validate the final analysis object
    if (!stockAnalysis.symbol || stockAnalysis.symbol.trim() === "") {
      console.error("Invalid analysis after merge:", stockAnalysis);
      throw new Error("Critical error: Symbol was lost during analysis merge");
    }

    // Save the analysis
    await StockAnalysisModel.upsert(stockAnalysis, instrumentKey, userId);

    return stockAnalysis;
  }

  /**
   * Get recently analyzed stocks for a specific user
   */
  async getRecentAnalysis(
    userId: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    return StockAnalysisModel.getRecent(userId, limit);
  }

  /**
   * Search analyzed stocks for a specific user
   */
  async searchAnalyzedStocks(
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    return StockAnalysisModel.search(query, userId, limit);
  }
}
