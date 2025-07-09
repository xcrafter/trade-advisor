import { SupabaseService } from "@/lib/supabase";
import { Stock as StockType } from "@/types/stock";
import { handleDatabaseError, isNotFoundError } from "@/utils/database-errors";

export type Stock = StockType;

export interface StockCreate {
  symbol: string;
  exchange: string;
  instrument_key: string;
}

export class StockModel {
  private static supabase = SupabaseService.getInstance().getClient();

  /**
   * Create or update a stock record
   */
  static async upsert(data: StockCreate): Promise<Stock> {
    const { data: stock, error } = await this.supabase
      .from("stocks")
      .upsert([data], {
        onConflict: "instrument_key",
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
   * Find a stock by symbol and exchange
   */
  static async findBySymbolAndExchange(
    symbol: string,
    exchange: string
  ): Promise<Stock | null> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .eq("exchange", exchange)
      .single();

    if (error && !isNotFoundError(error)) {
      handleDatabaseError(error, "StockModel.findBySymbolAndExchange");
    }

    return data;
  }

  /**
   * Find a stock by instrument key
   */
  static async findByInstrumentKey(
    instrumentKey: string
  ): Promise<Stock | null> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("instrument_key", instrumentKey)
      .single();

    if (error && !isNotFoundError(error)) {
      handleDatabaseError(error, "StockModel.findByInstrumentKey");
    }

    return data;
  }

  /**
   * Find stocks by session ID
   */
  static async findBySessionId(sessionId: string): Promise<Stock[]> {
    const { data, error } = await this.supabase
      .from("stocks")
      .select("*")
      .eq("session_id", sessionId);

    if (error) {
      handleDatabaseError(error, "StockModel.findBySessionId");
    }

    return data || [];
  }
}
