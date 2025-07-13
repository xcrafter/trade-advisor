import { NextRequest, NextResponse } from "next/server";
import { StockController } from "@/controllers/StockController";
import { UpstoxAPI } from "@/lib/upstox";
import {
  TechnicalAnalysis,
  DEFAULT_INDIAN_MARKET_CONFIG,
} from "@/lib/indicators";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client for auth with service role key
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
    const query = searchParams.get("q") || "";
    const limit = parseInt(searchParams.get("limit") || "10");

    if (!query.trim()) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const upstoxApi = UpstoxAPI.getInstance({
      apiKey: process.env.UPSTOX_API_KEY || "",
    });
    const technicalAnalysis = new TechnicalAnalysis(
      DEFAULT_INDIAN_MARKET_CONFIG
    );
    const stockController = new StockController(upstoxApi, technicalAnalysis);

    const searchResults = await stockController.searchAnalyzedStocks(
      query,
      user.id,
      limit
    );

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error("Error searching stock analyses:", error);
    return NextResponse.json(
      { error: "Failed to search stock analyses" },
      { status: 500 }
    );
  }
}
