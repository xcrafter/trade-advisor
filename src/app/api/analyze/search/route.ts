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
