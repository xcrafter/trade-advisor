export interface SectorData {
  id: string;
  sector_name: string;

  // Performance Metrics
  daily_return?: number;
  weekly_return?: number;
  monthly_return?: number;
  quarterly_return?: number;
  ytd_return?: number;

  // Relative Performance vs Nifty
  vs_nifty_1d?: number;
  vs_nifty_1w?: number;
  vs_nifty_1m?: number;
  vs_nifty_3m?: number;

  // Sector Health Indicators
  avg_pe_ratio?: number;
  avg_pb_ratio?: number;
  avg_debt_equity?: number;
  avg_roe?: number;

  // Sector Momentum
  sector_momentum?:
    | "very_strong"
    | "strong"
    | "moderate"
    | "weak"
    | "very_weak";
  sector_trend?: "uptrend" | "downtrend" | "sideways";

  // Timestamps
  date: string;
  created_at: string;
  updated_at?: string;
}

export interface SwingTradingDashboard {
  sector?: string;
  market_cap_category?: string;
  // Include signal data from stock.ts
  signal: string;
  trend_direction?: string;
  swing_score?: number;
  volume_quality?: string;
}
