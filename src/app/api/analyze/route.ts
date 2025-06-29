import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import axios from "axios";

// Get cache duration from environment variable (default to 300 seconds = 5 minutes)
const CACHE_DURATION_SECONDS = parseInt(
  process.env.CACHE_DURATION_SECONDS || "300"
);
const CACHE_DURATION_MS = CACHE_DURATION_SECONDS * 1000; // Convert to milliseconds

interface UpstoxCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Removed TwelvedataCandle interface as we're now using Upstox API

interface AdvancedTechnicalIndicators {
  symbol: string;
  timestamp: string;
  price: number;
  vwap: number;
  rsi_14: number;
  sma_20: number;
  ema_9: number;
  volume_spike: boolean;
  atr_14: number;
  trend_alignment: string;
  breakout_day_high: boolean;
  breakout_prev_day_range: boolean;
  opening_range_breakout: boolean;
  clean_setup: boolean;
  intraday_score: number;
}

// Calculate RSI with specified period
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Calculate VWAP
function calculateVWAP(candles: UpstoxCandle[]): number {
  let totalPriceVolume = 0;
  let totalVolume = 0;

  candles.forEach((candle) => {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    totalPriceVolume += typicalPrice * candle.volume;
    totalVolume += candle.volume;
  });

  return totalVolume > 0 ? totalPriceVolume / totalVolume : 0;
}

// Calculate SMA with specified period
function calculateSMA(prices: number[], period: number = 20): number {
  if (prices.length < period) return prices[prices.length - 1] || 0;

  const recentPrices = prices.slice(-period);
  return recentPrices.reduce((sum, price) => sum + price, 0) / period;
}

// Calculate EMA with specified period
function calculateEMA(prices: number[], period: number = 9): number {
  if (prices.length === 0) return 0;
  if (prices.length < period) return calculateSMA(prices, prices.length);

  const multiplier = 2 / (period + 1);
  let ema = calculateSMA(prices.slice(0, period), period);

  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }

  return ema;
}

// Get market timing context and advice
function getTimingAdvice(): string {
  const now = new Date();
  const istTime = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // Convert to IST
  const hours = istTime.getHours();
  const minutes = istTime.getMinutes();
  const currentTime = hours * 100 + minutes; // Convert to HHMM format

  if (currentTime >= 915 && currentTime <= 1000) {
    return "OPENING HOUR (High volatility): Enter with caution, wait for initial volatility to settle (15-20 min).";
  } else if (currentTime >= 1000 && currentTime <= 1130) {
    return "MORNING SESSION (Optimal): Best time for trend following trades with good volume.";
  } else if (currentTime >= 1130 && currentTime <= 1400) {
    return "MIDDAY SLOW (Low volume): Avoid new positions, wait for afternoon session.";
  } else if (currentTime >= 1400 && currentTime <= 1515) {
    return "CLOSING HOUR (High activity): Good for breakout trades but manage risk carefully.";
  } else {
    return "AFTER MARKET: No trading possible. Plan for next session.";
  }
}

// Calculate ATR (Average True Range)
function calculateATR(candles: UpstoxCandle[], period: number = 14): number {
  if (candles.length < period + 1) return 0;

  const trueRanges: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );

    trueRanges.push(tr);
  }

  const recentTRs = trueRanges.slice(-period);
  return recentTRs.reduce((sum, tr) => sum + tr, 0) / period;
}

// Check volume spike
function checkVolumeSpike(volumes: number[], multiplier: number = 2): boolean {
  if (volumes.length < 20) return false;

  const currentVolume = volumes[volumes.length - 1];
  const avgVolume =
    volumes.slice(-20, -1).reduce((sum, vol) => sum + vol, 0) / 19;

  return currentVolume > avgVolume * multiplier;
}

// Determine trend alignment
function determineTrendAlignment(
  price: number,
  ema9: number,
  vwap: number
): string {
  if (price > ema9 && price > vwap && ema9 > vwap) {
    return "bullish_aligned";
  } else if (price < ema9 && price < vwap && ema9 < vwap) {
    return "bearish_aligned";
  } else if (price > ema9 && price > vwap) {
    return "bullish_partial";
  } else if (price < ema9 && price < vwap) {
    return "bearish_partial";
  } else {
    return "neutral";
  }
}

// Check breakout patterns
function checkBreakouts(candles: UpstoxCandle[]): {
  breakout_day_high: boolean;
  breakout_prev_day_range: boolean;
  opening_range_breakout: boolean;
} {
  if (candles.length < 50) {
    return {
      breakout_day_high: false,
      breakout_prev_day_range: false,
      opening_range_breakout: false,
    };
  }

  const currentPrice = candles[candles.length - 1].close;
  const todayCandles = candles.slice(-30); // Last 30 candles for today
  const yesterdayCandles = candles.slice(-60, -30); // Previous 30 candles
  const openingRangeCandles = candles.slice(-45, -30); // First 15 candles

  // Day high breakout
  const dayHigh = Math.max(...todayCandles.map((c) => c.high));
  const breakout_day_high = currentPrice > dayHigh * 0.999; // Small buffer

  // Previous day range breakout
  const prevDayHigh = Math.max(...yesterdayCandles.map((c) => c.high));
  const prevDayLow = Math.min(...yesterdayCandles.map((c) => c.low));
  const breakout_prev_day_range =
    currentPrice > prevDayHigh || currentPrice < prevDayLow;

  // Opening range breakout (first 15 minutes)
  const orHigh = Math.max(...openingRangeCandles.map((c) => c.high));
  const orLow = Math.min(...openingRangeCandles.map((c) => c.low));
  const opening_range_breakout = currentPrice > orHigh || currentPrice < orLow;

  return {
    breakout_day_high,
    breakout_prev_day_range,
    opening_range_breakout,
  };
}

// Evaluate clean setup
function evaluateCleanSetup(indicators: AdvancedTechnicalIndicators): boolean {
  const { price, ema_9, rsi_14, trend_alignment, atr_14 } = indicators;

  // Clean setup criteria
  const trendClear = trend_alignment.includes("aligned");
  const rsiNotExtreme = rsi_14 > 25 && rsi_14 < 75;
  const priceNotStuck = Math.abs(price - ema_9) > atr_14 * 0.1;

  return trendClear && rsiNotExtreme && priceNotStuck;
}

// Calculate intraday score (0-10)
function calculateIntradayScore(
  indicators: AdvancedTechnicalIndicators
): number {
  let score = 0;

  // Trend alignment (0-3 points)
  if (
    indicators.trend_alignment === "bullish_aligned" ||
    indicators.trend_alignment === "bearish_aligned"
  ) {
    score += 3;
  } else if (indicators.trend_alignment.includes("partial")) {
    score += 1.5;
  }

  // RSI momentum (0-2 points)
  if (indicators.rsi_14 > 30 && indicators.rsi_14 < 70) {
    score += 2;
  } else if (indicators.rsi_14 > 20 && indicators.rsi_14 < 80) {
    score += 1;
  }

  // Volume (0-2 points)
  if (indicators.volume_spike) {
    score += 2;
  }

  // Breakouts (0-2 points)
  const breakoutCount = [
    indicators.breakout_day_high,
    indicators.breakout_prev_day_range,
    indicators.opening_range_breakout,
  ].filter(Boolean).length;
  score += Math.min(breakoutCount * 0.7, 2);

  // Clean setup bonus (0-1 point)
  if (indicators.clean_setup) {
    score += 1;
  }

  return Math.min(Math.round(score * 10) / 10, 10);
}

// Database-based cache management functions
async function shouldRefreshData(
  symbol: string,
  stockId: string
): Promise<boolean> {
  try {
    // Get the most recent signal for this stock
    const { data: signals, error } = await supabase
      .from("signals")
      .select("created_at")
      .eq("stock_id", stockId)
      .eq("symbol", symbol.toUpperCase())
      .order("created_at", { ascending: false })
      .limit(1);

    if (error || !signals || signals.length === 0) {
      return true;
    }

    const latestSignal = signals[0];
    const signalAge = Date.now() - new Date(latestSignal.created_at).getTime();

    const shouldRefresh = signalAge > CACHE_DURATION_MS;
    return shouldRefresh;
  } catch (error) {
    console.error(`Error checking refresh status for ${symbol}:`, error);
    return true; // Default to refresh on error
  }
}

// Calculate 5-day volume metrics
function calculate5DayVolumeMetrics(dailyVolumes: number[]): {
  volume_5day_avg: number;
  volume_vs_5day_avg: number;
  volume_trend_5day: string;
  volume_5day_high: number;
  volume_5day_low: number;
} {
  if (dailyVolumes.length < 5) {
    return {
      volume_5day_avg: 0,
      volume_vs_5day_avg: 0,
      volume_trend_5day: "insufficient_data",
      volume_5day_high: 0,
      volume_5day_low: 0,
    };
  }

  // Get last 5 days of volume data
  const last5Days = dailyVolumes.slice(-5);
  const currentVolume = dailyVolumes[dailyVolumes.length - 1];

  // Calculate 5-day average
  const volume_5day_avg = last5Days.reduce((sum, vol) => sum + vol, 0) / 5;

  // Calculate current vs 5-day average percentage
  const volume_vs_5day_avg =
    volume_5day_avg > 0 ? (currentVolume / volume_5day_avg) * 100 : 0;

  // Calculate trend (compare first 2 days vs last 2 days)
  const firstHalf =
    last5Days.slice(0, 2).reduce((sum, vol) => sum + vol, 0) / 2;
  const secondHalf = last5Days.slice(-2).reduce((sum, vol) => sum + vol, 0) / 2;

  let volume_trend_5day: string;
  if (secondHalf > firstHalf * 1.1) {
    volume_trend_5day = "increasing";
  } else if (secondHalf < firstHalf * 0.9) {
    volume_trend_5day = "decreasing";
  } else {
    volume_trend_5day = "stable";
  }

  // Calculate high and low
  const volume_5day_high = Math.max(...last5Days);
  const volume_5day_low = Math.min(...last5Days);

  const result = {
    volume_5day_avg: Math.round(volume_5day_avg),
    volume_vs_5day_avg: Math.round(volume_vs_5day_avg * 100) / 100,
    volume_trend_5day,
    volume_5day_high,
    volume_5day_low,
  };

  return result;
}

// Calculate intraday volume statistics
function calculateIntradayVolumeStats(volumes: number[]): {
  volume_avg_intraday: number;
  volume_max_intraday: number;
  volume_median_intraday: number;
  volume_total_intraday: number;
  volume_candle_count: number;
} {
  if (volumes.length === 0) {
    return {
      volume_avg_intraday: 0,
      volume_max_intraday: 0,
      volume_median_intraday: 0,
      volume_total_intraday: 0,
      volume_candle_count: 0,
    };
  }

  // Calculate basic statistics
  const volume_total_intraday = volumes.reduce((sum, vol) => sum + vol, 0);
  const volume_avg_intraday = Math.round(
    volume_total_intraday / volumes.length
  );
  const volume_max_intraday = Math.max(...volumes);
  const volume_candle_count = volumes.length;

  // Calculate median
  const sortedVolumes = [...volumes].sort((a, b) => a - b);
  let volume_median_intraday: number;
  const midIndex = Math.floor(sortedVolumes.length / 2);

  if (sortedVolumes.length % 2 === 0) {
    // Even number of elements - average of two middle values
    volume_median_intraday = Math.round(
      (sortedVolumes[midIndex - 1] + sortedVolumes[midIndex]) / 2
    );
  } else {
    // Odd number of elements - middle value
    volume_median_intraday = sortedVolumes[midIndex];
  }

  return {
    volume_avg_intraday,
    volume_max_intraday,
    volume_median_intraday,
    volume_total_intraday,
    volume_candle_count,
  };
}

// Fetch daily historical data for 5-day volume analysis
// Helper function to check if a date is a weekday (Monday to Friday)
function isWeekday(date: Date): boolean {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  return day >= 1 && day <= 5; // Monday (1) to Friday (5)
}

// Helper function to get the last N trading days (weekdays only)
function getLastTradingDays(targetTradingDays: number): {
  startDate: Date;
  endDate: Date;
} {
  // eslint-disable-next-line prefer-const
  let endDate = new Date();

  // If today is a weekend, go back to the last Friday
  while (!isWeekday(endDate)) {
    endDate.setDate(endDate.getDate() - 1);
  }

  // Count backwards to find enough trading days
  // eslint-disable-next-line prefer-const
  let currentDate = new Date(endDate);
  let tradingDaysFound = 0;

  while (tradingDaysFound < targetTradingDays) {
    if (isWeekday(currentDate)) {
      tradingDaysFound++;
    }
    if (tradingDaysFound < targetTradingDays) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
  }

  return { startDate: currentDate, endDate };
}

// function to fetch 5 day volume data
async function fetchUpstoxDailyCandles(
  instrumentKey: string,
  targetTradingDays: number = 8 // Target 8 trading days to ensure we get at least 5
): Promise<UpstoxCandle[]> {
  const apiKey = process.env.UPSTOX_API_KEY;

  if (!apiKey) {
    throw new Error("UPSTOX_API_KEY not configured");
  }

  try {
    // Calculate date range for Indian market trading days (Mon-Fri only)
    const { startDate, endDate } = getLastTradingDays(targetTradingDays);

    const endDateStr = endDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const startDateStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(
      `📊 5-Day Volume: ${startDateStr} to ${endDateStr} (${startDate.toLocaleDateString(
        "en-IN",
        { weekday: "short" }
      )} to ${endDate.toLocaleDateString("en-IN", { weekday: "short" })})`
    );

    // Fetch daily data from Upstox API
    const apiUrl = `https://api.upstox.com/v3/historical-candle/${instrumentKey}/days/1/${endDateStr}/${startDateStr}`;
    console.log("apiUrl", apiUrl);
    const response = await axios.get(apiUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      timeout: 15000,
    });

    if (
      response.data.status !== "success" ||
      !response.data.data ||
      !response.data.data.candles ||
      response.data.data.candles.length === 0
    ) {
      throw new Error("No daily market data available from Upstox API");
    }

    // Convert Upstox format to our standard format and filter for weekdays only
    const allCandles: UpstoxCandle[] = response.data.data.candles.map(
      (candle: [string, number, number, number, number, number, number]) => ({
        timestamp: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      })
    );

    // Filter out weekends (keep only Monday-Friday trading days)
    const candles = allCandles.filter((candle) => {
      const candleDate = new Date(candle.timestamp);
      return isWeekday(candleDate);
    });

    // Sort by timestamp (oldest first)
    candles.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Extract and log volume data specifically for 5-day analysis
    const volumes = candles.map((c) => c.volume);
    console.log(
      `📊 5-Day Volume Data: [${volumes
        .slice(-5)
        .map((v) => v.toLocaleString())
        .join(", ")}] (${candles.length} trading days)`
    );

    // Debug: Show raw volume values to understand scale
    console.log(
      `📊 5-Day Volume Raw Values: [${volumes.slice(-5).join(", ")}]`
    );

    return candles;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Daily data fetch error:", errorMessage);
    throw new Error(`Failed to fetch daily market data: ${errorMessage}`);
  }
}

async function fetchUpstoxCandles(
  instrumentKey: string
): Promise<UpstoxCandle[]> {
  const apiKey = process.env.UPSTOX_API_KEY;

  if (!apiKey) {
    throw new Error(
      "UPSTOX_API_KEY not configured. Please add your Upstox API key to environment variables."
    );
  }

  try {
    // Get current date and yesterday for realistic historical data
    // Get the most recent weekday dates for intraday data
    const today = new Date();
    const endDate = new Date(today);
    let startDate = new Date(today);

    // If today is weekend, use Friday as end date
    if (endDate.getDay() === 0) {
      // Sunday
      endDate.setDate(endDate.getDate() - 2); // Go to Friday
    } else if (endDate.getDay() === 6) {
      // Saturday
      endDate.setDate(endDate.getDate() - 1); // Go to Friday
    }

    // Set start date to previous weekday
    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 1);

    // If start date falls on weekend, adjust it
    if (startDate.getDay() === 0) {
      // Sunday
      startDate.setDate(startDate.getDate() - 2); // Go to Friday
    } else if (startDate.getDay() === 6) {
      // Saturday
      startDate.setDate(startDate.getDate() - 1); // Go to Friday
    }

    const todayStr = endDate.toISOString().split("T")[0]; // YYYY-MM-DD
    const yesterdayStr = startDate.toISOString().split("T")[0]; // YYYY-MM-DD

    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    console.log(
      `📊 Intraday Data: Fetching ${yesterdayStr} (${
        dayNames[startDate.getDay()]
      }) to ${todayStr} (${dayNames[endDate.getDay()]})`
    );

    // Try live intraday data first, fallback to historical
    let response;
    try {
      // Live intraday data (if market is open)
      response = await axios.get(
        `https://api.upstox.com/v3/historical-candle/intraday/${instrumentKey}/minutes/1`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 15000,
        }
      );
      if (response?.data?.data?.candles?.length === 0) {
        throw new Error("No live intraday data available");
      }
      console.log(`📊 Intraday Data: Using live data`);
    } catch {
      // Fallback to recent historical data
      response = await axios.get(
        `https://api.upstox.com/v3/historical-candle/${instrumentKey}/minutes/1/${todayStr}/${yesterdayStr}`,
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          timeout: 15000,
        }
      );
      console.log(
        `📊 Intraday Data: Using historical data (${yesterdayStr} to ${todayStr})`
      );
    }

    if (
      response.data.status !== "success" ||
      !response.data.data ||
      !response.data.data.candles ||
      response.data.data.candles.length === 0
    ) {
      throw new Error(
        "No market data available from Upstox API. The market might be closed or the instrument might be invalid."
      );
    }

    // Convert Upstox format to our standard format
    // Upstox candle format: [timestamp, open, high, low, close, volume, oi]
    const candles: UpstoxCandle[] = response.data.data.candles.map(
      (candle: [string, number, number, number, number, number, number]) => ({
        timestamp: candle[0], // ISO timestamp
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
      })
    );

    // Sort by timestamp (oldest first)
    candles.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Debug: Show intraday volume sample to understand scale
    const intraVolumes = candles.map((c) => c.volume);
    const currentVolume = intraVolumes[intraVolumes.length - 1];
    const avgIntraVolume =
      intraVolumes.reduce((sum, vol) => sum + vol, 0) / intraVolumes.length;
    const totalIntraVolume = intraVolumes.reduce((sum, vol) => sum + vol, 0);

    console.log(
      `📊 Intraday Volume (1-min): Current=${currentVolume.toLocaleString()}, Avg=${Math.round(
        avgIntraVolume
      ).toLocaleString()}, Total=${totalIntraVolume.toLocaleString()}, Candles=${
        candles.length
      }`
    );

    // Analyze volume intensity
    const volumeIntensity =
      currentVolume > 50000
        ? "HIGH"
        : currentVolume > 10000
        ? "MEDIUM"
        : currentVolume > 1000
        ? "LOW"
        : "VERY LOW";
    console.log(
      `📊 Volume Analysis: Current minute=${currentVolume.toLocaleString()} shares (${volumeIntensity} intensity) across ${
        candles.length
      } minutes.`
    );

    // Show realistic daily projection
    if (candles.length > 0) {
      const avgVolumePerMinute = totalIntraVolume / candles.length;
      const projectedDailyVolume = avgVolumePerMinute * 375; // 375 minutes in trading day
      console.log(
        `📊 Volume Projection: Avg per minute=${Math.round(
          avgVolumePerMinute
        ).toLocaleString()}, Projected full day=${Math.round(
          projectedDailyVolume
        ).toLocaleString()}`
      );
    }

    return candles;
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    console.error("❌ Upstox API error:", errorMessage);

    // More specific error messages based on error type
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        throw new Error(
          "Upstox API authentication failed. Please check your API key."
        );
      } else if (axiosError.response?.status === 429) {
        throw new Error(
          "Upstox API rate limit exceeded. Please try again later."
        );
      }
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ECONNABORTED"
    ) {
      throw new Error("Upstox API request timeout. Please try again.");
    }

    if (error instanceof Error && error.message.includes("UPSTOX_API_KEY")) {
      throw error; // Re-throw API key configuration errors
    }

    throw new Error(`Failed to fetch market data: ${errorMessage}`);
  }
}

// Calculate recommended volume range based on risk parameters
function calculateVolumeRange(
  entryPrice: number,
  stopLoss: number,
  signal: string
): {
  minVolume: number;
  maxVolume: number;
  recommendedVolume: number;
  positionSizePercent: number;
  volumeRangeText: string;
} {
  // Risk per share (absolute value)
  const riskPerShare = Math.abs(entryPrice - stopLoss);

  // Risk tolerance based on signal strength (much more conservative for intraday)
  const riskToleranceMap = {
    strong: { minRisk: 0.5, maxRisk: 1.5, recommended: 1.0 }, // 0.5-1.5% of capital
    caution: { minRisk: 0.3, maxRisk: 1.0, recommended: 0.5 }, // 0.3-1% of capital
    neutral: { minRisk: 0.2, maxRisk: 0.7, recommended: 0.3 }, // 0.2-0.7% of capital
    risk: { minRisk: 0.1, maxRisk: 0.3, recommended: 0.2 }, // 0.1-0.3% of capital
  };

  const riskProfile =
    riskToleranceMap[signal as keyof typeof riskToleranceMap] ||
    riskToleranceMap.neutral;

  // Realistic account sizes for intraday trading
  const accountSizes = [25000, 50000, 100000, 200000, 300000]; // ₹25K to ₹3L

  // Calculate for realistic account size (₹1L)
  const baseAccountSize = 100000;

  // Calculate position sizes
  const minRiskAmount = (baseAccountSize * riskProfile.minRisk) / 100;
  const maxRiskAmount = (baseAccountSize * riskProfile.maxRisk) / 100;
  const recommendedRiskAmount =
    (baseAccountSize * riskProfile.recommended) / 100;

  // Calculate volume (shares) based on risk per share
  const maxVolume = Math.floor(maxRiskAmount / riskPerShare);
  const minVolume = Math.floor(minRiskAmount / riskPerShare);
  const recommendedVolume = Math.floor(recommendedRiskAmount / riskPerShare);

  // Set realistic limits for intraday trading (max investment ₹50K)
  const maxInvestmentLimit = 50000; // ₹50K max investment for intraday
  const maxVolumeByInvestment = Math.floor(maxInvestmentLimit / entryPrice);

  // Ensure minimum volume is at least 1 and maximum is realistic
  const safeMinVolume = Math.max(1, minVolume);
  const safeMaxVolume = Math.max(
    safeMinVolume + 1,
    Math.min(maxVolume, maxVolumeByInvestment)
  );
  const safeRecommendedVolume = Math.max(
    safeMinVolume,
    Math.min(recommendedVolume, safeMaxVolume, maxVolumeByInvestment)
  );

  // Calculate position size percentage
  const positionValue = safeRecommendedVolume * entryPrice;
  const positionSizePercent = (positionValue / baseAccountSize) * 100;

  // Generate volume range text for different account sizes
  const volumeRanges = accountSizes.map((accountSize) => {
    const riskAmount = (accountSize * riskProfile.recommended) / 100;
    const volume = Math.max(1, Math.floor(riskAmount / riskPerShare));
    const investment = volume * entryPrice;

    if (accountSize >= 100000) {
      return `₹${(accountSize / 1000).toFixed(0)}K → ${volume} shares (₹${(
        investment / 1000
      ).toFixed(0)}K)`;
    } else {
      return `₹${(accountSize / 1000).toFixed(
        0
      )}K → ${volume} shares (₹${investment.toFixed(0)})`;
    }
  });

  const volumeRangeText = volumeRanges.join(", ");

  return {
    minVolume: safeMinVolume,
    maxVolume: safeMaxVolume,
    recommendedVolume: safeRecommendedVolume,
    positionSizePercent: positionSizePercent,
    volumeRangeText,
  };
}

// Enhanced OpenAI signal generation
async function getAdvancedOpenAISignal(
  indicators: AdvancedTechnicalIndicators
): Promise<{
  signal: string;
  opinion: string;
  direction: string;
  buyPrice: number;
  targetPrice: number;
  stopLoss: number;
  tradingPlan: string;
  volumeRange: {
    minVolume: number;
    maxVolume: number;
    recommendedVolume: number;
    positionSizePercent: number;
    volumeRangeText: string;
  };
}> {
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY not found in environment variables");
      throw new Error(
        "OpenAI API key not configured. Please add your OpenAI API key to environment variables to enable AI-powered trading signals."
      );
    }

    const prompt = `Analyze this stock setup for intraday trading and provide a comprehensive trading plan.

MARKET DATA:
Symbol: ${indicators.symbol}
Current Price: ₹${indicators.price.toFixed(2)}
VWAP: ₹${indicators.vwap.toFixed(2)}
RSI(14): ${indicators.rsi_14.toFixed(2)}
SMA(20): ₹${indicators.sma_20.toFixed(2)}
EMA(9): ₹${indicators.ema_9.toFixed(2)}
ATR(14): ${indicators.atr_14.toFixed(2)}
Volume Spike: ${indicators.volume_spike}
Trend Alignment: ${indicators.trend_alignment}
Day High Breakout: ${indicators.breakout_day_high}
Prev Day Range Breakout: ${indicators.breakout_prev_day_range}
Opening Range Breakout: ${indicators.opening_range_breakout}
Clean Setup: ${indicators.clean_setup}
Intraday Score: ${indicators.intraday_score}/10

INSTRUCTIONS:
1. Determine if this is a LONG (buy) or SHORT (sell) setup based on technical indicators
2. Provide signal strength: strong/caution/neutral/risk
3. Calculate entry, target, and stop loss prices using ATR and technical levels
4. Calculate recommended volume/position size based on risk management
5. Generate a comprehensive trading plan with bullet points including volume recommendations

CRITICAL: You MUST respond with ONLY a valid JSON object in this exact format:

{
  "direction": "LONG",
  "signal": "strong",
  "explanation": "Brief explanation of why this direction was chosen based on key technical indicators",
  "entry_price": 123.45,
  "target_price": 130.50,
  "stop_loss": 118.20,
  "trading_plan": "Market timing advice\\n\\n• DIRECTION: LONG - Buy position\\n\\n• ENTRY: Buy at ₹123.45 - explanation\\n\\n• TARGET: Sell at ₹130.50 - Potential gain: X.X%\\n\\n• STOP LOSS: Exit at ₹118.20 - Risk: X.X%\\n\\n• VOLUME: Recommended 50-150 shares (₹75K-₹225K investment)\\n\\n• STRATEGY: Risk management and timing advice"
}

GUIDELINES:
- direction: Must be "LONG" or "SHORT"
- signal: Must be "strong", "caution", "neutral", or "risk"
- explanation: 1-2 sentences explaining the direction choice
- entry_price: Numeric value (no currency symbol)
- target_price: Numeric value based on ATR calculations
- stop_loss: Numeric value for risk management
- trading_plan: Formatted string with \\n for line breaks and bullet points
- Use ATR for targets: LONG (TARGET = ENTRY + 1-1.5×ATR), SHORT (TARGET = ENTRY - 1-1.5×ATR)
- Round all prices to nearest ₹0.10
- Include percentage calculations in trading_plan`;

    const requestPayload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are a professional intraday trader and technical analyst. Your job is to analyze stock indicators and return a trading recommendation in strict JSON format.

CRITICAL REQUIREMENTS:
1. You MUST respond with ONLY a valid JSON object - no other text before or after
2. Decide if the setup is LONG (buy) or SHORT (sell)
3. Use ATR-based calculations for realistic targets and stops
4. Ensure all prices are logical and consistent
5. Include bullet-point trading plan with proper \\n line breaks

JSON RESPONSE FORMAT (MANDATORY):
{
  "direction": "LONG" or "SHORT",
  "signal": "strong" or "caution" or "neutral" or "risk",
  "explanation": "Brief technical reasoning",
  "entry_price": numeric_value,
  "target_price": numeric_value,
  "stop_loss": numeric_value,
  "trading_plan": "Formatted string with \\n breaks and bullet points"
}

If no clear setup exists, return:
{
  "direction": "LONG",
  "signal": "risk",
  "explanation": "No clear setup based on current technicals. Best to stay out.",
  "entry_price": current_price,
  "target_price": current_price * 1.01,
  "stop_loss": current_price * 0.99,
  "trading_plan": "• DIRECTION: NEUTRAL\\n\\n• ENTRY: Wait for better setup\\n\\n• STRATEGY: Avoid trading in unclear conditions"
}`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    };

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      requestPayload,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000, // 15 second timeout
      }
    );

    // Check response structure
    if (!response.data) {
      throw new Error("No response data from OpenAI");
    }

    if (!response.data.choices) {
      throw new Error("No choices in OpenAI response");
    }

    if (!response.data.choices[0]) {
      throw new Error("No first choice in OpenAI response");
    }

    const choice = response.data.choices[0];
    const content = choice?.message?.content || "";

    if (!content) {
      throw new Error("No content in OpenAI response message");
    }

    // Parse JSON response

    let direction = "LONG";
    let signal = "neutral";
    let explanation = "Technical analysis suggests neutral position.";
    let entryPrice = indicators.price * 0.98;
    let targetPrice = indicators.price * 1.05;
    let stopLoss = indicators.price * 0.95;
    let tradingPlan = "";

    try {
      // Clean the content to extract JSON
      let jsonContent = content.trim();

      // Remove any markdown formatting if present
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent
          .replace(/```json\s*/, "")
          .replace(/```\s*$/, "");
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.replace(/```\s*/, "").replace(/```\s*$/, "");
      }

      const parsedResponse = JSON.parse(jsonContent);

      // Extract values from JSON
      if (
        parsedResponse.direction &&
        (parsedResponse.direction === "LONG" ||
          parsedResponse.direction === "SHORT")
      ) {
        direction = parsedResponse.direction;
      }

      if (
        parsedResponse.signal &&
        ["strong", "caution", "neutral", "risk"].includes(parsedResponse.signal)
      ) {
        signal = parsedResponse.signal;
      }

      if (
        parsedResponse.explanation &&
        typeof parsedResponse.explanation === "string"
      ) {
        explanation = parsedResponse.explanation;
      }

      if (
        parsedResponse.entry_price &&
        typeof parsedResponse.entry_price === "number" &&
        parsedResponse.entry_price > 0
      ) {
        entryPrice = parsedResponse.entry_price;
      }

      if (
        parsedResponse.target_price &&
        typeof parsedResponse.target_price === "number" &&
        parsedResponse.target_price > 0
      ) {
        targetPrice = parsedResponse.target_price;
      }

      if (
        parsedResponse.stop_loss &&
        typeof parsedResponse.stop_loss === "number" &&
        parsedResponse.stop_loss > 0
      ) {
        stopLoss = parsedResponse.stop_loss;
      }

      if (
        parsedResponse.trading_plan &&
        typeof parsedResponse.trading_plan === "string"
      ) {
        tradingPlan = parsedResponse.trading_plan;
      }
    } catch (parseError) {
      console.error("Failed to parse JSON response:", parseError);

      // Fallback to simple text parsing if JSON fails
      const lines = content.trim().split("\n");
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.includes("LONG")) direction = "LONG";
        else if (trimmedLine.includes("SHORT")) direction = "SHORT";

        if (trimmedLine.includes("strong")) signal = "strong";
        else if (trimmedLine.includes("caution")) signal = "caution";
        else if (trimmedLine.includes("risk")) signal = "risk";
      }
    }

    // Use parsed trading plan or generate consistent one
    let finalTradingPlan = tradingPlan;

    if (!tradingPlan || tradingPlan.trim().length === 0) {
      // Generate consistent trading plan if not provided or empty
      const timingAdvice = getTimingAdvice();
      const isLong = direction === "LONG";
      const gainPercent = isLong
        ? (((targetPrice - entryPrice) / entryPrice) * 100).toFixed(1)
        : (((entryPrice - targetPrice) / entryPrice) * 100).toFixed(1);
      const riskPercent = isLong
        ? (((entryPrice - stopLoss) / entryPrice) * 100).toFixed(1)
        : (((stopLoss - entryPrice) / entryPrice) * 100).toFixed(1);

      // Calculate volume for fallback plan
      const fallbackVolumeRange = calculateVolumeRange(
        entryPrice,
        stopLoss,
        signal
      );

      finalTradingPlan = `${timingAdvice}

• DIRECTION: ${direction} - ${isLong ? "Buy" : "Sell Short"}

• ENTRY: ${isLong ? "Buy" : "Sell"} at ₹${entryPrice.toFixed(
        2
      )} - ${explanation}

• TARGET: ${isLong ? "Sell" : "Cover"} at ₹${targetPrice.toFixed(
        2
      )} - Potential gain: ${gainPercent}%

• STOP LOSS: Exit at ₹${stopLoss.toFixed(
        2
      )} if trade goes wrong - Risk: ${riskPercent}%

• VOLUME: Recommended ${fallbackVolumeRange.recommendedVolume} shares (Range: ${
        fallbackVolumeRange.minVolume
      }-${fallbackVolumeRange.maxVolume} shares)
  Investment: ₹${(
    (fallbackVolumeRange.recommendedVolume * entryPrice) /
    1000
  ).toFixed(0)}K | Risk: ₹${(
        (fallbackVolumeRange.recommendedVolume *
          Math.abs(entryPrice - stopLoss)) /
        1000
      ).toFixed(1)}K

• STRATEGY: ${
        signal === "strong"
          ? "Strong intraday setup - risk 1% of capital, max ₹50K investment"
          : signal === "caution"
          ? "Moderate setup - risk 0.5% of capital, max ₹30K investment"
          : signal === "risk"
          ? "High risk - risk only 0.2% of capital, max ₹15K investment"
          : "Neutral setup - risk 0.3% of capital, max ₹25K investment"
      }. Intraday trading requires strict discipline and quick exits.`;
    }

    // Calculate volume range based on the trading parameters
    const volumeRange = calculateVolumeRange(entryPrice, stopLoss, signal);

    const result = {
      signal: signal as "strong" | "caution" | "neutral" | "risk",
      opinion: explanation,
      direction,
      buyPrice: entryPrice, // Keep buyPrice for backward compatibility
      targetPrice,
      stopLoss,
      tradingPlan: finalTradingPlan,
      volumeRange,
    };

    return result;
  } catch (error) {
    // Enhanced error logging
    console.error("OpenAI API error for", indicators.symbol, ":");
    console.error(
      "Error type:",
      error instanceof Error ? error.constructor.name : typeof error
    );
    console.error(
      "Error message:",
      error instanceof Error ? error.message : String(error)
    );
    console.error("Full error:", error);

    // Check if it's an axios error with response
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as {
        response: { status: number; headers: unknown; data: unknown };
      };
      console.error("Error response status:", axiosError.response.status);
      console.error("Error response headers:", axiosError.response.headers);
      console.error("Error response data:", axiosError.response.data);
    }

    // Re-throw the error instead of using fallback logic
    if (error && typeof error === "object" && "response" in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        throw new Error(
          "OpenAI API authentication failed. Please check your API key."
        );
      } else if (axiosError.response?.status === 429) {
        throw new Error(
          "OpenAI API rate limit exceeded. Please try again later."
        );
      } else if (axiosError.response?.status === 402) {
        throw new Error(
          "OpenAI API quota exceeded. Please check your billing settings."
        );
      }
    }

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ECONNABORTED"
    ) {
      throw new Error("OpenAI API request timeout. Please try again.");
    }

    if (error instanceof Error && error.message.includes("OPENAI_API_KEY")) {
      throw error; // Re-throw API key configuration errors
    }

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`OpenAI API failed: ${errorMessage}`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { stockId, sessionId } = await request.json();

    if (!stockId) {
      return NextResponse.json(
        { error: "Stock ID is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Get stock details with session information
    const { data: stock, error: stockError } = await supabase
      .from("stocks")
      .select(
        `
        *,
        session:sessions(
          id,
          session_date,
          title,
          description
        )
      `
      )
      .eq("id", stockId)
      .single();

    if (stockError || !stock) {
      console.error("Stock fetch error:", stockError);
      return NextResponse.json(
        {
          error:
            "Stock not found. Please ensure the stock exists in the current session.",
        },
        { status: 404 }
      );
    }

    // Validate that the stock has a valid session
    if (!stock.session) {
      console.error("Stock has no associated session:", stock);
      return NextResponse.json(
        {
          error: "Stock session not found. Please refresh and try again.",
        },
        { status: 400 }
      );
    }

    // Validate that the stock belongs to the specified session
    if (stock.session_id !== sessionId) {
      console.error(
        `Stock ${stock.id} belongs to session ${stock.session_id}, but request is for session ${sessionId}`
      );
      return NextResponse.json(
        {
          error:
            "Stock does not belong to the specified session. Please refresh and try again.",
        },
        { status: 400 }
      );
    }

    // Check if we need to refresh data based on database cache
    const needsRefresh = await shouldRefreshData(stock.symbol, stockId);

    if (!needsRefresh) {
      // Return the most recent cached signal
      const { data: signals, error: signalError } = await supabase
        .from("signals")
        .select("*")
        .eq("stock_id", stockId)
        .eq("symbol", stock.symbol.toUpperCase())
        .order("created_at", { ascending: false })
        .limit(1);

      if (!signalError && signals && signals.length > 0) {
        const cachedSignal = signals[0];
        const cacheAge = Math.round(
          (Date.now() - new Date(cachedSignal.created_at).getTime()) / 1000
        );
        console.log(
          `Returning cached analysis for ${stock.symbol} (age: ${cacheAge}s)`
        );

        // Add cache metadata to the signal object
        const signalWithCacheInfo = {
          ...cachedSignal,
          fromCache: true,
          cacheAge: cacheAge,
        };

        return NextResponse.json(signalWithCacheInfo);
      }
    }

    // Check if stock has instrument_key
    if (!stock.instrument_key) {
      console.error(`Stock ${stock.symbol} has no instrument_key`);
      return NextResponse.json(
        { error: "Stock instrument key not found. Please re-add the stock." },
        { status: 400 }
      );
    }

    // Fetch real market data using Upstox API
    let candles: UpstoxCandle[];
    try {
      candles = await fetchUpstoxCandles(stock.instrument_key);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch market data";
      console.error(
        `❌ Market data fetch failed for ${stock.symbol}:`,
        errorMessage
      );

      return NextResponse.json(
        {
          error: `Market data unavailable: ${errorMessage}`,
          alert:
            "Unable to fetch real-time market data. Please check your API configuration or try again later.",
          details: errorMessage,
        },
        { status: 503 }
      );
    }

    if (candles.length === 0) {
      return NextResponse.json(
        {
          error: "No market data available",
          alert:
            "No market data found for this stock. The market might be closed or the instrument might be invalid.",
        },
        { status: 400 }
      );
    }

    // Fetch daily historical data for 5-day volume analysis
    let dailyCandles: UpstoxCandle[] = [];
    let volume5DayMetrics = {
      volume_5day_avg: 0,
      volume_vs_5day_avg: 0,
      volume_trend_5day: "insufficient_data",
      volume_5day_high: 0,
      volume_5day_low: 0,
    };

    try {
      dailyCandles = await fetchUpstoxDailyCandles(stock.instrument_key);

      if (dailyCandles.length >= 5) {
        const dailyVolumes = dailyCandles.map((c: UpstoxCandle) => c.volume);
        volume5DayMetrics = calculate5DayVolumeMetrics(dailyVolumes);
        console.log(
          `📊 5-Day Volume Metrics: Avg=${volume5DayMetrics.volume_5day_avg.toLocaleString()}, Current vs Avg=${
            volume5DayMetrics.volume_vs_5day_avg
          }%, Trend=${volume5DayMetrics.volume_trend_5day}`
        );
      } else {
        console.log(
          `⚠️ 5-Day Volume: Insufficient data (${dailyCandles.length} days)`
        );
      }
    } catch (error) {
      console.error(`❌ 5-Day Volume: Failed to fetch data:`, error);
      // Continue with analysis even if daily data fails
    }

    // Calculate all advanced technical indicators
    const prices = candles.map((c: UpstoxCandle) => c.close);
    const volumes = candles.map((c: UpstoxCandle) => c.volume);
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

    // Calculate intraday volume statistics
    const intradayVolumeStats = calculateIntradayVolumeStats(volumes);
    console.log(
      `📊 Intraday Volume Stats: Avg=${intradayVolumeStats.volume_avg_intraday.toLocaleString()}, Max=${intradayVolumeStats.volume_max_intraday.toLocaleString()}, Median=${intradayVolumeStats.volume_median_intraday.toLocaleString()}, Total=${intradayVolumeStats.volume_total_intraday.toLocaleString()}, Candles=${
        intradayVolumeStats.volume_candle_count
      }`
    );

    // Volume comparison: Daily vs Intraday
    const totalIntradayVolume = volumes.reduce((sum, vol) => sum + vol, 0);
    const avgDailyVolume = volume5DayMetrics.volume_5day_avg;
    if (avgDailyVolume > 0) {
      console.log(
        `📊 Volume Comparison: Today's intraday total=${totalIntradayVolume.toLocaleString()}, 5-day daily avg=${avgDailyVolume.toLocaleString()}`
      );
      console.log(
        `📊 Volume Scale: Current minute=${currentVolume.toLocaleString()}, vs typical daily=${avgDailyVolume.toLocaleString()} (${Math.round(
          avgDailyVolume / currentVolume
        )}x larger)`
      );
    }

    const vwap = calculateVWAP(candles);
    const rsi_14 = calculateRSI(prices, 14);
    const sma_20 = calculateSMA(prices, 20);
    const ema_9 = calculateEMA(prices, 9);
    const atr_14 = calculateATR(candles, 14);
    const volume_spike = checkVolumeSpike(volumes);
    const trend_alignment = determineTrendAlignment(currentPrice, ema_9, vwap);
    const breakouts = checkBreakouts(candles);

    const indicators: AdvancedTechnicalIndicators = {
      symbol: stock.symbol,
      timestamp: new Date().toISOString(),
      price: currentPrice,
      vwap,
      rsi_14,
      sma_20,
      ema_9,
      atr_14,
      volume_spike,
      trend_alignment,
      ...breakouts,
      clean_setup: false, // Will be calculated
      intraday_score: 0, // Will be calculated
    };

    // Evaluate clean setup and calculate score
    indicators.clean_setup = evaluateCleanSetup(indicators);
    indicators.intraday_score = calculateIntradayScore(indicators);

    // Get AI signal with trading plan
    let signal,
      opinion,
      direction,
      buyPrice,
      targetPrice,
      stopLoss,
      tradingPlan,
      volumeRange;
    try {
      const aiSignal = await getAdvancedOpenAISignal(indicators);
      signal = aiSignal.signal;
      opinion = aiSignal.opinion;
      direction = aiSignal.direction;
      buyPrice = aiSignal.buyPrice;
      targetPrice = aiSignal.targetPrice;
      stopLoss = aiSignal.stopLoss;
      tradingPlan = aiSignal.tradingPlan;
      volumeRange = aiSignal.volumeRange;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "AI signal generation failed";
      console.error(
        `❌ AI signal generation failed for ${stock.symbol}:`,
        errorMessage
      );

      return NextResponse.json(
        {
          error: `AI analysis unavailable: ${errorMessage}`,
          alert:
            "Unable to generate AI-powered trading signals. Please check your OpenAI API configuration.",
          details: errorMessage,
        },
        { status: 503 }
      );
    }

    // Prepare the base signal data
    const baseSignalData = {
      stock_id: stockId,
      symbol: stock.symbol,
      timestamp: indicators.timestamp,
      price: indicators.price,

      // Old column names (for backward compatibility)
      rsi: indicators.rsi_14,
      vwap: indicators.vwap,
      sma: indicators.sma_20,
      volume_spike: indicators.volume_spike,
      trend: indicators.trend_alignment,

      // New column names
      rsi_14: indicators.rsi_14,
      sma_20: indicators.sma_20,
      ema_9: indicators.ema_9,
      atr_14: indicators.atr_14,
      volume: currentVolume,
      trend_alignment: indicators.trend_alignment,
      breakout_day_high: indicators.breakout_day_high,
      breakout_prev_day_range: indicators.breakout_prev_day_range,
      opening_range_breakout: indicators.opening_range_breakout,
      clean_setup: indicators.clean_setup,
      intraday_score: indicators.intraday_score,

      signal,
      llm_opinion: opinion,

      // Trading Plan
      direction: direction,
      buy_price: buyPrice,
      target_price: targetPrice,
      stop_loss: stopLoss,
      trading_plan: tradingPlan,

      // Volume Range Recommendations
      min_volume: volumeRange.minVolume,
      max_volume: volumeRange.maxVolume,
      recommended_volume: volumeRange.recommendedVolume,
      position_size_percent: volumeRange.positionSizePercent,
      volume_range_text: volumeRange.volumeRangeText,
    };

    // Try to save with 5-day volume data, fallback if columns don't exist
    let signalData, signalError;

    // First attempt: try with 5-day volume data and intraday stats
    try {
      const signalDataWithVolume = {
        ...baseSignalData,
        volume_5day_avg: volume5DayMetrics.volume_5day_avg,
        volume_vs_5day_avg: volume5DayMetrics.volume_vs_5day_avg,
        volume_trend_5day: volume5DayMetrics.volume_trend_5day,
        volume_5day_high: volume5DayMetrics.volume_5day_high,
        volume_5day_low: volume5DayMetrics.volume_5day_low,
        volume_avg_intraday: intradayVolumeStats.volume_avg_intraday,
        volume_max_intraday: intradayVolumeStats.volume_max_intraday,
        volume_median_intraday: intradayVolumeStats.volume_median_intraday,
        volume_total_intraday: intradayVolumeStats.volume_total_intraday,
        volume_candle_count: intradayVolumeStats.volume_candle_count,
      };

      const result = await supabase
        .from("signals")
        .insert([signalDataWithVolume])
        .select(
          `
          *,
          stock:stocks(*)
        `
        )
        .single();

      signalData = result.data;
      signalError = result.error;

      if (!signalError) {
        console.log(
          "✅ Volume Data: Saved 5-day and intraday statistics to database"
        );
      }
    } catch (error) {
      console.log("⚠️ Volume Data: New columns not found, using fallback");
      signalError = error;
    }

    // Fallback: save without 5-day volume data if first attempt failed
    if (signalError) {
      const result = await supabase
        .from("signals")
        .insert([baseSignalData])
        .select(
          `
          *,
          stock:stocks(*)
        `
        )
        .single();

      signalData = result.data;
      signalError = result.error;
    }

    if (signalError) {
      console.error("Database error:", signalError);
      return NextResponse.json(
        { error: "Failed to save analysis" },
        { status: 500 }
      );
    }

    return NextResponse.json(signalData);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}
