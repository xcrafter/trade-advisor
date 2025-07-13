import { SupabaseService } from "../src/lib/supabase.js";

async function cleanInvalidAnalyses() {
  try {
    console.log("Starting cleanup of invalid stock analyses...");

    const supabase = SupabaseService.getInstance().getAdminClient();

    // Delete records where symbol is null or empty
    const { data: deletedRecords, error: deleteError } = await supabase
      .from("stock_analysis")
      .delete()
      .or("symbol.is.null,symbol.eq.")
      .select();

    if (deleteError) {
      console.error("Error deleting invalid records:", deleteError);
      return;
    }

    console.log(
      `Successfully deleted ${deletedRecords.length} invalid records`
    );
    console.log("Deleted records:", deletedRecords);
  } catch (error) {
    console.error("Cleanup failed:", error);
  }
}

// Run the cleanup
cleanInvalidAnalyses();
