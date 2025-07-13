import { NextRequest, NextResponse } from "next/server";
import { StockController } from "@/controllers/StockController";
import { UpstoxAPI } from "@/lib/upstox";
import {
  TechnicalAnalysis,
  DEFAULT_INDIAN_MARKET_CONFIG,
} from "@/lib/indicators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "10");

    const upstoxApi = UpstoxAPI.getInstance({
      apiKey: process.env.UPSTOX_API_KEY || "",
    });
    const technicalAnalysis = new TechnicalAnalysis(
      DEFAULT_INDIAN_MARKET_CONFIG
    );
    const stockController = new StockController(upstoxApi, technicalAnalysis);

    const recentAnalyses = await stockController.getRecentAnalysis(limit);

    return NextResponse.json(recentAnalyses);
  } catch (error) {
    console.error("Error fetching recent analyses:", error);
    return NextResponse.json(
      { error: "Failed to fetch recent analyses" },
      { status: 500 }
    );
  }
}
