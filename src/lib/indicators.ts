// Technical Indicators Library
// Optimized for multi-timeframe analysis

import { OpenAIService } from "@/services/openai";
import { type CandleData } from "@/types/upstox";
import { type SwingTradingIndicators as SignalIndicators } from "@/types/signal";
import { type AISignal as SignalAIResponse } from "@/types/signal";
import { type StockAnalysis } from "@/controllers/StockController";

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

  if (returns.length === 0) return 0;

  // Calculate standard deviation of returns
  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - avgReturn, 2));
  const variance =
    squaredDiffs.reduce((sum, diff) => sum + diff, 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Annualize volatility (252 trading days)
  const annualizedVol = stdDev * Math.sqrt(252);

  // For Indian markets, typical stock volatility ranges from 15% to 60% annualized
  // Map this range to 0-100 percentile for better representation of NSE/BSE behavior
  // Use a more realistic range for Indian equity markets
  const minVol = 15; // 15% minimum volatility
  const maxVol = 60; // 60% maximum volatility

  const percentile = Math.min(
    Math.max(((annualizedVol - minVol) / (maxVol - minVol)) * 100, 0),
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
    // Use more realistic support/resistance levels for Indian markets
    // Based on typical volatility and price movements
    return {
      support: [
        Number((currentPrice * 0.985).toFixed(2)), // 1.5% below
        Number((currentPrice * 0.97).toFixed(2)), // 3% below
        Number((currentPrice * 0.95).toFixed(2)), // 5% below
      ],
      resistance: [
        Number((currentPrice * 1.015).toFixed(2)), // 1.5% above
        Number((currentPrice * 1.03).toFixed(2)), // 3% above
        Number((currentPrice * 1.05).toFixed(2)), // 5% above
      ],
    };
  }

  const recentCandles = candles.slice(-lookbackPeriod);
  const highs = recentCandles.map((c) => c.high);
  const lows = recentCandles.map((c) => c.low);
  const currentPrice = recentCandles[recentCandles.length - 1].close;

  // Find local maxima and minima with improved logic
  const resistance: { price: number; strength: number }[] = [];
  const support: { price: number; strength: number }[] = [];

  // Use smaller window for more granular detection
  const window = 3;
  const volumeThreshold = 1.1; // 10% above average volume (more lenient)

  for (let i = window; i < highs.length - window; i++) {
    const localHighs = highs.slice(i - window, i + window + 1);
    const localLows = lows.slice(i - window, i + window + 1);
    const localVolumes = recentCandles
      .slice(i - window, i + window + 1)
      .map((c) => c.volume);
    const avgVolume =
      localVolumes.reduce((sum, vol) => sum + vol, 0) / localVolumes.length;

    // Check for local maximum (resistance)
    if (highs[i] === Math.max(...localHighs)) {
      // Calculate level strength based on retests and volume
      let strength = 1;
      const volumeBonus =
        recentCandles[i].volume > avgVolume * volumeThreshold ? 1 : 0;

      // Check for retests within 2% tolerance
      for (let j = i + 1; j < highs.length; j++) {
        if (Math.abs(highs[j] - highs[i]) / highs[i] < 0.02) {
          strength++;
        }
      }

      resistance.push({
        price: Number(highs[i].toFixed(2)),
        strength: strength + volumeBonus,
      });
    }

    // Check for local minimum (support)
    if (lows[i] === Math.min(...localLows)) {
      // Calculate level strength based on retests and volume
      let strength = 1;
      const volumeBonus =
        recentCandles[i].volume > avgVolume * volumeThreshold ? 1 : 0;

      // Check for retests within 2% tolerance
      for (let j = i + 1; j < lows.length; j++) {
        if (Math.abs(lows[j] - lows[i]) / lows[i] < 0.02) {
          strength++;
        }
      }

      support.push({
        price: Number(lows[i].toFixed(2)),
        strength: strength + volumeBonus,
      });
    }
  }

  // Also add pivot points as additional support/resistance
  const pivotHigh = Math.max(...highs);
  const pivotLow = Math.min(...lows);
  const pivotClose = currentPrice;
  const pivot = (pivotHigh + pivotLow + pivotClose) / 3;

  // Add pivot-based levels
  resistance.push(
    {
      price: Number((pivot + (pivotHigh - pivotLow) * 0.382).toFixed(2)),
      strength: 2,
    },
    {
      price: Number((pivot + (pivotHigh - pivotLow) * 0.618).toFixed(2)),
      strength: 2,
    }
  );

  support.push(
    {
      price: Number((pivot - (pivotHigh - pivotLow) * 0.382).toFixed(2)),
      strength: 2,
    },
    {
      price: Number((pivot - (pivotHigh - pivotLow) * 0.618).toFixed(2)),
      strength: 2,
    }
  );

  // If still no levels found, use dynamic percentage-based levels
  if (support.length === 0) {
    const atr = calculateATR(recentCandles, 14).atr;

    support.push(
      { price: Number((currentPrice - atr * 1.5).toFixed(2)), strength: 1 },
      { price: Number((currentPrice - atr * 2.5).toFixed(2)), strength: 1 },
      { price: Number((currentPrice - atr * 3.5).toFixed(2)), strength: 1 }
    );
  }

  if (resistance.length === 0) {
    const atr = calculateATR(recentCandles, 14).atr;

    resistance.push(
      { price: Number((currentPrice + atr * 1.5).toFixed(2)), strength: 1 },
      { price: Number((currentPrice + atr * 2.5).toFixed(2)), strength: 1 },
      { price: Number((currentPrice + atr * 3.5).toFixed(2)), strength: 1 }
    );
  }

  // Sort by strength and price, then take top 3 levels
  const topSupport = support
    .filter((level) => level.price < currentPrice) // Only support below current price
    .sort((a, b) => b.strength - a.strength || b.price - a.price)
    .slice(0, 3)
    .map((level) => level.price);

  const topResistance = resistance
    .filter((level) => level.price > currentPrice) // Only resistance above current price
    .sort((a, b) => b.strength - a.strength || a.price - b.price)
    .slice(0, 3)
    .map((level) => level.price);

  // Ensure we have at least 3 levels each
  if (topSupport.length < 3) {
    const atr = calculateATR(recentCandles, 14).atr;
    while (topSupport.length < 3) {
      const multiplier = topSupport.length + 1;
      topSupport.push(Number((currentPrice - atr * multiplier).toFixed(2)));
    }
  }

  if (topResistance.length < 3) {
    const atr = calculateATR(recentCandles, 14).atr;
    while (topResistance.length < 3) {
      const multiplier = topResistance.length + 1;
      topResistance.push(Number((currentPrice + atr * multiplier).toFixed(2)));
    }
  }

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

// ===== SWING TRADING PATTERN DETECTION =====

export function detectBreakoutPattern(candles: CandleData[]): {
  pattern: "cup_and_handle" | "flag" | "wedge" | "triangle" | "none";
  confidence: "high" | "medium" | "low";
} {
  if (candles.length < 30) return { pattern: "none", confidence: "low" };

  const recent = candles.slice(-30);
  const prices = recent.map((c) => c.close);
  const highs = recent.map((c) => c.high);
  const lows = recent.map((c) => c.low);
  const volumes = recent.map((c) => c.volume);
  const currentPrice = prices[prices.length - 1];

  // Flag pattern: Strong move followed by consolidation
  const flagLookback = 15;
  if (prices.length >= flagLookback) {
    const preTrend = prices.slice(0, flagLookback);
    const consolidation = prices.slice(flagLookback);

    const trendMove =
      (preTrend[preTrend.length - 1] - preTrend[0]) / preTrend[0];
    const consolidationRange =
      Math.max(...consolidation) - Math.min(...consolidation);
    const consolidationPercent = consolidationRange / currentPrice;

    // Strong move (>8%) followed by tight consolidation (<4%)
    if (Math.abs(trendMove) > 0.08 && consolidationPercent < 0.04) {
      // Check volume confirmation - lower volume during consolidation
      const trendVolume =
        preTrend
          .slice(-5)
          .reduce((sum, _, i) => sum + volumes[flagLookback - 5 + i], 0) / 5;
      const consolidationVolume =
        consolidation
          .slice(-5)
          .reduce(
            (sum, _, i) =>
              sum + volumes[flagLookback + consolidation.length - 5 + i],
            0
          ) / 5;

      if (consolidationVolume < trendVolume * 0.8) {
        return { pattern: "flag", confidence: "high" };
      }
    }
  }

  // Triangle pattern: Converging support and resistance
  if (prices.length >= 20) {
    const trianglePrices = prices.slice(-20);
    const triangleHighs = highs.slice(-20);
    const triangleLows = lows.slice(-20);

    // Find trend lines
    const firstHalf = trianglePrices.slice(0, 10);
    const secondHalf = trianglePrices.slice(10);

    const firstRange = Math.max(...firstHalf) - Math.min(...firstHalf);
    const secondRange = Math.max(...secondHalf) - Math.min(...secondHalf);

    // Converging pattern - range should be decreasing
    if (firstRange > secondRange * 1.3) {
      // Check for at least 2 touches on each side
      const recentHigh = Math.max(...triangleHighs);
      const recentLow = Math.min(...triangleLows);

      let upperTouches = 0;
      let lowerTouches = 0;

      for (let i = 0; i < triangleHighs.length; i++) {
        if (triangleHighs[i] > recentHigh * 0.99) upperTouches++;
        if (triangleLows[i] < recentLow * 1.01) lowerTouches++;
      }

      if (upperTouches >= 2 && lowerTouches >= 2) {
        return { pattern: "triangle", confidence: "medium" };
      }
    }
  }

  // Cup and Handle: U-shaped recovery with handle
  if (prices.length >= 25) {
    const cupPrices = prices.slice(-25);
    const cupVolumes = volumes.slice(-25);

    // Find the cup (U-shape)
    const leftSide = cupPrices.slice(0, 8);
    const bottom = cupPrices.slice(8, 17);
    const rightSide = cupPrices.slice(17, 22);
    const handle = cupPrices.slice(22);

    const leftHigh = Math.max(...leftSide);
    const rightHigh = Math.max(...rightSide);
    const cupLow = Math.min(...bottom);
    const handleHigh = Math.max(...handle);

    // Cup criteria: similar highs on both sides, significant dip
    const cupDepth = (leftHigh - cupLow) / leftHigh;
    const sidesSimilar = Math.abs(leftHigh - rightHigh) / leftHigh < 0.05;
    const handleLower = handleHigh < rightHigh * 0.95;

    if (cupDepth > 0.12 && cupDepth < 0.35 && sidesSimilar && handleLower) {
      // Volume should decrease during cup formation and handle
      const leftVolume =
        leftSide.slice(-3).reduce((sum, _, i) => sum + cupVolumes[5 + i], 0) /
        3;
      const bottomVolume =
        bottom.slice(-3).reduce((sum, _, i) => sum + cupVolumes[14 + i], 0) / 3;

      if (bottomVolume < leftVolume * 0.7) {
        return { pattern: "cup_and_handle", confidence: "medium" };
      }
    }
  }

  // Wedge pattern: Converging trend lines with directional bias
  if (prices.length >= 15) {
    const wedgePrices = prices.slice(-15);
    const wedgeHighs = highs.slice(-15);
    const wedgeLows = lows.slice(-15);

    // Rising wedge (bearish) or falling wedge (bullish)
    const firstPrice = wedgePrices[0];
    const lastPrice = wedgePrices[wedgePrices.length - 1];
    const priceDirection = (lastPrice - firstPrice) / firstPrice;

    const firstHigh = Math.max(...wedgeHighs.slice(0, 5));
    const lastHigh = Math.max(...wedgeHighs.slice(-5));
    const firstLow = Math.min(...wedgeLows.slice(0, 5));
    const lastLow = Math.min(...wedgeLows.slice(-5));

    const highTrend = (lastHigh - firstHigh) / firstHigh;
    const lowTrend = (lastLow - firstLow) / firstLow;

    // Converging lines with directional bias
    if (
      Math.abs(highTrend - lowTrend) > 0.03 &&
      Math.abs(priceDirection) > 0.02
    ) {
      return { pattern: "wedge", confidence: "low" };
    }
  }

  return { pattern: "none", confidence: "low" };
}

export function checkATRValidation(
  candles: CandleData[],
  currentPrice: number
): {
  isValid: boolean;
  atrPercent: number;
} {
  const atr = calculateATR(candles, 14).atr;
  const atrPercent = (atr / currentPrice) * 100;

  return {
    isValid: atrPercent > 2.0,
    atrPercent: Number(atrPercent.toFixed(2)),
  };
}

export function checkPriceRange(price: number): {
  isValid: boolean;
  range: string;
} {
  const isValid = price >= 100 && price <= 2000;
  let range = "";

  if (price < 100) range = "below ₹100";
  else if (price > 2000) range = "above ₹2000";
  else range = "₹100-₹2000";

  return { isValid, range };
}

export function detectPullbackToSupport(
  candles: CandleData[],
  supportLevels: number[],
  currentPrice: number
): {
  isPullback: boolean;
  supportLevel: number | null;
  distance: number;
} {
  if (supportLevels.length === 0) {
    return { isPullback: false, supportLevel: null, distance: 0 };
  }

  // Find the nearest support level below current price
  const supportsBelowPrice = supportLevels.filter(
    (level) => level < currentPrice
  );
  if (supportsBelowPrice.length === 0) {
    return { isPullback: false, supportLevel: null, distance: 0 };
  }

  // Get the closest support level
  const nearestSupport = Math.max(...supportsBelowPrice);
  const distance = ((currentPrice - nearestSupport) / currentPrice) * 100;

  // Check if we're in a pullback scenario:
  // 1. Price is within 5% of support level
  // 2. Recent price action shows a pullback (price was higher in last 5 days)
  const isPullback = distance <= 5;

  if (isPullback && candles.length >= 5) {
    // Verify it's actually a pullback by checking recent highs
    const recent5Days = candles.slice(-5);
    const recentHigh = Math.max(...recent5Days.map((c) => c.high));
    const pullbackConfirmed = recentHigh > currentPrice * 1.02; // Recent high at least 2% above current

    return {
      isPullback: pullbackConfirmed,
      supportLevel: nearestSupport,
      distance: Number(distance.toFixed(2)),
    };
  }

  return {
    isPullback: false,
    supportLevel: nearestSupport,
    distance: Number(distance.toFixed(2)),
  };
}

export function detectVolumeBreakout(candles: CandleData[]): {
  hasVolumeBreakout: boolean;
  volumeMultiple: number;
} {
  if (candles.length < 21)
    return { hasVolumeBreakout: false, volumeMultiple: 0 };

  const currentVolume = candles[candles.length - 1].volume;
  const recentVolume = candles[candles.length - 2]?.volume || currentVolume;

  // Calculate 20-day average volume (excluding current day)
  const avgVolume =
    candles.slice(-21, -1).reduce((sum, c) => sum + c.volume, 0) / 20;

  // Use the higher of current or recent volume for breakout detection
  const volumeToCheck = Math.max(currentVolume, recentVolume);
  const volumeMultiple = volumeToCheck / avgVolume;

  // Also check if volume is increasing trend (3 of last 5 days above average)
  const recent5Volumes = candles.slice(-5).map((c) => c.volume);
  const aboveAvgCount = recent5Volumes.filter((vol) => vol > avgVolume).length;
  const volumeTrend = aboveAvgCount >= 3;

  return {
    hasVolumeBreakout: volumeMultiple > 1.5 || volumeTrend,
    volumeMultiple: Number(volumeMultiple.toFixed(2)),
  };
}

export function checkRSIBounceZone(rsi: number): {
  isInBounceZone: boolean;
  zone: string;
} {
  // Expanded bounce zone for swing trading - RSI between 35-55 is good for entries
  const isInBounceZone = rsi >= 35 && rsi <= 55;
  let zone = "";

  if (rsi < 25) zone = "deeply oversold";
  else if (rsi >= 25 && rsi < 35) zone = "oversold";
  else if (rsi >= 35 && rsi <= 45) zone = "ideal bounce zone";
  else if (rsi > 45 && rsi <= 55) zone = "good bounce zone";
  else if (rsi > 55 && rsi < 70) zone = "bullish momentum";
  else if (rsi >= 70 && rsi < 80) zone = "overbought";
  else zone = "extremely overbought";

  return { isInBounceZone, zone };
}

export function detectMACDBullishCrossover(candles: CandleData[]): {
  isBullishCrossover: boolean;
  signal: string;
} {
  if (candles.length < 35) {
    return { isBullishCrossover: false, signal: "insufficient data" };
  }

  const prices = candles.map((c) => c.close);

  // Calculate MACD for last few periods to detect crossover
  const currentMACD = calculateMACD(prices);
  const previousMACD = calculateMACD(prices.slice(0, -1));

  // Detect actual crossover - line crossing above signal
  const currentAbove = currentMACD.line > currentMACD.signal;
  const previousBelow = previousMACD.line <= previousMACD.signal;
  const isBullishCrossover = currentAbove && previousBelow;

  // Detect bearish crossover - line crossing below signal
  const currentBelow = currentMACD.line < currentMACD.signal;
  const previousAbove = previousMACD.line >= previousMACD.signal;
  const isBearishCrossover = currentBelow && previousAbove;

  let signal = "";
  if (isBullishCrossover) {
    signal = "bullish crossover";
  } else if (isBearishCrossover) {
    signal = "bearish crossover";
  } else if (currentMACD.line > currentMACD.signal) {
    signal = "bullish (no crossover)";
  } else if (currentMACD.line < currentMACD.signal) {
    signal = "bearish (no crossover)";
  } else {
    signal = "neutral";
  }

  return { isBullishCrossover, signal };
}

export function detectRisingVolume(candles: CandleData[]): {
  isRising: boolean;
  trend: string;
} {
  if (candles.length < 10)
    return { isRising: false, trend: "insufficient data" };

  const recent10 = candles.slice(-10);
  const volumes = recent10.map((c) => c.volume);

  // Method 1: Check if recent 5 days average > previous 5 days average
  const recent5Avg = volumes.slice(-5).reduce((sum, vol) => sum + vol, 0) / 5;
  const previous5Avg =
    volumes.slice(-10, -5).reduce((sum, vol) => sum + vol, 0) / 5;
  const avgIncreasing = recent5Avg > previous5Avg * 1.1; // 10% increase

  // Method 2: Check for consecutive increases in recent days
  const recent5 = volumes.slice(-5);
  let consecutiveIncreases = 0;
  for (let i = 1; i < recent5.length; i++) {
    if (recent5[i] > recent5[i - 1]) consecutiveIncreases++;
  }
  const consecutiveRising = consecutiveIncreases >= 3;

  // Method 3: Check if current volume is above 20-day average
  const currentVolume = volumes[volumes.length - 1];
  const avgVolume =
    candles.length >= 20
      ? candles.slice(-20).reduce((sum, c) => sum + c.volume, 0) / 20
      : volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  const aboveAverage = currentVolume > avgVolume * 1.2; // 20% above average

  const isRising = avgIncreasing || consecutiveRising || aboveAverage;

  let trend = "";
  if (avgIncreasing && consecutiveRising) {
    trend = "strongly rising";
  } else if (avgIncreasing || consecutiveRising) {
    trend = "rising";
  } else if (aboveAverage) {
    trend = "elevated";
  } else if (recent5Avg < previous5Avg * 0.9) {
    trend = "declining";
  } else {
    trend = "stable";
  }

  return { isRising, trend };
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

    // Calculate Bollinger Bands
    const bollingerBands = calculateBollingerBands(prices, 20, 2);

    // Determine Bollinger position
    let bollingerPosition:
      | "above_upper"
      | "upper_half"
      | "middle"
      | "lower_half"
      | "below_lower";
    if (currentPrice > bollingerBands.upper) {
      bollingerPosition = "above_upper";
    } else if (
      currentPrice > bollingerBands.middle &&
      currentPrice <= bollingerBands.upper
    ) {
      bollingerPosition = "upper_half";
    } else if (currentPrice < bollingerBands.lower) {
      bollingerPosition = "below_lower";
    } else if (
      currentPrice < bollingerBands.middle &&
      currentPrice >= bollingerBands.lower
    ) {
      bollingerPosition = "lower_half";
    } else {
      bollingerPosition = "middle";
    }

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
        calculateSMA(prices, Math.min(200, prices.length)).toFixed(2)
      ),
      ema_9: Number(
        calculateEMA(prices, Math.min(9, prices.length)).toFixed(2)
      ),
      ema_21: Number(
        calculateEMA(prices, Math.min(21, prices.length)).toFixed(2)
      ),
      ema_50: Number(
        calculateEMA(prices, Math.min(50, prices.length)).toFixed(2)
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

    // Swing Trading Pattern Detection
    const breakoutPattern = detectBreakoutPattern(candles);
    const atrValidation = checkATRValidation(candles, currentPrice);
    const priceRangeCheck = checkPriceRange(currentPrice);
    const pullbackCheck = detectPullbackToSupport(
      candles,
      support,
      currentPrice
    );
    const volumeBreakout = detectVolumeBreakout(candles);
    const rsiBounceCheck = checkRSIBounceZone(rsi);
    const macdCrossover = detectMACDBullishCrossover(candles);
    const risingVolumeCheck = detectRisingVolume(candles);

    return {
      symbol: "", // Will be filled by controller
      timestamp: new Date().toISOString(),
      price: currentPrice,

      // Trend Analysis
      sma_50: moving_averages.sma_50,
      sma_200: moving_averages.sma_200,
      ema_21: moving_averages.ema_21,
      ema_50: moving_averages.ema_50,
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
      bollinger_upper: Number(bollingerBands.upper.toFixed(2)),
      bollinger_lower: Number(bollingerBands.lower.toFixed(2)),
      bollinger_position: bollingerPosition,
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

      // Swing Trading Pattern Detection
      breakout_pattern: breakoutPattern.pattern,
      breakout_confidence: breakoutPattern.confidence,
      atr_validation: atrValidation.isValid,
      atr_percent: atrValidation.atrPercent,
      price_range_valid: priceRangeCheck.isValid,
      price_range: priceRangeCheck.range,
      pullback_to_support: pullbackCheck.isPullback,
      support_distance: pullbackCheck.distance,
      volume_breakout_detected: volumeBreakout.hasVolumeBreakout,
      volume_multiple: volumeBreakout.volumeMultiple,
      rsi_bounce_zone: rsiBounceCheck.isInBounceZone,
      rsi_zone: rsiBounceCheck.zone,
      macd_bullish_crossover_detected: macdCrossover.isBullishCrossover,
      macd_signal_status: macdCrossover.signal,
      rising_volume: risingVolumeCheck.isRising,
      volume_trend: risingVolumeCheck.trend,
    };
  }

  /**
   * Analyze stock data and generate complete technical analysis
   */
  async analyze(
    candles: CandleData[],
    currentPrice: number
  ): Promise<Partial<StockAnalysis>> {
    // Calculate technical indicators
    const indicators = await this.calculateSwingIndicators(candles);
    const aiSignal = await this.getAISignal(indicators);

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
    };
  }
}
