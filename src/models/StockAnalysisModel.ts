import { SupabaseService } from "@/lib/supabase";
import { StockAnalysis } from "@/controllers/StockController";

export class StockAnalysisModel {
  /**
   * Save or update stock analysis in database
   */
  static async upsert(
    analysis: StockAnalysis,
    instrumentKey: string
  ): Promise<void> {
    const supabase = SupabaseService.getInstance().getClient();

    try {
      // Store the entire analysis as JSON - much simpler!
      // First try to update, if not found then insert
      const { data: existingData, error: selectError } = await supabase
        .from("stock_analysis")
        .select("id")
        .eq("instrument_key", instrumentKey)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        // PGRST116 means "no rows returned" which is expected for new records
        console.error("Error checking existing record:", selectError);
        throw new Error(`Database query failed: ${selectError.message}`);
      }

      let error;
      if (existingData) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("stock_analysis")
          .update({
            symbol: analysis.symbol,
            analysis_data: analysis,
            last_updated_at: new Date().toISOString(),
          })
          .eq("instrument_key", instrumentKey);
        error = updateError;
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("stock_analysis")
          .insert({
            instrument_key: instrumentKey,
            symbol: analysis.symbol,
            analysis_data: analysis,
            last_updated_at: new Date().toISOString(),
          });
        error = insertError;
      }

      if (error) {
        console.error("Error saving stock analysis:", error);
        throw new Error(`Failed to save stock analysis: ${error.message}`);
      }

      console.log(`Successfully saved analysis for ${analysis.symbol}`);
    } catch (error) {
      console.error("Database operation failed:", error);
      throw error;
    }
  }

  /**
   * Get stock analysis by symbol
   */
  static async getBySymbol(symbol: string): Promise<StockAnalysis | null> {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .eq("symbol", symbol)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // No data found
        }
        console.error("Error fetching stock analysis:", error);
        throw new Error(`Failed to fetch stock analysis: ${error.message}`);
      }

      return data.analysis_data as StockAnalysis;
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  /**
   * Get recent stock analyses
   */
  static async getRecent(limit: number = 10): Promise<StockAnalysis[]> {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .order("last_updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error fetching recent analyses:", error);
        throw new Error(`Failed to fetch recent analyses: ${error.message}`);
      }

      return data.map((row) => row.analysis_data as StockAnalysis);
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  /**
   * Search stock analyses by symbol
   */
  static async search(
    query: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .ilike("symbol", `%${query}%`)
        .order("last_updated_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.error("Error searching stock analyses:", error);
        throw new Error(`Failed to search stock analyses: ${error.message}`);
      }

      return data.map((row) => row.analysis_data as StockAnalysis);
    } catch (error) {
      console.error("Database query failed:", error);
      throw error;
    }
  }

  /**
   * Delete stock analysis by symbol
   */
  static async deleteBySymbol(symbol: string): Promise<void> {
    try {
      const supabase = SupabaseService.getInstance().getClient();
      const { error } = await supabase
        .from("stock_analysis")
        .delete()
        .eq("symbol", symbol);

      if (error) {
        console.error("Error deleting stock analysis:", error);
        throw new Error(`Failed to delete stock analysis: ${error.message}`);
      }

      console.log(`Successfully deleted analysis for ${symbol}`);
    } catch (error) {
      console.error("Database delete failed:", error);
      throw error;
    }
  }
}
