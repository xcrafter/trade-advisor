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

Focus on:
1. Trend alignment across multiple timeframes
2. Support/resistance levels and their strength
3. Volume confirmation of price moves
4. Momentum indicators alignment
5. Risk management based on ATR and volatility
6. Specific price targets based on technical levels
7. Position sizing based on volatility and setup quality

Provide a structured analysis with:
- Clear directional bias (LONG/SHORT/NEUTRAL)
- Specific entry price ranges
- Multiple price targets with technical justification
- Stop loss levels based on technical invalidation points
- Recommended holding period for the swing trade
- Position size recommendation (as % of portfolio)
- Key technical catalysts and risk factors

Remember this is for swing trading with typical holding periods of 1-4 weeks.

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
  "risk_factors": string
}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: `Analyze these technical indicators for a swing trade setup:\n${JSON.stringify(
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

      // Transform AI response into our AISignal format
      return {
        signal: aiResponse.signal,
        confidence_level: aiResponse.confidence_level,
        opinion: aiResponse.analysis || "",
        direction: aiResponse.direction,
        buyPrice: aiResponse.entry_price || indicators.price,
        targetPrice1: aiResponse.target_price_1 || indicators.price * 1.02, // 2% default target
        targetPrice2: aiResponse.target_price_2 || indicators.price * 1.05, // 5% default target
        stopLoss: aiResponse.stop_loss || indicators.price * 0.98, // 2% default stop
        holdingPeriod: aiResponse.holding_period || "2-4_weeks",
        positionSizePercent: aiResponse.position_size_percent || 5,
        riskRewardRatio: aiResponse.risk_reward_ratio || "1:2",
        tradingPlan: aiResponse.trading_plan || "Wait for better setup",
        swingScore: indicators.swing_score,
        keyCatalysts:
          aiResponse.key_catalysts || "Technical analysis based entry",
        riskFactors: aiResponse.risk_factors || "Market conditions uncertain",
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
