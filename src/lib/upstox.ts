import {
  type UpstoxConfig,
  type CandleData,
  type RawCandleData,
  type Quote,
} from "@/types/upstox";

const UPSTOX_API_URL = "https://api.upstox.com/v3";
const DEFAULT_CANDLE_DAYS = 60;
const DEFAULT_SKIP_DAYS = 0;

/**
 * Check if a date is a weekday (Monday-Friday)
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get start and end dates for last N trading days, optionally skipping recent days
 */
function getLastTradingDays(
  days: number,
  skipDays: number = 0
): {
  startDate: Date;
  endDate: Date;
} {
  // Calculate end date by skipping recent days
  const endDate = new Date();
  let skippedDays = 0;
  while (skippedDays < skipDays) {
    endDate.setDate(endDate.getDate() - 1);
    if (isWeekday(endDate)) {
      skippedDays++;
    }
  }

  // Calculate start date by going back 'days' number of trading days from end date
  let tradingDaysFound = 0;
  const startDate = new Date(endDate);

  while (tradingDaysFound < days) {
    startDate.setDate(startDate.getDate() - 1);
    if (isWeekday(startDate)) {
      tradingDaysFound++;
    }
  }

  return { startDate, endDate };
}

interface CacheEntry {
  data: CandleData[];
  timestamp: number;
}

interface QuoteCacheEntry {
  data: Quote;
  timestamp: number;
}

export class UpstoxAPI {
  private static instance: UpstoxAPI | undefined = undefined;
  private apiKey: string;
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private quoteCache: Map<string, QuoteCacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly QUOTE_CACHE_DURATION = 30 * 1000; // 30 seconds for quotes

  constructor(config: UpstoxConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Get or create singleton instance
   */
  public static getInstance(config?: UpstoxConfig): UpstoxAPI {
    if (!UpstoxAPI.instance) {
      if (!config) {
        throw new Error(
          "UpstoxAPI config is required for first initialization"
        );
      }
      UpstoxAPI.instance = new UpstoxAPI(config);
      console.log("[UpstoxAPI] Created singleton instance");
    } else {
      console.log("[UpstoxAPI] Reusing existing singleton instance");
    }
    return UpstoxAPI.instance;
  }

  /**
   * Clear the singleton instance and all caches
   */
  public static clearInstance(): void {
    if (UpstoxAPI.instance) {
      UpstoxAPI.instance.cache.clear();
      UpstoxAPI.instance.quoteCache.clear();
      UpstoxAPI.instance.pendingRequests.clear();
    }
    UpstoxAPI.instance = undefined;
    console.log("[UpstoxAPI] Cleared instance and caches");
  }

  /**
   * Make an authenticated API request with deduplication
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const requestKey = `${endpoint}:${JSON.stringify(options)}`;

    // Check if the same request is already in progress
    if (this.pendingRequests.has(requestKey)) {
      console.log(`[UpstoxAPI] Deduplicating request: ${endpoint}`);
      return this.pendingRequests.get(requestKey)! as Promise<T>;
    }

    // Create the request promise
    const requestPromise = this.makeRequest<T>(endpoint, options);

    // Store the promise to prevent duplicate requests
    this.pendingRequests.set(requestKey, requestPromise);

    // Clean up the promise when it resolves/rejects
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  /**
   * Make the actual API request
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const response = await fetch(`${UPSTOX_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Accept: "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    });
    console.log(`${UPSTOX_API_URL}${endpoint}`, this.apiKey, response.status);

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(`Upstox API error: ${error.message}`);
    }

    return response.json();
  }

  /**
   * Convert Upstox candle data to internal format
   */
  private convertCandle(candle: RawCandleData): CandleData {
    return {
      timestamp: new Date(candle[0]).getTime(),
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
    };
  }

  /**
   * Get real-time market quote for an instrument
   */
  async getMarketQuote(instrumentKey: string): Promise<Quote> {
    try {
      const cacheKey = `quote:${instrumentKey}`;

      // Check cache first
      const cached = this.quoteCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.QUOTE_CACHE_DURATION) {
        console.log(`[UpstoxAPI] Quote cache hit for ${instrumentKey}`);
        return cached.data;
      }

      // Use the correct LTP Quotes V3 endpoint
      const endpoint = `/market-quote/ltp?instrument_key=${instrumentKey}`;
      console.log(`[UpstoxAPI] Calling LTP V3: ${endpoint}`);

      const response = await this.request<{
        status: string;
        data: Record<
          string,
          {
            last_price: number;
            instrument_token: string;
            ltq: number;
            volume: number;
            cp: number;
          }
        >;
      }>(endpoint);

      // Get the first key from the response data (since there should only be one instrument)
      const firstKey = Object.keys(response.data)[0];
      const quoteData = response.data[firstKey];

      if (!quoteData) {
        throw new Error(`No quote data found for ${instrumentKey}`);
      }

      const quote: Quote = {
        ltp: quoteData.last_price,
        open: quoteData.cp, // Using previous close as open (will be updated with proper OHLC if needed)
        high: quoteData.last_price, // LTP endpoint doesn't provide high/low, using LTP
        low: quoteData.last_price, // LTP endpoint doesn't provide high/low, using LTP
        close: quoteData.cp, // Previous day's closing price
        volume: quoteData.volume,
        change: quoteData.last_price - quoteData.cp,
        changePercent:
          ((quoteData.last_price - quoteData.cp) / quoteData.cp) * 100,
      };

      console.log(quote);

      // Cache the result
      this.quoteCache.set(cacheKey, {
        data: quote,
        timestamp: Date.now(),
      });

      console.log(
        `[UpstoxAPI] LTP V3 quote for ${instrumentKey}: LTP=₹${
          quote.ltp
        }, Volume=${quoteData.volume}, Change=${quote.changePercent.toFixed(
          2
        )}%`
      );
      return quote;
    } catch (error) {
      console.error("Failed to fetch LTP quote:", error);
      throw new Error("Failed to fetch LTP quote");
    }
  }

  /**
   * Get current price for an instrument (convenience method)
   */
  async getCurrentPrice(instrumentKey: string): Promise<number> {
    const quote = await this.getMarketQuote(instrumentKey);
    return quote.ltp;
  }

  /**
   * Get daily candles for swing trading analysis
   */
  async getLastTradingDaysData(
    instrumentKey: string,
    days: number = Number(process.env.NEXT_PUBLIC_CANDLE_DAYS) ||
      DEFAULT_CANDLE_DAYS,
    skipDays: number = Number(process.env.NEXT_PUBLIC_SKIP_DAYS) ||
      DEFAULT_SKIP_DAYS
  ): Promise<CandleData[]> {
    try {
      const cacheKey = `candles:${instrumentKey}:${days}:${skipDays}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[UpstoxAPI] Cache hit for ${instrumentKey}`);
        return cached.data;
      }

      // Get date range for the trading days
      const { startDate, endDate } = getLastTradingDays(days, skipDays);

      // Format dates for API
      const fromDate = startDate.toISOString().split("T")[0];
      const toDate = endDate.toISOString().split("T")[0];

      console.log(
        `[UpstoxAPI] Fetching ${days} days of candles for ${instrumentKey} from ${fromDate} to ${toDate} (skipping ${skipDays} days)`
      );

      const endpoint = `/historical-candle/${instrumentKey}/days/1/${toDate}/${fromDate}`;
      const response = await this.request<{
        status: string;
        data: { candles: RawCandleData[] };
      }>(endpoint);

      const candles = response.data.candles.map((candle) =>
        this.convertCandle(candle)
      );

      // Cache the result
      this.cache.set(cacheKey, {
        data: candles,
        timestamp: Date.now(),
      });

      return candles;
    } catch (error) {
      console.error("Failed to fetch candle data:", error);
      throw new Error("Failed to fetch candle data");
    }
  }
}
