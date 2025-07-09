import {
  type UpstoxConfig,
  type CandleData,
  type RawCandleData,
} from "@/types/upstox";

const UPSTOX_API_URL = "https://api.upstox.com/v3";

/**
 * Check if a date is a weekday (Monday-Friday)
 */
function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Get start and end dates for last N trading days
 */
function getLastTradingDays(days: number): {
  startDate: Date;
  endDate: Date;
} {
  const endDate = new Date();
  let tradingDaysFound = 0;
  const startDate = new Date();

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

export class UpstoxAPI {
  private apiKey: string;
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private cache: Map<string, CacheEntry> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: UpstoxConfig) {
    this.apiKey = config.apiKey;
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
   * Get daily candles for swing trading analysis
   */
  async getDailyCandles(
    instrumentKey: string,
    fromDate: Date,
    toDate: Date
  ): Promise<CandleData[]> {
    try {
      // Format dates as YYYY-MM-DD
      const from = fromDate.toISOString().split("T")[0];
      const to = toDate.toISOString().split("T")[0];
      const cacheKey = `${instrumentKey}:${from}:${to}`;

      // Check cache first
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        console.log(`[UpstoxAPI] Cache hit for ${instrumentKey}`);
        return cached.data;
      }

      const endpoint = `/historical-candle/${instrumentKey}/days/1/${to}/${from}`;
      console.log(`[UpstoxAPI] Calling: ${endpoint}`);

      const response = await this.request<{
        status: string;
        data: { candles: RawCandleData[] };
      }>(endpoint);

      const candles = response.data.candles.map((candle) =>
        this.convertCandle(candle)
      );
      console.log(
        `[UpstoxAPI] Returning ${candles.length} candles for ${instrumentKey}`
      );

      // Cache the result
      this.cache.set(cacheKey, {
        data: candles,
        timestamp: Date.now(),
      });

      return candles;
    } catch (error) {
      console.error("Failed to fetch daily candles:", error);
      throw new Error("Failed to fetch daily candles");
    }
  }

  /**
   * Get last N trading days of data (for swing analysis)
   */
  async getLastTradingDaysData(
    instrumentKey: string,
    days: number = 30
  ): Promise<CandleData[]> {
    const { startDate, endDate } = getLastTradingDays(days);
    return this.getDailyCandles(instrumentKey, startDate, endDate);
  }
}
