import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { symbol, sessionId, instrumentKey } = await request.json();

    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json(
        { error: "Symbol is required and must be a string" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    if (!instrumentKey || typeof instrumentKey !== "string") {
      return NextResponse.json(
        { error: "Instrument key is required and must be a string" },
        { status: 400 }
      );
    }

    // Check if stock already exists in this session
    const { data: existingStock } = await supabase
      .from("stocks")
      .select("*")
      .eq("session_id", sessionId)
      .eq("symbol", symbol.toUpperCase())
      .single();

    if (existingStock) {
      return NextResponse.json(
        { error: "Stock already exists in this session" },
        { status: 409 }
      );
    }

    // Extract exchange from instrument key (e.g., "NSE_EQ|INE002A01018" -> "NSE")
    const exchange =
      instrumentKey.split("|")[0]?.replace("_EQ", "") || "Unknown";

    // Insert new stock
    const { data, error } = await supabase
      .from("stocks")
      .insert([
        {
          session_id: sessionId,
          symbol: symbol.toUpperCase(),
          instrument_key: instrumentKey,
          exchange: exchange,
        },
      ])
      .select(
        `
        *,
        session:sessions(*)
      `
      )
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to add stock" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("stocks")
      .select(
        `
        *,
        session:sessions(*)
      `
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to fetch stocks" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get("stockId");
    const sessionId = searchParams.get("sessionId");

    if (!stockId) {
      return NextResponse.json(
        { error: "Stock ID is required" },
        { status: 400 }
      );
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // First, verify the stock exists and belongs to the specified session
    const { data: existingStock, error: fetchError } = await supabase
      .from("stocks")
      .select(
        `
        *,
        session:sessions(
          id,
          session_date,
          title
        )
      `
      )
      .eq("id", stockId)
      .single();

    if (fetchError || !existingStock) {
      return NextResponse.json(
        {
          error: "Stock not found",
        },
        { status: 404 }
      );
    }

    // Validate that the stock belongs to the specified session
    if (existingStock.session_id !== sessionId) {
      console.error(
        `Attempted to delete stock ${stockId} from session ${sessionId}, but it belongs to session ${existingStock.session_id}`
      );
      return NextResponse.json(
        {
          error: "Stock does not belong to the specified session",
        },
        { status: 403 }
      );
    }

    console.log(
      `Deleting stock ${existingStock.symbol} (ID: ${stockId}) from session ${sessionId}`
    );

    // Delete the stock (this will cascade delete related signals due to foreign key constraint)
    const { error: deleteError } = await supabase
      .from("stocks")
      .delete()
      .eq("id", stockId);

    if (deleteError) {
      console.error("Database error:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete stock" },
        { status: 500 }
      );
    }

    console.log(
      `Successfully deleted stock ${existingStock.symbol} from session ${sessionId}`
    );

    return NextResponse.json({
      message: "Stock deleted successfully",
      deletedStock: existingStock,
    });
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
