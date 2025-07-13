import { NextRequest, NextResponse } from "next/server";
import { SupabaseService } from "@/lib/supabase";

export async function POST(request: NextRequest) {
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
    const supabase = SupabaseService.getInstance().getAdminClient();
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

    // Delete records where symbol is null or empty
    const { data: deletedRecords, error: deleteError } = await supabase
      .from("stock_analysis")
      .delete()
      .or("symbol.is.null,symbol.eq.")
      .eq("user_id", user.id)
      .select();

    if (deleteError) {
      console.error("Error deleting invalid records:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete invalid records" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: `Successfully deleted ${
        deletedRecords?.length || 0
      } invalid records`,
      deletedRecords,
    });
  } catch (error) {
    console.error("Cleanup failed:", error);
    return NextResponse.json(
      { error: "Failed to clean up invalid records" },
      { status: 500 }
    );
  }
}
