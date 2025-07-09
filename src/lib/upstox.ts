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

export class UpstoxAPI {
  private apiKey: string;

  constructor(config: UpstoxConfig) {
    this.apiKey = config.apiKey;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T>(
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

      const response = await this.request<{
        status: string;
        data: { candles: RawCandleData[] };
      }>(`/historical-candle/${instrumentKey}/days/1/${to}/${from}`);

      return response.data.candles.map((candle) => this.convertCandle(candle));
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
