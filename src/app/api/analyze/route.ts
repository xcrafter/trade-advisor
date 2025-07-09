import { NextRequest, NextResponse } from "next/server";
import { StockController } from "@/controllers/StockController";
import { StockAnalysisModel } from "@/models/StockAnalysisModel";
import { UpstoxAPI } from "@/lib/upstox";
import { TechnicalAnalysis } from "@/lib/indicators";

const upstoxApi = new UpstoxAPI({
  apiKey: process.env.UPSTOX_API_KEY!,
});

const technicalAnalysis = new TechnicalAnalysis();
const stockController = new StockController(upstoxApi, technicalAnalysis);

export async function GET(request: NextRequest) {
  try {
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
      `[API] Analyze request for ${instrumentKey}, forceRefresh: ${forceRefresh}`
    );
    console.log(`[API] Starting analysis for ${instrumentKey}`);

    const analysis = await stockController.analyzeStock(
      instrumentKey,
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
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get("symbol");

    if (!symbol) {
      return NextResponse.json(
        { error: "symbol is required" },
        { status: 400 }
      );
    }

    console.log(`[API] Delete request for ${symbol}`);

    await StockAnalysisModel.deleteBySymbol(symbol);

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
