import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const { session_date, title, description } = await request.json();

    if (!session_date) {
      return NextResponse.json(
        { error: "Session date is required" },
        { status: 400 }
      );
    }

    // Check if session already exists for this date
    const { data: existingSession } = await supabase
      .from("sessions")
      .select("*")
      .eq("session_date", session_date)
      .single();

    if (existingSession) {
      return NextResponse.json(
        { error: "Session already exists for this date" },
        { status: 409 }
      );
    }

    // Create new session
    const { data, error } = await supabase
      .from("sessions")
      .insert([
        {
          session_date,
          title: title || `Trading Session - ${session_date}`,
          description,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json(
        { error: "Failed to create session" },
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
    const date = searchParams.get("date");

    if (date) {
      // Get specific session by date
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("session_date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found"
        console.error("Database error:", error);
        return NextResponse.json(
          { error: "Failed to fetch session" },
          { status: 500 }
        );
      }

      return NextResponse.json(data || null);
    } else {
      // Get all sessions
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("session_date", { ascending: false });

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          { error: "Failed to fetch sessions" },
          { status: 500 }
        );
      }

      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
