// Technical Indicators Library
// Optimized for multi-timeframe analysis

import { OpenAIService } from "@/services/openai";
import { type CandleData } from "@/types/upstox";
import { type SwingTradingIndicators as SignalIndicators } from "@/types/signal";
import { type AISignal as SignalAIResponse } from "@/types/signal";

export interface VolumeMetrics {
  volume_20day_avg: number;
  volume_current: number;
  volume_vs_20day_avg: number;
  volume_trend_20day:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  volume_breakout: boolean;
}

export interface MACDResult {
  line: number;
  signal: number;
  histogram: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
}

export interface SwingTradingIndicators {
  rsi_14: number;
  macd: MACDResult;
  stochastic: number;
  moving_averages: {
    sma_20: number;
    sma_50: number;
    sma_200: number;
    ema_9: number;
    ema_21: number;
  };
  price_ranges: {
    day_3: { high: number; low: number };
    day_10: { high: number; low: number };
    day_30: { high: number; low: number };
  };
  volume_quality: "excellent" | "good" | "average" | "poor";
  trend_direction: "bullish" | "bearish" | "sideways" | "transitioning";
  support_resistance: {
    support: number[];
    resistance: number[];
  };
  volatility: number;
  swing_score: number;
  swing_setup_quality: "excellent" | "good" | "fair" | "poor";
  buy_price: number;
  target_price_1: number;
  target_price_2: number;
  stop_loss: number;
  risk_reward_ratio: string;
  position_size_percent: number;
  holding_period: string;

  // Volatility & Risk
  atr_21: number;
  suggested_stop_loss: number;
  suggested_take_profit: number;
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
}

export interface AISignal {
  signal: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral";
  direction: "LONG" | "SHORT" | "NEUTRAL";
  confidence_level: "very_high" | "high" | "moderate" | "low";
  llm_opinion: string;
}

export interface SwingScoreInput {
  trend: {
    direction: "bullish" | "bearish" | "sideways" | "transitioning";
    strength: "strong" | "moderate" | "weak";
  };
  momentum: {
    rsi: number;
    macd: number;
  };
  volume: "excellent" | "good" | "average" | "poor";
  volatility: "very_high" | "high" | "moderate" | "low" | "very_low";
  support_resistance: {
    nearest_support: number;
    nearest_resistance: number;
    current_price: number;
  };
}

// Add configuration interface for market-specific settings
export interface MarketConfig {
  // ATR multipliers for stop loss and take profit
  atrMultipliers: {
    stopLoss: number; // Default 2.0 for NSE stocks due to higher volatility and gaps
    takeProfit: number; // Default 1.5 for reasonable profit targets
  };
  // Can add more market-specific settings here later
}

// Default configuration for Indian markets
export const DEFAULT_INDIAN_MARKET_CONFIG: MarketConfig = {
  atrMultipliers: {
    stopLoss: 2.0, // 2x ATR for stop loss
    takeProfit: 1.5, // 1.5x ATR for take profit
  },
};

// ===== TREND INDICATORS =====

export function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const slice = prices.slice(-period);
  const sum = slice.reduce((acc, price) => acc + price, 0);
  return Number((sum / period).toFixed(2));
}

export function calculateEMA(prices: number[], period: number): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0];
  if (prices.length < period) return prices[prices.length - 1];

  const k = 2 / (period + 1);
  let ema = prices[0];

  for (let i = 1; i < prices.length; i++) {
    ema = prices[i] * k + ema * (1 - k);
  }

  return Number(ema.toFixed(2));
}

// ===== MOMENTUM INDICATORS =====

export function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral RSI

  let gains = 0;
  let losses = 0;

  // Calculate initial average gain and loss
  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Calculate RSI using smoothed averages
  for (let i = period + 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  if (prices.length < Math.max(fastPeriod, slowPeriod) + signalPeriod) {
    return { line: 0, signal: 0, histogram: 0 };
  }

  // Calculate historical EMAs and MACD line values
  const macdValues = [];
  for (let i = Math.max(fastPeriod, slowPeriod) - 1; i < prices.length; i++) {
    const pricesUpToI = prices.slice(0, i + 1);
    const fastEMA = calculateEMA(pricesUpToI, fastPeriod);
    const slowEMA = calculateEMA(pricesUpToI, slowPeriod);
    macdValues.push(fastEMA - slowEMA);
  }

  // Calculate signal line (EMA of MACD line)
  const signalLine = calculateEMA(macdValues, signalPeriod);

  // Get the latest MACD value
  const macdLine = macdValues[macdValues.length - 1];

  // Calculate histogram
  const histogram = macdLine - signalLine;

  return {
    line: Number(macdLine.toFixed(4)),
    signal: Number(signalLine.toFixed(4)),
    histogram: Number(histogram.toFixed(4)),
  };
}

export function calculateStochastic(
  candles: CandleData[],
  period: number = 14,
  smoothK: number = 3,
  smoothD: number = 3
): number {
  if (candles.length < period + smoothK) return 50;

  // Calculate raw %K values
  const kValues = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const highs = slice.map((c) => c.high);
    const lows = slice.map((c) => c.low);
    const currentClose = slice[slice.length - 1].close;

    const highestHigh = Math.max(...highs);
    const lowestLow = Math.min(...lows);

    if (highestHigh === lowestLow) {
      kValues.push(50);
    } else {
      const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }
  }

  if (kValues.length < smoothK) return 50;

  // Calculate smoothed %K (which becomes %D)
  const smoothedK = [];
  for (let i = smoothK - 1; i < kValues.length; i++) {
    const slice = kValues.slice(i - smoothK + 1, i + 1);
    const avg = slice.reduce((sum, val) => sum + val, 0) / smoothK;
    smoothedK.push(avg);
  }

  if (smoothedK.length < smoothD) return 50;

  // Calculate final %D (smoothed %K)
  const finalD =
    smoothedK.slice(-smoothD).reduce((sum, val) => sum + val, 0) / smoothD;

  return Number(finalD.toFixed(2));
}

// ===== VOLUME ANALYSIS =====

export function calculate20DayVolumeMetrics(volumes: number[]): VolumeMetrics {
  if (volumes.length < 20) {
    return {
      volume_20day_avg: 0,
      volume_current: volumes[volumes.length - 1] || 0,
      volume_vs_20day_avg: 0,
      volume_trend_20day: "insufficient_data",
      volume_breakout: false,
    };
  }

  const recent20Days = volumes.slice(-20);
  const volume_20day_avg = recent20Days.reduce((sum, vol) => sum + vol, 0) / 20;
  const volume_current = volumes[volumes.length - 1];
  const volume_vs_20day_avg = (volume_current / volume_20day_avg) * 100;

  // Determine volume trend
  const first10Days = recent20Days.slice(0, 10);
  const last10Days = recent20Days.slice(10);
  const first10Avg = first10Days.reduce((sum, vol) => sum + vol, 0) / 10;
  const last10Avg = last10Days.reduce((sum, vol) => sum + vol, 0) / 10;

  let volume_trend_20day:
    | "increasing"
    | "decreasing"
    | "stable"
    | "insufficient_data";
  const trendDiff = (last10Avg - first10Avg) / first10Avg;

  if (trendDiff > 0.1) {
    volume_trend_20day = "increasing";
  } else if (trendDiff < -0.1) {
    volume_trend_20day = "decreasing";
  } else {
    volume_trend_20day = "stable";
  }

  const volume_breakout = volume_vs_20day_avg > 150; // 50% above average

  return {
    volume_20day_avg,
    volume_current,
    volume_vs_20day_avg,
    volume_trend_20day,
    volume_breakout,
  };
}

export function calculateAccumulationDistribution(
  candles: CandleData[]
): number {
  if (candles.length === 0) return 0;

  let ad = 0;

  for (const candle of candles) {
    const { high, low, close, volume } = candle;
    if (high === low) continue; // Avoid division by zero

    const moneyFlowMultiplier = (close - low - (high - close)) / (high - low);
    const moneyFlowVolume = moneyFlowMultiplier * volume;
    ad += moneyFlowVolume;
  }

  return ad;
}

// ===== VOLATILITY INDICATORS =====

export function calculateATR(
  candles: CandleData[],
  period: number = 21,
  config: MarketConfig = DEFAULT_INDIAN_MARKET_CONFIG
): {
  atr: number;
  scaledStopLoss: number;
  scaledTakeProfit: number;
} {
  if (candles.length < 2)
    return { atr: 0, scaledStopLoss: 0, scaledTakeProfit: 0 };

  // Calculate True Range for each candle
  const trueRanges = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr1 = high - low; // Current high - low
    const tr2 = Math.abs(high - prevClose); // Current high - prev close
    const tr3 = Math.abs(low - prevClose); // Current low - prev close

    const trueRange = Math.max(tr1, tr2, tr3);
    trueRanges.push(trueRange);
  }

  // Calculate ATR using Wilder's smoothing
  let atr = trueRanges[0];
  const multiplier = 1 / period;

  for (let i = 1; i < Math.min(period, trueRanges.length); i++) {
    atr = (atr * (period - 1) + trueRanges[i]) * multiplier;
  }

  // Scale ATR for stop loss and take profit based on market config
  const scaledStopLoss = atr * config.atrMultipliers.stopLoss;
  const scaledTakeProfit = atr * config.atrMultipliers.takeProfit;

  return {
    atr: Number(atr.toFixed(2)),
    scaledStopLoss: Number(scaledStopLoss.toFixed(2)),
    scaledTakeProfit: Number(scaledTakeProfit.toFixed(2)),
  };
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  standardDeviations: number = 2
): BollingerBands {
  if (prices.length < period) {
    const lastPrice = prices[prices.length - 1] || 0;
    return { upper: lastPrice, middle: lastPrice, lower: lastPrice };
  }

  const recentPrices = prices.slice(-period);
  const sma = recentPrices.reduce((sum, price) => sum + price, 0) / period;

  const variance =
    recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) /
    period;
  const stdDev = Math.sqrt(variance);

  return {
    upper: sma + stdDev * standardDeviations,
    middle: sma,
    lower: sma - stdDev * standardDeviations,
  };
}

export function calculateVolatilityPercentile(candles: CandleData[]): number {
  if (candles.length < 2) return 0;

  // Calculate daily returns
  const returns = [];
  for (let i = 1; i < candles.length; i++) {
    const dailyReturn =
      ((candles[i].close - candles[i - 1].close) / candles[i - 1].close) * 100;
    returns.push(dailyReturn);
  }

  // Calculate standard deviation of returns
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - avgReturn, 2));
  const variance =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize volatility (252 trading days)
  const annualizedVol = stdDev * Math.sqrt(252);

  // Convert to percentile (0-100)
  // For Indian markets, typical stock volatility ranges from 20% to 80% annualized
  // Map this range to 0-100 percentile for better representation of NSE/BSE behavior
  const percentile = Math.min(
    Math.max(((annualizedVol - 20) / (80 - 20)) * 100, 0),
    100
  );

  return Number(percentile.toFixed(2));
}

// ===== SUPPORT & RESISTANCE =====

export function findSupportResistanceLevels(
  candles: CandleData[],
  lookbackPeriod: number = 50
): {
  support: number[];
  resistance: number[];
} {
  if (candles.length < lookbackPeriod) {
    const currentPrice = candles[candles.length - 1]?.close || 0;
    return {
      support: [
        Number((currentPrice * 0.98).toFixed(2)),
        Number((currentPrice * 0.96).toFixed(2)),
        Number((currentPrice * 0.94).toFixed(2)),
      ],
      resistance: [
        Number((currentPrice * 1.02).toFixed(2)),
        Number((currentPrice * 1.04).toFixed(2)),
        Number((currentPrice * 1.06).toFixed(2)),
      ],
    };
  }

  const recentCandles = candles.slice(-lookbackPeriod);
  const highs = recentCandles.map((c) => c.high);
  const lows = recentCandles.map((c) => c.low);
  const currentPrice = recentCandles[recentCandles.length - 1].close;

  // Find local maxima and minima with volume confirmation
  const resistance: { price: number; strength: number }[] = [];
  const support: { price: number; strength: number }[] = [];

  // Window size for local extrema
  const window = 5;
  const volumeThreshold = 1.2; // 20% above average volume

  for (let i = window; i < highs.length - window; i++) {
    const localHighs = highs.slice(i - window, i + window + 1);
    const localLows = lows.slice(i - window, i + window + 1);
    const localVolumes = recentCandles
      .slice(i - window, i + window + 1)
      .map((c) => c.volume);
    const avgVolume =
      localVolumes.reduce((sum, vol) => sum + vol, 0) / localVolumes.length;

    // Check for local maximum (resistance) with volume confirmation
    if (
      highs[i] === Math.max(...localHighs) &&
      recentCandles[i].volume > avgVolume * volumeThreshold
    ) {
      // Calculate level strength based on retests
      let strength = 1;
      for (let j = i + 1; j < highs.length; j++) {
        if (Math.abs(highs[j] - highs[i]) / highs[i] < 0.01) {
          // 1% tolerance
          strength++;
        }
      }
      resistance.push({ price: Number(highs[i].toFixed(2)), strength });
    }

    // Check for local minimum (support) with volume confirmation
    if (
      lows[i] === Math.min(...localLows) &&
      recentCandles[i].volume > avgVolume * volumeThreshold
    ) {
      // Calculate level strength based on retests
      let strength = 1;
      for (let j = i + 1; j < lows.length; j++) {
        if (Math.abs(lows[j] - lows[i]) / lows[i] < 0.01) {
          // 1% tolerance
          strength++;
        }
      }
      support.push({ price: Number(lows[i].toFixed(2)), strength });
    }
  }

  // If no levels found, use price-based levels
  if (support.length === 0) {
    support.push(
      { price: Number((currentPrice * 0.98).toFixed(2)), strength: 1 },
      { price: Number((currentPrice * 0.96).toFixed(2)), strength: 1 },
      { price: Number((currentPrice * 0.94).toFixed(2)), strength: 1 }
    );
  }
  if (resistance.length === 0) {
    resistance.push(
      { price: Number((currentPrice * 1.02).toFixed(2)), strength: 1 },
      { price: Number((currentPrice * 1.04).toFixed(2)), strength: 1 },
      { price: Number((currentPrice * 1.06).toFixed(2)), strength: 1 }
    );
  }

  // Sort by strength and price, then take top 3 levels
  const topSupport = support
    .sort((a, b) => b.strength - a.strength || b.price - a.price)
    .slice(0, 3)
    .map((level) => level.price);

  const topResistance = resistance
    .sort((a, b) => b.strength - a.strength || a.price - b.price)
    .slice(0, 3)
    .map((level) => level.price);

  return {
    support: topSupport,
    resistance: topResistance,
  };
}

export function calculateWeeklyPivot(candles: CandleData[]): number {
  if (candles.length < 5) return 0;

  // Use last 5 days as weekly data
  const weeklyCandles = candles.slice(-5);
  const high = Math.max(...weeklyCandles.map((c) => c.high));
  const low = Math.min(...weeklyCandles.map((c) => c.low));
  const close = weeklyCandles[weeklyCandles.length - 1].close;

  return (high + low + close) / 3;
}

export function calculateFibonacciLevels(
  candles: CandleData[],
  lookbackPeriod: number = 50
): number[] {
  if (candles.length < lookbackPeriod) {
    // If we don't have enough data, calculate from available data
    const high = Math.max(...candles.map((c) => c.high));
    const low = Math.min(...candles.map((c) => c.low));
    const range = high - low;
    const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];
    return fibLevels.map((level) => Number((high - range * level).toFixed(2)));
  }

  const recentCandles = candles.slice(-lookbackPeriod);
  const high = Math.max(...recentCandles.map((c) => c.high));
  const low = Math.min(...recentCandles.map((c) => c.low));
  const range = high - low;

  // Standard Fibonacci retracement levels
  const fibLevels = [0.236, 0.382, 0.5, 0.618, 0.786];

  // Calculate and format levels to 2 decimal places
  return fibLevels
    .map((level) => Number((high - range * level).toFixed(2)))
    .filter((level) => !isNaN(level) && isFinite(level)); // Remove any invalid values
}

// ===== MARKET CONTEXT =====

export function determineMarketRegime(
  candles: CandleData[]
): "bullish" | "bearish" | "sideways" | "transitioning" {
  if (candles.length < 50) return "sideways";

  const prices = candles.map((c) => c.close);
  const sma50 = calculateSMA(prices, 50);
  const sma200 = calculateSMA(prices, 200);
  const currentPrice = prices[prices.length - 1];

  // Calculate price change percentage
  const priceChange =
    ((currentPrice - prices[prices.length - 50]) / prices[prices.length - 50]) *
    100;

  // Calculate volatility
  const returns = prices.slice(1).map((p, i) => (p - prices[i]) / prices[i]);
  const volatility =
    Math.sqrt(
      returns.reduce((sum, r) => sum + r * r, 0) / (returns.length - 1)
    ) *
    Math.sqrt(252) *
    100;

  if (volatility > 40) {
    return "transitioning";
  }

  if (currentPrice > sma50 && sma50 > sma200 && priceChange > 5) {
    return "bullish";
  }

  if (currentPrice < sma50 && sma50 < sma200 && priceChange < -5) {
    return "bearish";
  }

  return "sideways";
}

// ===== SWING TRADING SPECIFICS =====

export function calculateSwingScore(input: SwingScoreInput): number {
  let score = 5; // Base score

  // Trend alignment (30% weight)
  if (
    input.trend.direction === "bullish" &&
    input.trend.strength === "strong"
  ) {
    score += 2; // Strong uptrend
  } else if (
    input.trend.direction === "bearish" &&
    input.trend.strength === "strong"
  ) {
    score += 1; // Clear downtrend (for shorting)
  }

  // RSI positioning (20% weight)
  if (input.momentum.rsi > 30 && input.momentum.rsi < 70) {
    score += 1.5; // Good RSI range for swing trading
  } else if (input.momentum.rsi < 30 || input.momentum.rsi > 70) {
    score += 0.5; // Extreme levels can be good for contrarian plays
  }

  // MACD momentum (20% weight)
  if (input.momentum.macd > 0) {
    score += 1.5; // Bullish momentum
  } else if (input.momentum.macd < 0) {
    score += 1; // Bearish momentum (for shorting)
  }

  // Volume confirmation (20% weight)
  if (input.volume === "excellent") {
    score += 1.5; // Above average volume
  } else if (input.volume === "good") {
    score += 1; // Increasing volume trend
  }

  // Support/Resistance positioning (10% weight)
  const supportDistance =
    ((input.support_resistance.current_price -
      input.support_resistance.nearest_support) /
      input.support_resistance.current_price) *
    100;
  const resistanceDistance =
    ((input.support_resistance.nearest_resistance -
      input.support_resistance.current_price) /
      input.support_resistance.current_price) *
    100;

  if (supportDistance < 5 || resistanceDistance < 5) {
    score += 0.5; // Near key levels
  }

  return Math.min(Math.max(score, 0), 10); // Clamp between 0-10
}

// ===== SIGNAL CLASSIFICATION =====

export function getRSISignal(
  rsi: number
): "oversold" | "bearish" | "neutral" | "bullish" | "overbought" {
  if (rsi < 30) return "oversold";
  if (rsi < 45) return "bearish";
  if (rsi > 70) return "overbought";
  if (rsi > 55) return "bullish";
  return "neutral";
}

export function getStochasticSignal(
  stochastic: number
): "oversold" | "bearish" | "neutral" | "bullish" | "overbought" {
  if (stochastic < 20) return "oversold";
  if (stochastic < 40) return "bearish";
  if (stochastic > 80) return "overbought";
  if (stochastic > 60) return "bullish";
  return "neutral";
}

// Add this helper function before the TechnicalAnalysis class
export function calculatePriceRanges(candles: CandleData[]): {
  day_3: { high: number; low: number };
  day_10: { high: number; low: number };
  day_30: { high: number; low: number };
} {
  const calculateRange = (period: number) => {
    if (candles.length < period) {
      return { high: 0, low: 0 };
    }

    const recentCandles = candles.slice(-period);
    const highs = recentCandles.map((c) => c.high);
    const lows = recentCandles.map((c) => c.low);

    return {
      high: Number(Math.max(...highs).toFixed(2)),
      low: Number(Math.min(...lows).toFixed(2)),
    };
  };

  return {
    day_3: calculateRange(3),
    day_10: calculateRange(10),
    day_30: calculateRange(30),
  };
}

// Technical Analysis class that uses the indicator functions
export class TechnicalAnalysis {
  private openAIService: OpenAIService;
  private marketConfig: MarketConfig;

  constructor(marketConfig: MarketConfig = DEFAULT_INDIAN_MARKET_CONFIG) {
    this.openAIService = new OpenAIService();
    this.marketConfig = marketConfig;
  }

  async getAISignal(indicators: SignalIndicators): Promise<SignalAIResponse> {
    return this.openAIService.getAISignal(indicators);
  }

  async calculateSwingIndicators(
    candles: CandleData[]
  ): Promise<SignalIndicators> {
    if (candles.length < 20) {
      throw new Error("Insufficient data for analysis");
    }

    const prices = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = prices[prices.length - 1];

    // Calculate all indicators
    const rsi = calculateRSI(prices);
    const macd = calculateMACD(prices);
    const stochastic = calculateStochastic(candles);
    const volumeMetrics = calculate20DayVolumeMetrics(volumes);
    const volatility = calculateVolatilityPercentile(candles);
    const { support, resistance } = findSupportResistanceLevels(candles);
    const trend = determineMarketRegime(candles);
    const atrData = calculateATR(candles, 21, this.marketConfig);

    // Find nearest levels
    const nearestSupport =
      support.find((level) => level < currentPrice) || support[0];
    const nearestResistance =
      resistance.find((level) => level > currentPrice) || resistance[0];

    // Calculate stop loss and take profit using scaled ATR
    const suggestedStopLoss = Number(
      (currentPrice - atrData.scaledStopLoss).toFixed(2)
    );
    const suggestedTakeProfit = Number(
      (currentPrice + atrData.scaledTakeProfit).toFixed(2)
    );

    // Calculate moving averages
    const moving_averages = {
      sma_20: Number(
        calculateSMA(prices, Math.min(20, prices.length)).toFixed(2)
      ),
      sma_50: Number(
        calculateSMA(prices, Math.min(50, prices.length)).toFixed(2)
      ),
      sma_200: Number(
        calculateSMA(prices, Math.min(60, prices.length)).toFixed(2)
      ),
      ema_9: Number(
        calculateEMA(prices, Math.min(9, prices.length)).toFixed(2)
      ),
      ema_21: Number(
        calculateEMA(prices, Math.min(21, prices.length)).toFixed(2)
      ),
    };

    // Calculate swing score based on indicators
    const swingScoreInput: SwingScoreInput = {
      trend: {
        direction: trend,
        strength:
          volatility > 80 ? "strong" : volatility > 40 ? "moderate" : "weak", // Adjusted thresholds
      },
      momentum: {
        rsi,
        macd: macd.histogram,
      },
      volume: volumeMetrics.volume_breakout
        ? "excellent"
        : volumeMetrics.volume_trend_20day === "increasing"
        ? "good"
        : volumeMetrics.volume_trend_20day === "stable"
        ? "average"
        : "poor",
      volatility:
        volatility > 85
          ? "very_high"
          : volatility > 65
          ? "high"
          : volatility > 45
          ? "moderate"
          : volatility > 25
          ? "low"
          : "very_low", // Adjusted thresholds for Indian markets
      support_resistance: {
        nearest_support: nearestSupport,
        nearest_resistance: nearestResistance,
        current_price: currentPrice,
      },
    };

    const swingScore = calculateSwingScore(swingScoreInput);

    // Calculate setup quality based on swing score
    const setupQuality =
      swingScore >= 8
        ? "excellent"
        : swingScore >= 6
        ? "good"
        : swingScore >= 4
        ? "fair"
        : "poor";

    return {
      symbol: "", // Will be filled by controller
      timestamp: new Date().toISOString(),
      price: currentPrice,

      // Trend Analysis
      sma_50: moving_averages.sma_50,
      sma_200: moving_averages.sma_200,
      ema_21: moving_averages.ema_21,
      ema_50: 0, // Not calculated yet
      trend_direction: trend,
      trend_strength: swingScoreInput.trend.strength,
      golden_cross: moving_averages.sma_50 > moving_averages.sma_200,
      death_cross: moving_averages.sma_50 < moving_averages.sma_200,

      // Momentum
      rsi_14: rsi,
      rsi_21: calculateRSI(prices, 21),
      rsi_signal: getRSISignal(rsi),

      macd_line: macd.line,
      macd_signal: macd.signal,
      macd_histogram: macd.histogram,
      macd_bullish_crossover: macd.histogram > 0 && macd.line > macd.signal,

      stochastic,
      stochastic_signal: getStochasticSignal(stochastic),

      // Volume Analysis
      volume_20day_avg: volumeMetrics.volume_20day_avg,
      volume_current: volumeMetrics.volume_current,
      volume_vs_20day_avg: volumeMetrics.volume_vs_20day_avg,
      volume_trend_20day: volumeMetrics.volume_trend_20day,
      volume_breakout: volumeMetrics.volume_breakout,
      accumulation_distribution: calculateAccumulationDistribution(candles),
      volume_quality: swingScoreInput.volume,

      // Volatility & Risk
      atr_21: atrData.atr,
      bollinger_upper: 0, // TODO: Implement
      bollinger_lower: 0, // TODO: Implement
      bollinger_position: "middle", // TODO: Implement
      volatility_percentile: volatility,
      volatility_rating: swingScoreInput.volatility,
      suggested_stop_loss: suggestedStopLoss,
      suggested_take_profit: suggestedTakeProfit,

      // Support & Resistance
      support_levels: support.map((level) => Number(level.toFixed(2))), // Format to 2 decimal places
      resistance_levels: resistance.map((level) => Number(level.toFixed(2))), // Format to 2 decimal places
      nearest_support: Number(nearestSupport.toFixed(2)),
      nearest_resistance: Number(nearestResistance.toFixed(2)),
      support_distance_percent: Number(
        (((currentPrice - nearestSupport) / currentPrice) * 100).toFixed(2)
      ),
      resistance_distance_percent: Number(
        (((nearestResistance - currentPrice) / currentPrice) * 100).toFixed(2)
      ),
      weekly_pivot: Number(calculateWeeklyPivot(candles).toFixed(2)),
      fibonacci_levels: calculateFibonacciLevels(candles).map((level) =>
        Number(level.toFixed(2))
      ),

      // Market Context
      market_regime:
        trend === "bullish"
          ? "bull_market"
          : trend === "bearish"
          ? "bear_market"
          : trend === "transitioning"
          ? "volatile"
          : "sideways",
      sector_performance: 0, // TODO: Add sector analysis
      relative_strength: 0, // TODO: Add relative strength calculation
      sector_correlation: 0, // TODO: Add sector correlation

      // Swing Trading
      swing_score: swingScore,
      swing_setup_quality: setupQuality,
    };
  }
}
