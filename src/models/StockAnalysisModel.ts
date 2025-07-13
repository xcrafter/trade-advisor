import { SupabaseService } from "@/lib/supabase";
import { StockAnalysis } from "@/controllers/StockController";

export class StockAnalysisModel {
  /**
   * Save or update stock analysis in database for a specific user
   */
  static async upsert(
    analysis: StockAnalysis,
    instrumentKey: string,
    userId: string
  ): Promise<void> {
    const supabase = SupabaseService.getInstance().getAdminClient();

    try {
      // Validate symbol
      if (!analysis.symbol || analysis.symbol.trim() === "") {
        throw new Error("Invalid analysis: symbol cannot be empty");
      }

      // Get the instrument to ensure we have the correct symbol
      const { data: instrument, error: instrumentError } = await supabase
        .from("instruments")
        .select("symbol")
        .eq("instrument_key", instrumentKey)
        .single();

      if (instrumentError || !instrument) {
        console.error("Error fetching instrument:", instrumentError);
        throw new Error("Failed to validate instrument symbol");
      }

      // Ensure the symbol matches the instrument
      if (instrument.symbol !== analysis.symbol) {
        console.warn(
          `Symbol mismatch: analysis=${analysis.symbol}, instrument=${instrument.symbol}. Using instrument symbol.`
        );
        analysis.symbol = instrument.symbol;
      }

      // Ensure instrument_key is set
      analysis.instrument_key = instrumentKey;

      // Check for existing analysis for this user
      const { data: userAnalysis, error: selectError } = await supabase
        .from("stock_analysis")
        .select("id")
        .eq("instrument_key", instrumentKey)
        .eq("user_id", userId)
        .single();

      if (selectError && selectError.code !== "PGRST116") {
        console.error("Error checking existing record:", selectError);
        throw new Error(`Database query failed: ${selectError.message}`);
      }

      if (userAnalysis) {
        // Update existing record
        const { error: updateError } = await supabase
          .from("stock_analysis")
          .update({
            symbol: analysis.symbol,
            analysis_data: analysis,
            last_updated_at: new Date().toISOString(),
          })
          .eq("id", userAnalysis.id)
          .eq("user_id", userId);

        if (updateError) {
          console.error("Error updating analysis:", updateError);
          throw new Error(`Failed to update analysis: ${updateError.message}`);
        }
      } else {
        // Insert new record
        const { error: insertError } = await supabase
          .from("stock_analysis")
          .insert({
            instrument_key: instrumentKey,
            symbol: analysis.symbol,
            analysis_data: analysis,
            user_id: userId,
            last_updated_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error("Error creating analysis:", insertError);
          throw new Error(`Failed to create analysis: ${insertError.message}`);
        }
      }

      console.log(`Successfully saved analysis for ${analysis.symbol}`);
    } catch (error) {
      console.error("Database operation failed:", error);
      throw error;
    }
  }

  /**
   * Get stock analysis by symbol for a specific user
   */
  static async getBySymbol(
    symbol: string,
    userId: string
  ): Promise<StockAnalysis | null> {
    try {
      const supabase = SupabaseService.getInstance().getAdminClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .eq("symbol", symbol)
        .eq("user_id", userId)
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
   * Get stock analysis by instrument key for a specific user
   */
  static async getByInstrumentKey(
    instrumentKey: string,
    userId: string
  ): Promise<StockAnalysis | null> {
    try {
      const supabase = SupabaseService.getInstance().getAdminClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .eq("instrument_key", instrumentKey)
        .eq("user_id", userId)
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
   * Get recent stock analyses for a specific user
   */
  static async getRecent(
    userId: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    try {
      const supabase = SupabaseService.getInstance().getAdminClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .eq("user_id", userId)
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
   * Search stock analyses by symbol for a specific user
   */
  static async search(
    query: string,
    userId: string,
    limit: number = 10
  ): Promise<StockAnalysis[]> {
    try {
      const supabase = SupabaseService.getInstance().getAdminClient();
      const { data, error } = await supabase
        .from("stock_analysis")
        .select("*")
        .eq("user_id", userId)
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
   * Delete stock analysis by symbol for a specific user
   */
  static async deleteBySymbol(symbol: string, userId: string): Promise<void> {
    try {
      const supabase = SupabaseService.getInstance().getAdminClient();
      const { error } = await supabase
        .from("stock_analysis")
        .delete()
        .eq("symbol", symbol)
        .eq("user_id", userId);

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
