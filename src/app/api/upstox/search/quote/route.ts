import { NextRequest, NextResponse } from "next/server";
import { UpstoxAPI } from "@/lib/upstox";
import { createClient } from "@supabase/supabase-js";
import { StockAnalysisModel } from "@/models/StockAnalysisModel";

const upstoxApi = UpstoxAPI.getInstance({
  apiKey: process.env.UPSTOX_API_KEY!,
});

// Initialize Supabase client for auth
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET(request: NextRequest) {
  try {
    // Get user from auth header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Invalid authentication" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const instrumentKey = searchParams.get("instrumentKey");

    if (!instrumentKey) {
      return NextResponse.json(
        { error: "instrumentKey is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Quote request for ${instrumentKey}, user: ${user.id}`);

    const skipDays = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) || 0;
    if (skipDays > 0) {
      // Try to get price from existing analysis first to avoid extra API calls
      const existingAnalysis = await StockAnalysisModel.getByInstrumentKey(
        instrumentKey,
        user.id
      );

      if (
        existingAnalysis &&
        existingAnalysis.candles &&
        existingAnalysis.candles.length > 0
      ) {
        const lastCandle =
          existingAnalysis.candles[existingAnalysis.candles.length - 1];
        const previousCandle =
          existingAnalysis.candles[existingAnalysis.candles.length - 2];

        const currentPrice = lastCandle.close;
        const previousClose = previousCandle?.close || currentPrice;
        const change = currentPrice - previousClose;
        const changePercent = (change / previousClose) * 100;

        return NextResponse.json({
          ltp: currentPrice,
          change,
          changePercent,
          source: "cached_candles",
        });
      }

      // If no cached data, get historical data
      const candles = await upstoxApi.getLastTradingDaysData(instrumentKey);
      if (!candles || candles.length === 0) {
        throw new Error("No historical data available");
      }

      const currentPrice = candles[candles.length - 1].close;
      const previousClose = candles[candles.length - 2]?.close || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = (change / previousClose) * 100;

      return NextResponse.json({
        ltp: currentPrice,
        change,
        changePercent,
        source: "fresh_candles",
      });
    } else {
      // Get real-time quote only when not skipping days
      const quote = await upstoxApi.getMarketQuote(instrumentKey);
      return NextResponse.json({
        ltp: quote.ltp,
        change: quote.change,
        changePercent: quote.changePercent,
        source: "live_quote",
      });
    }
  } catch (error) {
    console.error("Quote fetch failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
