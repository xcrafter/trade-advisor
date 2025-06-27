-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stocks table (updated to include session_id)
CREATE TABLE stocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(session_id, symbol) -- Prevent duplicate symbols per session
);

-- Signals table (unchanged but now linked through stocks)
CREATE TABLE signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stock_id UUID NOT NULL REFERENCES stocks(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Price data
  price NUMERIC NOT NULL,
  
  -- Technical Indicators
  vwap NUMERIC,
  rsi_14 NUMERIC,
  sma_20 NUMERIC,
  ema_9 NUMERIC,
  atr_14 NUMERIC,
  
  -- Volume and Momentum
  volume BIGINT,
  volume_spike BOOLEAN DEFAULT FALSE,
  
  -- Trend and Alignment
  trend TEXT,
  trend_alignment TEXT,
  
  -- Breakout Signals
  breakout_day_high BOOLEAN DEFAULT FALSE,
  breakout_prev_day_range BOOLEAN DEFAULT FALSE,
  opening_range_breakout BOOLEAN DEFAULT FALSE,
  
  -- Setup Quality
  clean_setup BOOLEAN DEFAULT FALSE,
  intraday_score NUMERIC CHECK (intraday_score >= 0 AND intraday_score <= 10),
  
  -- LLM Analysis
  signal TEXT CHECK (signal IN ('strong', 'caution', 'neutral', 'risk')),
  llm_opinion TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_stocks_session ON stocks(session_id);
CREATE INDEX IF NOT EXISTS idx_signals_stock ON signals(stock_id);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE OR REPLACE TRIGGER update_sessions_updated_at 
  BEFORE UPDATE ON sessions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column(); 