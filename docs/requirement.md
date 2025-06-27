# 📄 PRD: Real-Time Stock Signal Dashboard

## 🧱 Tech Stack

- **Frontend**: Next.js
- **Backend**: Supabase Edge Functions
- **Database**: Supabase (PostgreSQL)
- **LLM**: OpenAI
- **Market Data**: Upstox API
- **Auth**: Not implemented (can be added later)

---

## 🎯 Objective

Build a stock analysis dashboard where users:

1. Add stock symbols
2. Fetch technical indicators using Upstox API
3. Generate trading signals using OpenAI
4. View results in a color-coded table

---

## ✅ Phase 1 Scope (MVP)

### 1. Add Stock

- User enters a stock symbol (e.g., `RELIANCE`)
- Store to `stocks` table:

```ts
{
  id: uuid,
  symbol: text,
  created_at: timestamp
}
```

---

### 2. Analyze Stock

- Triggered by "Analyze" button
- Backend:
  - Fetch 1-min or 5-min OHLCV candles from Upstox API
  - Calculate:
    - VWAP
    - RSI (14)
    - SMA (20)
    - Volume spike
    - Trend
  - Send values to OpenAI
  - Parse result: `strong`, `caution`, `neutral`, `risk`
  - Save to `signals` table:

```ts
{
  id: uuid,
  stock_id: uuid,
  price: numeric,
  rsi: numeric,
  vwap: numeric,
  sma: numeric,
  volume_spike: boolean,
  trend: text,
  signal: "strong" | "caution" | "neutral" | "risk",
  llm_opinion: text,
  created_at: timestamp
}
```

---

## 📡 Upstox API Integration

- Endpoint: `/historical-candle/NSE_EQ/{SYMBOL}/1minute`
- Use to retrieve OHLCV data
- Environment-secured access tokens
- Use either REST or WebSocket based on need

---

## 🧠 LLM Prompt (OpenAI)

```txt
Given RSI is {rsi}, price is {price}, VWAP is {vwap}, SMA is {sma}, and volume spike is {volume_spike}, what kind of intraday trading signal is this: risk, caution, neutral, or strong? Briefly explain.
```

---

## 🎨 Frontend Table UI

- Table columns: Symbol, Price, RSI, VWAP, SMA, Signal
- Color-coded signal cell:
  - `strong` → green
  - `caution` → orange
  - `risk` → red
  - `neutral` → default

---

## ⛔ Excluded for Now

- User login/authentication
- Real trade order placement
- Background cron jobs

---

## 🔜 Future Phases (Optional)

- Real-time signal updates
- Push notifications / alerts
- Integration with Zerodha or other brokers
- Performance tracking dashboard
