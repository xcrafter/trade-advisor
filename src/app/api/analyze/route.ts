import { NextRequest, NextResponse } from "next/server";
import { StockController } from "@/controllers/StockController";
import { StockAnalysisModel } from "@/models/StockAnalysisModel";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";
import { createClient } from "@supabase/supabase-js";

const upstoxApi = UpstoxAPI.getInstance({
  apiKey: process.env.UPSTOX_API_KEY!,
});

const technicalAnalysis = new TechnicalAnalysis();
const stockController = new StockController(upstoxApi, technicalAnalysis);

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
    const forceRefresh = searchParams.get("forceRefresh") === "true";

    if (!instrumentKey) {
      return NextResponse.json(
        { error: "instrumentKey is required" },
        { status: 400 }
      );
    }

    console.log(
      `[API] Analyze request for ${instrumentKey}, user: ${user.id}, forceRefresh: ${forceRefresh}`
    );
    console.log(`[API] Starting analysis for ${instrumentKey}`);

    const analysis = await stockController.analyzeStock(
      instrumentKey,
      user.id,
      forceRefresh
    );

    console.log(`[API] Analysis completed for ${analysis.symbol}`);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Delete request for ${symbol}, user: ${user.id}`);

    await StockAnalysisModel.deleteBySymbol(symbol, user.id);

    console.log(`[API] Successfully deleted analysis for ${symbol}`);
    return NextResponse.json({
      success: true,
      message: `Analysis for ${symbol} deleted successfully`,
    });
  } catch (error) {
    console.error("Delete failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
