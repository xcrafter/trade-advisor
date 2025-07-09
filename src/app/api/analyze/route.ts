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

export async function POST(request: Request) {
  try {
    // Extract and validate request body
    const body = await request.json();
    const { instrumentKey } = body;

    if (!instrumentKey) {
      return NextResponse.json(
        { error: "instrumentKey is required" },
        { status: 400 }
      );
    }

    try {
      // Delegate to controller
      const analysis = await stockController.analyzeStock(instrumentKey);
      return NextResponse.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);

      // Handle specific errors
      if (error instanceof Error) {
        if (error.message === "Instrument not found") {
          return NextResponse.json(
            { error: "Instrument not found. Please select a valid stock." },
            { status: 404 }
          );
        }

        if (error.message.includes("DatabaseError")) {
          return NextResponse.json(
            { error: "Database operation failed. Please try again later." },
            { status: 500 }
          );
        }
      }

      // Generic error
      return NextResponse.json(
        { error: "Failed to analyze stock. Please try again later." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Request parsing error:", error);
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }
}
