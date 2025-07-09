import { NextResponse } from "next/server";
import { StockController } from "@/controllers/StockController";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";

// Initialize dependencies
const upstoxApi = new UpstoxAPI({
  apiKey: process.env.UPSTOX_API_KEY || "",
});
const technicalAnalysis = new TechnicalAnalysis();
const stockController = new StockController(upstoxApi, technicalAnalysis);

export async function GET(request: Request) {
  try {
    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "10");
    const exchange = searchParams.get("exchange") || undefined;

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    // Delegate to controller
    const results = await stockController.searchStocks(query, limit, exchange);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json(
      { error: "Failed to search stocks" },
      { status: 500 }
    );
  }
}
