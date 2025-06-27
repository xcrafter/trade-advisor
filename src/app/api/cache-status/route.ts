import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Get cache duration from environment variable (default to 300 seconds = 5 minutes)
const CACHE_DURATION_SECONDS = parseInt(
  process.env.CACHE_DURATION_SECONDS || "300"
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "clear") {
      // Clear old signals (older than cache duration)
      const cutoffTime = new Date(Date.now() - CACHE_DURATION_SECONDS * 1000);

      const { error } = await supabase
        .from("signals")
        .delete()
        .lt("created_at", cutoffTime.toISOString());

      if (error) {
        console.error("Cache clear error:", error);
        return NextResponse.json(
          { error: "Failed to clear cache" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Cache cleared successfully",
        clearedBefore: cutoffTime.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }

    // Get cache statistics
    const { data: recentSignals, error: recentError } = await supabase
      .from("signals")
      .select("symbol, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - CACHE_DURATION_SECONDS * 1000).toISOString()
      )
      .order("created_at", { ascending: false });

    const { data: totalSignals, error: totalError } = await supabase
      .from("signals")
      .select("id", { count: "exact" });

    if (recentError || totalError) {
      console.error("Cache status error:", recentError || totalError);
      return NextResponse.json(
        { error: "Failed to get cache status" },
        { status: 500 }
      );
    }

    // Group recent signals by symbol
    const symbolStats =
      recentSignals?.reduce(
        (
          acc: Record<string, { count: number; lastUpdated: string }>,
          signal
        ) => {
          if (!acc[signal.symbol]) {
            acc[signal.symbol] = { count: 0, lastUpdated: signal.created_at };
          }
          acc[signal.symbol].count++;
          if (
            new Date(signal.created_at) >
            new Date(acc[signal.symbol].lastUpdated)
          ) {
            acc[signal.symbol].lastUpdated = signal.created_at;
          }
          return acc;
        },
        {}
      ) || {};

    // Return comprehensive cache status
    return NextResponse.json({
      message: "Database-based cache is active",
      cacheDurationSeconds: CACHE_DURATION_SECONDS,
      cacheDurationMs: CACHE_DURATION_SECONDS * 1000,
      statistics: {
        totalSignalsInDatabase: totalSignals?.length || 0,
        recentSignals: recentSignals?.length || 0,
        uniqueSymbolsCached: Object.keys(symbolStats).length,
        symbolBreakdown: symbolStats,
      },
      info: `Cache checks database timestamps. Data older than ${CACHE_DURATION_SECONDS} seconds triggers fresh API calls.`,
      clearUrl: "/api/cache-status?action=clear",
      configNote:
        "Cache duration is configurable via CACHE_DURATION_SECONDS environment variable",
    });
  } catch (error) {
    console.error("Cache status error:", error);
    return NextResponse.json(
      { error: "Failed to get cache status" },
      { status: 500 }
    );
  }
}
