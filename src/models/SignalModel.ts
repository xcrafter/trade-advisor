import { SupabaseService } from "@/lib/supabase";
import { Signal } from "@/types/stock";

export interface SignalCreate {
  stock_id: string;
  symbol: string;
  timestamp: string;
  price: number;
  signal: Signal["signal"];
  direction: Signal["direction"];
}

export class SignalModel {
  private static supabase = SupabaseService.getInstance().getClient();

  /**
   * Create a new signal
   */
  static async create(data: SignalCreate): Promise<Signal> {
    const { data: signal, error } = await this.supabase
      .from("signals")
      .insert([data])
      .select()
      .single();

    if (error) {
      console.error("Signal creation error:", error);
      throw new Error("Failed to create signal");
    }

    return signal;
  }

  /**
   * Find signals by stock ID
   */
  static async findByStockId(stockId: string): Promise<Signal[]> {
    const { data, error } = await this.supabase
      .from("signals")
      .select("*")
      .eq("stock_id", stockId)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Signal lookup error:", error);
      throw new Error("Failed to lookup signals");
    }

    return data || [];
  }

  /**
   * Get latest signal for a stock
   */
  static async getLatest(stockId: string): Promise<Signal | null> {
    const { data, error } = await this.supabase
      .from("signals")
      .select("*")
      .eq("stock_id", stockId)
      .order("timestamp", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Latest signal lookup error:", error);
      throw new Error("Failed to lookup latest signal");
    }

    return data;
  }

  /**
   * Update signal with technical indicators
   */
  static async updateIndicators(
    signalId: string,
    indicators: Partial<Signal>
  ): Promise<Signal> {
    const { data: signal, error } = await this.supabase
      .from("signals")
      .update(indicators)
      .eq("id", signalId)
      .select()
      .single();

    if (error) {
      console.error("Signal update error:", error);
      throw new Error("Failed to update signal indicators");
    }

    return signal;
  }
}
