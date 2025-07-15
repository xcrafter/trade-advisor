import OpenAI from "openai";
import { type AISignal } from "@/types/signal";
import { type SwingTradingIndicators } from "@/types/signal";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "OpenAI API key is not configured. Please add OPENAI_API_KEY to your .env file."
      );
    }
    this.openai = new OpenAI({
      apiKey,
    });
  }

  /**
   * Get AI signal based on technical indicators for swing trading
   */
  async getAISignal(indicators: SwingTradingIndicators): Promise<AISignal> {
    try {
      if (!indicators) {
        throw new Error("No indicators provided for analysis");
      }

      const systemPrompt = `You are a professional swing trader specializing in technical analysis and price action. 
Your task is to analyze the provided technical indicators and market data to generate specific swing trading recommendations.

CRITICAL PRICE RULES:
1. Current Price:
   - All price targets MUST be based on the current price provided in the indicators
   - The current price is indicators.price - this is the absolute reference point
   - NEVER suggest prices that ignore the current market price

2. Entry Price (buy_price):
   - For LONG positions: Must be within -1% to +0.5% of current price
   - For SHORT positions: Must be within -0.5% to +1% of current price
   - NEVER suggest entry prices more than 1% away from current price

3. Target Prices:
   - Target 1: Must be 1.5-3% from entry for LONG, -1.5% to -3% for SHORT
   - Target 2: Must be 3-5% from entry for LONG, -3% to -5% for SHORT
   - NEVER suggest targets that are behind the current market price direction

4. Stop Loss:
   - Must be 1-1.5% away from entry in the opposite direction of the trade
   - For LONG: Stop loss below entry
   - For SHORT: Stop loss above entry

REMEMBER: 
- The current price (indicators.price) is your absolute reference point
- All price targets must be realistic relative to the current price
- The goal is swing trading with 2-5 day holding period
- Targets must be achievable within this timeframe

SWING TRADING EVALUATION FRAMEWORK:

1. STOCK FILTERING CRITERIA:
   - Liquidity: Ensure high average daily volume (>1M shares/day)
   - Volatility: Look for stocks with good daily price movement (ATR > 2% of price)
   - Price Range: Prefer stocks between ₹100 and ₹2000 for optimal swing trading

2. MARKET TREND ANALYSIS:
   - Check overall market trend using indices (Nifty 50, sectoral indices)
   - Evaluate breadth indicators (advance/decline ratio)
   - Ensure trading with the broader trend

3. TECHNICAL SETUP IDENTIFICATION:
   - Breakout Patterns: Cup & handle, flag, wedge, triangle
   - Pullbacks to Support: EMA support (20 EMA, 50 EMA), Fibonacci retracements
   - Volume Spike: Breakout with high volume = stronger confirmation

4. INDICATOR CONFIRMATION:
   - RSI: Buy when RSI is bouncing from 40–50 zone
   - MACD: Look for bullish crossover
   - Volume: Rising volume = institutional interest

5. RISK-REWARD EVALUATION:
   - Enter only if the trade offers at least 1:2 risk-reward ratio
   - Risk ₹10 to gain ₹20 minimum

6. ENTRY PRICE GUIDELINES:
   - Entry price must be within 1-2% of current price
   - For bullish setups: Entry slightly above support or at breakout level
   - For bearish setups: Entry slightly below resistance or at breakdown level
   - Use recent price action to identify precise entry levels
   - Consider volatility (ATR) when setting entry range

Focus on:
- Trend alignment across multiple timeframes
- Support/resistance levels and their strength
- Volume confirmation of price moves
- Momentum indicators alignment
- Risk management based on ATR and volatility
- Specific price targets based on technical levels
- Position sizing based on volatility and setup quality

Provide a structured analysis with:
- Clear directional bias (LONG/SHORT/NEUTRAL)
- Specific entry price ranges (must be near current price)
- Multiple price targets with technical justification
- Stop loss levels based on technical invalidation points
- Recommended holding period for the swing trade (2 days to 3 weeks)
- Position size recommendation (as % of portfolio)
- Key technical catalysts and risk factors
- Swing trading setup quality assessment

Remember this is for swing trading with typical holding periods of 2 days to 3 weeks.

Return your analysis in the following JSON format:
{
  "signal": "strong_buy" | "buy" | "hold" | "sell" | "strong_sell" | "neutral",
  "direction": "LONG" | "SHORT" | "NEUTRAL",
  "confidence_level": "very_high" | "high" | "moderate" | "low",
  "analysis": "Detailed analysis text...",
  "entry_price": number,
  "target_price_1": number,
  "target_price_2": number,
  "stop_loss": number,
  "holding_period": "1-2_weeks" | "2-4_weeks" | "1-2_months" | "2-3_months",
  "position_size_percent": number,
  "risk_reward_ratio": string,
  "trading_plan": string,
  "key_catalysts": string,
  "risk_factors": string,
  "swing_setup_quality": "excellent" | "good" | "fair" | "poor",
  "liquidity_check": "high" | "moderate" | "low",
  "volatility_check": "optimal" | "adequate" | "insufficient",
  "market_trend_alignment": "strong" | "moderate" | "weak" | "against_trend"
}
`;

      console.log("indicators", indicators);
      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Current Price: ₹${
              indicators.price
            }\n\nAnalyze these technical indicators for a swing trade setup:\n${JSON.stringify(
              {
                ...indicators,
                analysis_timestamp: new Date().toISOString(),
                analysis_type: "swing_trading",
              },
              null,
              2
            )}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      if (!response.choices[0]?.message?.content) {
        throw new Error("No response content from OpenAI");
      }

      const aiResponse = JSON.parse(response.choices[0].message.content);

      // Validate required fields
      if (
        !aiResponse.signal ||
        !aiResponse.direction ||
        !aiResponse.confidence_level
      ) {
        throw new Error("Invalid response format from OpenAI");
      }

      // Validate price targets
      const currentPrice = indicators.price;
      const direction = aiResponse.direction;
      let buyPrice = aiResponse.entry_price;
      let targetPrice1 = aiResponse.target_price_1;
      let targetPrice2 = aiResponse.target_price_2;
      let stopLoss = aiResponse.stop_loss;

      // Log prices for debugging
      console.log("Price Validation:", {
        currentPrice,
        suggestedBuyPrice: buyPrice,
        suggestedTarget1: targetPrice1,
        suggestedTarget2: targetPrice2,
        suggestedStopLoss: stopLoss,
      });

      // Enforce price rules based on direction
      if (direction === "LONG") {
        // Buy price must be within -1% to +0.5% of current price
        const minBuyPrice = currentPrice * 0.99;
        const maxBuyPrice = currentPrice * 1.005;
        buyPrice = Math.min(
          maxBuyPrice,
          Math.max(minBuyPrice, buyPrice || currentPrice)
        );

        // Targets must be 1.5-3% and 3-5% above buy price
        targetPrice1 = buyPrice * 1.02; // 2% target
        targetPrice2 = buyPrice * 1.04; // 4% target

        // Stop loss 1-1.5% below buy price
        stopLoss = buyPrice * 0.985; // 1.5% stop

        // Validate targets are above current price
        if (targetPrice1 <= currentPrice || targetPrice2 <= currentPrice) {
          console.warn("Adjusting LONG targets to be above current price");
          targetPrice1 = Math.max(targetPrice1, currentPrice * 1.02);
          targetPrice2 = Math.max(targetPrice2, currentPrice * 1.04);
        }
      } else if (direction === "SHORT") {
        // Short entry must be within -0.5% to +1% of current price
        const minBuyPrice = currentPrice * 0.995;
        const maxBuyPrice = currentPrice * 1.01;
        buyPrice = Math.min(
          maxBuyPrice,
          Math.max(minBuyPrice, buyPrice || currentPrice)
        );

        // Targets must be 1.5-3% and 3-5% below buy price
        targetPrice1 = buyPrice * 0.98; // 2% target
        targetPrice2 = buyPrice * 0.96; // 4% target

        // Stop loss 1-1.5% above buy price
        stopLoss = buyPrice * 1.015; // 1.5% stop

        // Validate targets are below current price
        if (targetPrice1 >= currentPrice || targetPrice2 >= currentPrice) {
          console.warn("Adjusting SHORT targets to be below current price");
          targetPrice1 = Math.min(targetPrice1, currentPrice * 0.98);
          targetPrice2 = Math.min(targetPrice2, currentPrice * 0.96);
        }
      } else {
        // For NEUTRAL signals, use current price
        buyPrice = currentPrice;
        targetPrice1 = currentPrice;
        targetPrice2 = currentPrice;
        stopLoss = currentPrice;
      }

      // Log adjusted prices for debugging
      console.log("Adjusted Prices:", {
        currentPrice,
        adjustedBuyPrice: buyPrice,
        adjustedTarget1: targetPrice1,
        adjustedTarget2: targetPrice2,
        adjustedStopLoss: stopLoss,
      });

      // Transform AI response into our AISignal format
      return {
        signal: aiResponse.signal || "neutral",
        direction: aiResponse.direction || "NEUTRAL",
        confidence_level: aiResponse.confidence_level || "low",
        llm_opinion: aiResponse.analysis || "",
        buy_price: buyPrice,
        target_price_1: targetPrice1,
        target_price_2: targetPrice2,
        stop_loss: stopLoss,
        holding_period: "1-2_weeks", // Default to shorter timeframe for swing trades
        position_size_percent: aiResponse.position_size_percent || 5,
        risk_reward_ratio: aiResponse.risk_reward_ratio || "1:2",
        trading_plan: aiResponse.trading_plan || "Wait for better setup",
        swing_score: indicators.swing_score,
        key_catalysts:
          aiResponse.key_catalysts || "Technical analysis based entry",
        risk_factors: aiResponse.risk_factors || "Market conditions uncertain",
        swing_setup_quality: aiResponse.swing_setup_quality || "fair",
        liquidity_check: aiResponse.liquidity_check || "moderate",
        volatility_check: aiResponse.volatility_check || "adequate",
        market_trend_alignment: aiResponse.market_trend_alignment || "moderate",
      };
    } catch (error) {
      console.error("Failed to get AI signal:", error);

      if (error instanceof Error) {
        if (error.message.includes("API key")) {
          throw new Error("OpenAI API key is invalid or not configured");
        }
        if (error.message.includes("rate limit")) {
          throw new Error(
            "OpenAI API rate limit exceeded. Please try again later"
          );
        }
        if (error.message.includes("Invalid response format")) {
          throw new Error("Failed to parse OpenAI response. Please try again");
        }
      }

      throw new Error(
        "Failed to get AI signal. Please check the console for details."
      );
    }
  }
}
