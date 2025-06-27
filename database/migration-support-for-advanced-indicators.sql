-- Final Migration: Safely add all new advanced technical indicators
-- Run this once in your Supabase SQL Editor

-- Add all new columns to existing signals table
ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS symbol TEXT,
ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS rsi_14 NUMERIC,
ADD COLUMN IF NOT EXISTS sma_20 NUMERIC,
ADD COLUMN IF NOT EXISTS ema_9 NUMERIC,
ADD COLUMN IF NOT EXISTS atr_14 NUMERIC,
ADD COLUMN IF NOT EXISTS trend_alignment TEXT,
ADD COLUMN IF NOT EXISTS breakout_day_high BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS breakout_prev_day_range BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS opening_range_breakout BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS clean_setup BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS intraday_score NUMERIC CHECK (intraday_score >= 0 AND intraday_score <= 10);

-- Populate new columns from existing data (if you have existing signals)
UPDATE signals 
SET 
    symbol = stocks.symbol,
    timestamp = signals.created_at,
    rsi_14 = signals.rsi,
    sma_20 = signals.sma,
    trend_alignment = signals.trend
FROM stocks 
WHERE signals.stock_id = stocks.id 
AND signals.symbol IS NULL;

-- Make symbol column required
ALTER TABLE signals ALTER COLUMN symbol SET NOT NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_signals_symbol ON signals(symbol);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);

-- Verify migration completed successfully
SELECT 
    'Migration completed successfully!' as status,
    COUNT(*) as total_signals,
    COUNT(symbol) as signals_with_symbol,
    COUNT(rsi_14) as signals_with_rsi_14
FROM signals; 