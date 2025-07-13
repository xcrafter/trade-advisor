import { SupabaseService } from "@/lib/supabase";
import { Stock as StockType } from "@/types/stock";
import { handleDatabaseError, isNotFoundError } from "@/utils/database-errors";

export type Stock = StockType;

export interface StockCreate {
  symbol: string;
  exchange: string;
  instrument_key: string;
  user_id: string;
}

export class StockModel {
  private static supabase = SupabaseService.getInstance().getAdminClient();

  /**
   * Create or update a stock record for a specific user
   */
  static async upsert(data: StockCreate): Promise<Stock> {
    const { data: stock, error } = await this.supabase
      .from("stocks")
      .upsert([data], {
        onConflict: "user_id,instrument_key",
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      handleDatabaseError(error, "StockModel.upsert");
    }

    return stock;
  }

  /**
   * Find a stock by symbol and exchange for a specific user
   */
  static async findBySymbolAndExchange(
    symbol: string,
    exchange: string,
    userId: string
  ): Promise<Stock | null> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .eq("exchange", exchange)
      .eq("user_id", userId)
      .single();

    if (error && !isNotFoundError(error)) {
      handleDatabaseError(error, "StockModel.findBySymbolAndExchange");
    }

    return data;
  }

  /**
   * Find a stock by instrument key for a specific user
   */
  static async findByInstrumentKey(
    instrumentKey: string,
    userId: string
  ): Promise<Stock | null> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("instrument_key", instrumentKey)
      .eq("user_id", userId)
      .single();

    if (error && !isNotFoundError(error)) {
      handleDatabaseError(error, "StockModel.findByInstrumentKey");
    }

    return data;
  }

  /**
   * Find all stocks for a specific user
   */
  static async findByUserId(userId: string): Promise<Stock[]> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      handleDatabaseError(error, "StockModel.findByUserId");
    }

    return data || [];
  }

  /**
   * Delete a stock for a specific user
   */
  static async deleteByInstrumentKey(
    instrumentKey: string,
    userId: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from("stocks")
      .delete()
      .eq("instrument_key", instrumentKey)
      .eq("user_id", userId);

    if (error) {
      handleDatabaseError(error, "StockModel.deleteByInstrumentKey");
    }
  }
}
