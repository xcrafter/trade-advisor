export interface FundamentalData {
  id: string;
  symbol: string;

  // Valuation Metrics
  pe_ratio?: number;
  pb_ratio?: number;
  price_to_sales?: number;
  ev_ebitda?: number;
  dividend_yield?: number;

  // Financial Health
  debt_to_equity?: number;
  current_ratio?: number;
  interest_coverage?: number;

  // Growth & Profitability
  revenue_growth_yoy?: number;
  earnings_growth_yoy?: number;
  roe?: number;
  roa?: number;
  operating_margin?: number;

  // Market Data
  market_cap?: number;
  shares_outstanding?: number;
  float_shares?: number;

  // Fundamental Score
  fundamental_score?: number; // 0-10 scale
  fundamental_outlook?:
    | "very_bullish"
    | "bullish"
    | "neutral"
    | "bearish"
    | "very_bearish";

  // Timestamps
  data_date: string;
  created_at: string;
  updated_at?: string;
}
