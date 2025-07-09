import { SupabaseService } from "@/lib/supabase";

export interface Instrument {
  id: string;
  symbol: string;
  instrument_key: string;
  exchange: string;
  company: string;
  company_clean: string;
  search_terms?: string[];
}

export interface InstrumentSearchResult extends Instrument {
  matchType: "symbol" | "company" | "partial";
  relevanceScore: number;
}

export class InstrumentModel {
  private static supabase = SupabaseService.getInstance().getClient();

  /**
   * Search for instruments by symbol or company name
   */
  static async search(
    query: string,
    limit: number = 10,
    exchange?: string
  ): Promise<InstrumentSearchResult[]> {
    // Build the database query
    let dbQuery = this.supabase
      .from("instruments")
      .select("symbol, instrument_key, company, company_clean, exchange");

    // Add exchange filter if specified
    if (exchange && exchange !== "all") {
      const exchangeUpper = exchange.toUpperCase();
      dbQuery = dbQuery.eq("exchange", exchangeUpper);
    }

    // Search using multiple strategies for better results
    const queryLower = query.toLowerCase();

    // Strategy 1: Exact symbol match (highest priority)
    const { data: exactSymbolMatches, error: exactError } = await dbQuery
      .eq("symbol", query.toUpperCase())
      .limit(limit);

    if (exactError) {
      console.log("Exact symbol search warning:", exactError.message);
    }

    // Strategy 2: Direct symbol and company matches
    const { data: directMatches, error: directError } = await dbQuery
      .or(`symbol.ilike.%${query}%,company_clean.ilike.%${query}%`)
      .limit(limit * 2); // Get more results to sort by relevance

    if (directError) {
      console.error("Database search error:", directError);
      throw new Error("Search failed");
    }

    // Strategy 3: Full-text search on company names
    const { data: ftsMatches, error: ftsError } = await this.supabase
      .from("instruments")
      .select("symbol, instrument_key, company, company_clean, exchange")
      .textSearch("company_clean", query, {
        type: "websearch",
        config: "english",
      })
      .limit(limit);

    if (ftsError) {
      console.log("FTS search warning (non-critical):", ftsError.message);
    }

    // Strategy 4: Search terms array search
    const { data: termMatches, error: termError } = await this.supabase
      .from("instruments")
      .select("symbol, instrument_key, company, company_clean, exchange")
      .contains("search_terms", [queryLower])
      .limit(limit);

    if (termError) {
      console.log("Search terms warning (non-critical):", termError.message);
    }

    // Combine and deduplicate results
    const allMatches = new Map();

    // Add exact symbol matches first (highest priority)
    if (exactSymbolMatches) {
      exactSymbolMatches.forEach((match) => {
        allMatches.set(match.instrument_key, match);
      });
    }

    // Add direct matches
    if (directMatches) {
      directMatches.forEach((match) => {
        allMatches.set(match.instrument_key, match);
      });
    }

    // Add FTS matches
    if (ftsMatches) {
      ftsMatches.forEach((match) => {
        allMatches.set(match.instrument_key, match);
      });
    }

    // Add term matches
    if (termMatches) {
      termMatches.forEach((match) => {
        allMatches.set(match.instrument_key, match);
      });
    }

    // Convert to array and calculate relevance scores
    const results = Array.from(allMatches.values())
      .map((instrument) => {
        const relevanceScore = this.calculateRelevanceScore(
          instrument.symbol,
          instrument.company_clean,
          query
        );

        // Determine match type based on how the match was found
        let matchType: "symbol" | "company" | "partial" = "partial";
        const symbolLower = instrument.symbol.toLowerCase();
        const companyLower = instrument.company_clean.toLowerCase();

        if (symbolLower === queryLower || symbolLower.startsWith(queryLower)) {
          matchType = "symbol";
        } else if (companyLower.includes(queryLower)) {
          matchType = "company";
        }

        return {
          ...instrument,
          exchange: instrument.exchange.replace("_EQ", ""), // Clean exchange name (NSE_EQ -> NSE)
          matchType,
          relevanceScore,
        };
      })
      .filter((instrument) => instrument.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    return results;
  }

  /**
   * Find an instrument by symbol
   */
  static async findBySymbol(symbol: string): Promise<Instrument | null> {
    const { data, error } = await this.supabase
      .from("instruments")
      .select("*")
      .eq("symbol", symbol.toUpperCase())
      .order("exchange", { ascending: true }) // NSE comes before BSE alphabetically
      .limit(1)
      .single();

    if (error) {
      console.error("Instrument lookup error:", error);
      throw new Error("Failed to lookup instrument");
    }

    return data || null;
  }

  /**
   * Find an instrument by instrument key
   */
  static async findByInstrumentKey(
    instrumentKey: string
  ): Promise<Instrument | null> {
    const { data, error } = await this.supabase
      .from("instruments")
      .select("*")
      .eq("instrument_key", instrumentKey)
      .single();

    if (error) {
      console.error("Instrument lookup error:", error);
      throw new Error("Failed to lookup instrument");
    }

    return data || null;
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(
    symbol: string,
    companyClean: string,
    query: string
  ): number {
    const queryLower = query.toLowerCase();
    const symbolLower = symbol.toLowerCase();
    const companyLower = companyClean.toLowerCase();

    // Exact symbol match gets highest score
    if (symbolLower === queryLower) return 1000;

    // Symbol starts with query
    if (symbolLower.startsWith(queryLower)) return 90;

    // Symbol contains query
    if (symbolLower.includes(queryLower)) return 80;

    // Exact company name match
    if (companyLower === queryLower) return 85;

    // Company name starts with query
    if (companyLower.startsWith(queryLower)) return 75;

    // Company name contains query
    if (companyLower.includes(queryLower)) return 65;

    // Word boundary matches in company name
    const companyWords = companyLower.split(/\s+/);
    for (const word of companyWords) {
      if (word.startsWith(queryLower)) return 60;
      if (word.includes(queryLower)) return 50;
    }

    return 0;
  }
}
