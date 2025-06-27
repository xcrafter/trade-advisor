import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

// Function to calculate relevance score for search results
function calculateRelevanceScore(
  symbol: string,
  companyClean: string,
  query: string
): number {
  const queryLower = query.toLowerCase();
  const symbolLower = symbol.toLowerCase();
  const companyLower = companyClean.toLowerCase();

  // Exact symbol match gets highest score
  if (symbolLower === queryLower) return 100;

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limitParam = searchParams.get("limit");
    const exchangeParam = searchParams.get("exchange");

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter is required" },
        { status: 400 }
      );
    }

    const limit = parseInt(limitParam || "10");
    const exchange = exchangeParam?.toLowerCase();

    console.log(
      `Upstox DB search query: "${query}", limit: ${limit}, exchange: ${
        exchange || "all"
      }`
    );

    const startTime = Date.now();

    // Build the database query
    let dbQuery = supabase
      .from("instruments")
      .select("symbol, instrument_key, company, company_clean, exchange");

    // Add exchange filter if specified
    if (exchange && exchange !== "all") {
      const exchangeUpper = exchange.toUpperCase();
      dbQuery = dbQuery.eq("exchange", exchangeUpper);
    }

    // Search using multiple strategies for better results
    const queryLower = query.toLowerCase();

    // Strategy 1: Direct symbol and company matches
    const { data: directMatches, error: directError } = await dbQuery
      .or(`symbol.ilike.%${query}%,company_clean.ilike.%${query}%`)
      .limit(limit * 2); // Get more results to sort by relevance

    if (directError) {
      console.error("Database search error:", directError);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }

    // Strategy 2: Full-text search on company names for better matching
    const { data: ftsMatches, error: ftsError } = await supabase
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

    // Strategy 3: Search terms array search
    const { data: termMatches, error: termError } = await supabase
      .from("instruments")
      .select("symbol, instrument_key, company, company_clean, exchange")
      .contains("search_terms", [queryLower])
      .limit(limit);

    if (termError) {
      console.log("Search terms warning (non-critical):", termError.message);
    }

    // Combine and deduplicate results
    const allMatches = new Map();

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
      .map((instrument) => ({
        symbol: instrument.symbol,
        instrument_key: instrument.instrument_key,
        company: instrument.company,
        companyClean: instrument.company_clean,
        exchange: instrument.exchange,
        relevanceScore: calculateRelevanceScore(
          instrument.symbol,
          instrument.company_clean,
          query
        ),
      }))
      .filter((instrument) => instrument.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);

    const searchTime = Date.now() - startTime;
    console.log(`Found ${results.length} matches in ${searchTime}ms`);

    return NextResponse.json({
      results,
      query,
      limit,
      exchange: exchange || "all",
      searchTime: `${searchTime}ms`,
      source: "database",
    });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
