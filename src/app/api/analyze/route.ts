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

// Twelvedata interface
interface TwelvedataCandle {
  datetime: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

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
      console.log(`No existing data for ${symbol}, refresh needed`);
      return true;
    }

    const latestSignal = signals[0];
    const signalAge = Date.now() - new Date(latestSignal.created_at).getTime();

    const shouldRefresh = signalAge > CACHE_DURATION_MS;
    console.log(
      `${symbol} data age: ${Math.round(
        signalAge / 1000
      )}s, cache duration: ${Math.round(
        CACHE_DURATION_MS / 1000
      )}s, refresh needed: ${shouldRefresh}`
    );

    return shouldRefresh;
  } catch (error) {
    console.error(`Error checking refresh status for ${symbol}:`, error);
    return true; // Default to refresh on error
  }
}

// Twelvedata data fetching (primary source)
async function fetchTwelvedataCandles(symbol: string): Promise<UpstoxCandle[]> {
  try {
    const apiKey = process.env.TWELVEDATA_API_KEY;
    console.log(`Twelvedata API key status: ${apiKey ? "Found" : "Not found"}`);
    console.log(`API key length: ${apiKey ? apiKey.length : 0}`);

    if (!apiKey) {
      console.log("Twelvedata API key not found, using mock data");
      console.log(
        "Available env keys:",
        Object.keys(process.env).filter((key) => key.includes("TWELVE"))
      );
      return generateAdvancedMockCandles(symbol);
    }

    console.log(`Attempting to fetch data from Twelvedata for ${symbol}`);

    // Fetch 1-minute data using plain symbol with exchange parameter
    const response = await axios.get(`https://api.twelvedata.com/time_series`, {
      params: {
        symbol: symbol,
        interval: "1min",
        outputsize: 200, // Get 200 data points (about 3+ hours)
        apikey: apiKey,
        format: "JSON",
      },
      timeout: 15000,
    });

    console.log(`Twelvedata response status:`, response.data.status);
    console.log(`Twelvedata response keys:`, Object.keys(response.data));

    if (
      response.data.status === "error" ||
      !response.data.values ||
      response.data.values.length === 0
    ) {
      console.log("Twelvedata API: No valid data found, using mock data");
      console.log("Response data:", response.data);
      return generateAdvancedMockCandles(symbol);
    }

    console.log(
      `Successfully fetched ${response.data.values.length} data points from Twelvedata for ${symbol}`
    );

    // Convert Twelvedata format to our standard format
    const candles: UpstoxCandle[] = response.data.values.map(
      (candle: TwelvedataCandle) => ({
        timestamp: candle.datetime,
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseInt(candle.volume) || 0,
      })
    );

    // Sort by timestamp (oldest first)
    candles.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    console.log(
      `Fetched ${candles.length} candles from Twelvedata for ${symbol}`
    );

    return candles;
  } catch (error) {
    console.log("Twelvedata API error, using mock data:", error);
    return generateAdvancedMockCandles(symbol);
  }
}

// Note: Upstox API removed - using Twelvedata as primary source with mock data fallback

// Generate realistic mock data for comprehensive analysis
function generateAdvancedMockCandles(symbol: string): UpstoxCandle[] {
  const candles: UpstoxCandle[] = [];
  let basePrice = 100 + Math.random() * 500;

  // Add some symbol-specific price ranges
  const symbolPrices: { [key: string]: number } = {
    RELIANCE: 2500,
    INFY: 1800,
    TCS: 3500,
    HDFC: 1600,
    ICICI: 1200,
  };

  basePrice = symbolPrices[symbol] || basePrice;

  // Generate 200 candles (about 3+ hours of 1-minute data)
  for (let i = 0; i < 200; i++) {
    const volatility = 0.002 + Math.random() * 0.003; // 0.2% to 0.5% volatility
    const change = (Math.random() - 0.5) * basePrice * volatility;

    const open = basePrice;
    const close = basePrice + change;
    const high =
      Math.max(open, close) + Math.random() * basePrice * volatility * 0.5;
    const low =
      Math.min(open, close) - Math.random() * basePrice * volatility * 0.5;

    // More realistic volume patterns
    const baseVolume = 50000 + Math.random() * 100000;
    const volumeMultiplier =
      Math.random() < 0.1 ? 2 + Math.random() * 3 : 0.5 + Math.random() * 1.5;
    const volume = Math.floor(baseVolume * volumeMultiplier);

    candles.push({
      timestamp: new Date(Date.now() - (200 - i) * 60000).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    });

    basePrice = close;
  }

  return candles;
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
}> {
  try {
    // Check if OpenAI API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    console.log(`OpenAI API key status: ${apiKey ? "Found" : "Not found"}`);
    console.log(`OpenAI API key length: ${apiKey ? apiKey.length : 0}`);

    if (!apiKey) {
      console.log("OpenAI API key not found, using fallback logic");
      throw new Error("OpenAI API key not configured");
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
4. Generate a comprehensive trading plan with bullet points

CRITICAL: You MUST respond with ONLY a valid JSON object in this exact format:

{
  "direction": "LONG",
  "signal": "strong",
  "explanation": "Brief explanation of why this direction was chosen based on key technical indicators",
  "entry_price": 123.45,
  "target_price": 130.50,
  "stop_loss": 118.20,
  "trading_plan": "Market timing advice\\n\\n• DIRECTION: LONG - Buy position\\n\\n• ENTRY: Buy at ₹123.45 - explanation\\n\\n• TARGET: Sell at ₹130.50 - Potential gain: X.X%\\n\\n• STOP LOSS: Exit at ₹118.20 - Risk: X.X%\\n\\n• STRATEGY: Position size and risk management advice"
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

    console.log(`Making OpenAI API request for ${indicators.symbol}`);
    console.log(`Prompt length: ${prompt.length} characters`);

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

    console.log(
      `OpenAI request payload:`,
      JSON.stringify(requestPayload, null, 2)
    );

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

    console.log(`OpenAI API response received for ${indicators.symbol}`);
    console.log(`Response status: ${response.status}`);
    console.log(`Response headers:`, response.headers);
    console.log(`Full response data:`, JSON.stringify(response.data, null, 2));

    // Check response structure
    if (!response.data) {
      console.error("No response data from OpenAI");
      throw new Error("No response data from OpenAI");
    }

    if (!response.data.choices) {
      console.error("No choices in OpenAI response:", response.data);
      throw new Error("No choices in OpenAI response");
    }

    if (!response.data.choices[0]) {
      console.error(
        "No first choice in OpenAI response:",
        response.data.choices
      );
      throw new Error("No first choice in OpenAI response");
    }

    const choice = response.data.choices[0];
    console.log(`First choice:`, JSON.stringify(choice, null, 2));

    const content = choice?.message?.content || "";
    console.log(`Extracted content: "${content}"`);
    console.log(`Content length: ${content.length}`);

    if (!content) {
      console.error("No content in OpenAI response message");
      throw new Error("No content in OpenAI response message");
    }

    // Parse JSON response
    console.log(`Raw OpenAI content: "${content}"`);

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

      console.log(`Cleaned JSON content: "${jsonContent}"`);

      const parsedResponse = JSON.parse(jsonContent);
      console.log(`Parsed JSON:`, parsedResponse);

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
      console.log("Falling back to default values and attempting text parsing");

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

    console.log(`Extracted direction: ${direction}`);
    console.log(`Extracted signal: ${signal}`);
    console.log(`Extracted explanation: ${explanation}`);
    console.log(`Extracted entry price: ${entryPrice}`);
    console.log(`Extracted target price: ${targetPrice}`);
    console.log(`Extracted stop loss: ${stopLoss}`);
    console.log(`Extracted trading plan: ${tradingPlan}`);

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

• STRATEGY: ${
        signal === "strong"
          ? "Strong setup - invest 2-3% of your money"
          : signal === "caution"
          ? "Moderate setup - invest 1-2% of your money"
          : signal === "risk"
          ? "High risk - only 0.5% of your money"
          : "Neutral - maximum 1% of your money"
      }. Trade with discipline and manage risk.`;
    }

    const result = {
      signal: signal as "strong" | "caution" | "neutral" | "risk",
      opinion: explanation,
      direction,
      buyPrice: entryPrice, // Keep buyPrice for backward compatibility
      targetPrice,
      stopLoss,
      tradingPlan: finalTradingPlan,
    };

    console.log(`OpenAI analysis complete for ${indicators.symbol}:`, result);

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

    console.log("Using advanced fallback logic due to OpenAI API error");

    // Advanced fallback logic with trading plan
    let signal = "neutral";
    let opinion = "Technical analysis suggests neutral position.";
    let buyPrice = indicators.price * 0.98;
    let targetPrice = indicators.price * 1.02;
    let stopLoss = indicators.price * 0.95;
    let tradingPlan = "Rule-based trading plan based on technical indicators.";

    const score = indicators.intraday_score;
    const alignment = indicators.trend_alignment;
    const rsi = indicators.rsi_14;
    const price = indicators.price;
    const timingAdvice = getTimingAdvice();

    if (score >= 8 && indicators.clean_setup && indicators.volume_spike) {
      signal = "strong";
      opinion = `Excellent setup with ${score}/10 score. ${alignment} trend with volume confirmation and clean breakout pattern.`;
      // For strong setups, buy near current price or slight pullback to VWAP
      buyPrice = Math.min(price, indicators.vwap + indicators.atr_14 * 0.5);
      targetPrice = price + indicators.atr_14 * 3; // 3x ATR target
      stopLoss = Math.max(price * 0.96, indicators.vwap - indicators.atr_14); // Below VWAP or 4% loss
      tradingPlan = `${timingAdvice} 
      
• DIRECTION: LONG - Buy position

• ENTRY: Enter at ₹${buyPrice.toFixed(
        2
      )} - this is near VWAP support (₹${indicators.vwap.toFixed(
        2
      )}). Buy when price shows strength with good volume.

• TARGET: Sell at ₹${targetPrice.toFixed(
        2
      )} - this is a technical target based on 3x ATR momentum. Potential gain: ${(
        ((targetPrice - price) / price) *
        100
      ).toFixed(1)}%.

• STOP LOSS: Exit at ₹${stopLoss.toFixed(
        2
      )} if trade goes wrong. This protects below VWAP support. Risk: ${(
        ((price - stopLoss) / price) *
        100
      ).toFixed(1)}%.

• STRATEGY: Strong setup - invest 2-3% of your money. Buy when volume increases. Sell half when you get good profits, hold rest for full target.`;
    } else if (
      score >= 6 &&
      (indicators.breakout_day_high || indicators.opening_range_breakout)
    ) {
      signal = "caution";
      opinion = `Good setup with ${score}/10 score. Breakout confirmed but watch for sustained momentum.`;
      // For caution setups, wait for slight pullback and conservative targets
      buyPrice = indicators.breakout_day_high ? price * 0.998 : indicators.vwap;
      targetPrice = price + indicators.atr_14 * 2; // 2x ATR target
      stopLoss = price - indicators.atr_14 * 1.5; // 1.5x ATR stop
      tradingPlan = `${timingAdvice}

• DIRECTION: LONG - Buy position

• ENTRY: Enter at ₹${buyPrice.toFixed(2)} - ${
        indicators.breakout_day_high
          ? "near current breakout level"
          : "at VWAP support (₹" + indicators.vwap.toFixed(2) + ")"
      }. Wait 5-10 minutes to confirm breakout.

• TARGET: Sell at ₹${targetPrice.toFixed(
        2
      )} - technical target based on 2x ATR. Potential gain: ${(
        ((targetPrice - price) / price) *
        100
      ).toFixed(1)}%.

• STOP LOSS: Exit at ₹${stopLoss.toFixed(2)} if it breaks down. Risk: ${(
        ((price - stopLoss) / price) *
        100
      ).toFixed(1)}%.

• STRATEGY: Moderate setup - invest 1-2% of your money. Be patient for right entry. Sell most shares at 3% profit, keep some for full target.`;
    } else if (rsi > 75 || rsi < 25) {
      signal = "risk";
      opinion = `Extreme RSI (${rsi.toFixed(
        1
      )}) suggests overbought/oversold conditions. High reversal risk.`;
      // For risk setups, wait for significant pullback
      buyPrice =
        rsi > 75
          ? indicators.vwap - indicators.atr_14 * 0.5
          : indicators.vwap + indicators.atr_14 * 0.5;
      targetPrice = price + indicators.atr_14 * 1; // Small 1x ATR target
      stopLoss = buyPrice - indicators.atr_14 * 2; // Wide 2x ATR stop
      tradingPlan = `${timingAdvice}

⚠️ HIGH RISK TRADE ⚠️

• DIRECTION: LONG - Buy position (high risk)

• ENTRY: DO NOT buy immediately! Wait for price to come down to ₹${buyPrice.toFixed(
        2
      )} - this is ${
        rsi > 75 ? "below VWAP" : "above VWAP"
      } (₹${indicators.vwap.toFixed(2)}). Stock is ${
        rsi > 75 ? "overbought" : "oversold"
      } (RSI: ${rsi.toFixed(1)}).

• TARGET: Sell at ₹${targetPrice.toFixed(
        2
      )} - conservative 1x ATR target. Potential gain: ${(
        ((targetPrice - price) / price) *
        100
      ).toFixed(1)}%.

• STOP LOSS: Exit at ₹${stopLoss.toFixed(
        2
      )} if it goes wrong. Wide 2x ATR stop for high volatility. Risk: ${(
        ((buyPrice - stopLoss) / buyPrice) *
        100
      ).toFixed(1)}%.

• STRATEGY: High risk - only 0.5% of your money. Wait 1-3 hours for better entry. Consider avoiding completely.`;
    } else if (score < 4 || !indicators.clean_setup) {
      signal = "neutral";
      opinion = `Mixed signals with ${score}/10 score. Lack of clear directional bias suggests waiting for better setup.`;
      // For neutral setups, wait for clear breakout levels
      buyPrice = indicators.vwap; // Wait for VWAP level
      targetPrice = price + indicators.atr_14 * 1.5; // 1.5x ATR target
      stopLoss = indicators.vwap - indicators.atr_14 * 1; // 1x ATR below VWAP
      tradingPlan = `${timingAdvice}

🤔 UNCLEAR SETUP - PROCEED WITH CAUTION

• DIRECTION: LONG - Buy position (uncertain)

• ENTRY: Wait! Don't buy at current price. Wait for VWAP level (₹${buyPrice.toFixed(
        2
      )}) first. Need clear direction - either break above ₹${(
        price * 1.02
      ).toFixed(2)} or fall below ₹${(price * 0.98).toFixed(2)}.

• TARGET: Conservative target at ₹${targetPrice.toFixed(
        2
      )} - 1.5x ATR based. Potential gain: ${(
        ((targetPrice - price) / price) *
        100
      ).toFixed(1)}%.

• STOP LOSS: Exit at ₹${stopLoss.toFixed(2)} - 1x ATR below VWAP. Risk: ${(
        ((indicators.vwap - stopLoss) / indicators.vwap) *
        100
      ).toFixed(1)}%.

• STRATEGY: Maximum 1% of money only. Wait 2-4 hours for clarity. Better to skip and wait for clearer opportunity.`;
    }

    return {
      signal: signal as "strong" | "caution" | "neutral" | "risk",
      opinion,
      direction: "LONG", // Default to LONG for fallback logic
      buyPrice,
      targetPrice,
      stopLoss,
      tradingPlan,
    };
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

    console.log(
      `Analyzing stock ${stock.symbol} (ID: ${stock.id}) for session ${stock.session.session_date}`
    );

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

    console.log(`Fetching fresh market data for ${stock.symbol}`);
    // Fetch optimized market data
    const candles = await fetchTwelvedataCandles(stock.symbol);

    if (candles.length === 0) {
      return NextResponse.json(
        { error: "No market data available" },
        { status: 400 }
      );
    }

    // Calculate all advanced technical indicators
    const prices = candles.map((c) => c.close);
    const volumes = candles.map((c) => c.volume);
    const currentPrice = prices[prices.length - 1];
    const currentVolume = volumes[volumes.length - 1];

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
    const {
      signal,
      opinion,
      direction,
      buyPrice,
      targetPrice,
      stopLoss,
      tradingPlan,
    } = await getAdvancedOpenAISignal(indicators);

    // Save comprehensive analysis to database
    const { data: signalData, error: signalError } = await supabase
      .from("signals")
      .insert([
        {
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
        },
      ])
      .select(
        `
        *,
        stock:stocks(*)
      `
      )
      .single();

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
