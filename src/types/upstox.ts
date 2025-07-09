export interface UpstoxConfig {
  apiKey: string;
}

export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;
}

export interface MarketStatus {
  market: string;
  status: string;
  exchangeStatus: Record<string, string>;
}

export interface Quote {
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}

// Type for raw candle data from Upstox API
export type RawCandleData = [string, number, number, number, number, number];
