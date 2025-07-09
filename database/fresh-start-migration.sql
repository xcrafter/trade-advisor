-- =====================================================
-- FRESH START MIGRATION SCRIPT
-- This script will reset the database to a clean state
-- keeping only stocks and instruments tables
-- =====================================================

-- Drop all existing tables except stocks and instruments
DROP TABLE IF EXISTS signals CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS watchlists CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS market_data CASCADE;
DROP TABLE IF EXISTS sector_data CASCADE;
DROP TABLE IF EXISTS fundamental_data CASCADE;

-- Clean up stocks table structure (keep it simple)
DROP TABLE IF EXISTS stocks CASCADE;

-- Recreate stocks table with minimal structure
CREATE TABLE stocks (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    exchange VARCHAR(10) NOT NULL,
    instrument_key VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique symbol per exchange and instrument_key
    UNIQUE(symbol, exchange),
    UNIQUE(instrument_key)
);

-- Create index for faster lookups
CREATE INDEX idx_stocks_symbol ON stocks(symbol);
CREATE INDEX idx_stocks_exchange ON stocks(exchange);
CREATE INDEX idx_stocks_instrument_key ON stocks(instrument_key);

-- Keep instruments table as is (assuming it's already populated)
-- If you want to reset instruments table too, uncomment the following:
-- DROP TABLE IF EXISTS instruments CASCADE;
-- You would then need to re-run the instrument migration script

-- Add some sample data for testing (optional)
-- INSERT INTO stocks (symbol, exchange, instrument_key) VALUES
-- ('RELIANCE', 'NSE', 'NSE_EQ|INE002A01018'),
-- ('TCS', 'NSE', 'NSE_EQ|INE467B01029'),
-- ('INFY', 'NSE', 'NSE_EQ|INE009A01021');

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Fresh start migration completed successfully! 🎉' as status; 

-- Create table for storing stock analysis results
CREATE TABLE IF NOT EXISTS stock_analysis (
  id SERIAL PRIMARY KEY,
  instrument_key VARCHAR(50) NOT NULL REFERENCES instruments(instrument_key),
  symbol VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  signal VARCHAR(20) NOT NULL,
  direction VARCHAR(10) NOT NULL,
  confidence_level VARCHAR(20) NOT NULL,
  llm_opinion TEXT,
  rsi_14 DECIMAL(10, 2),
  macd_line DECIMAL(10, 4),
  macd_signal DECIMAL(10, 4),
  macd_histogram DECIMAL(10, 4),
  stochastic DECIMAL(10, 2),
  volume_trend_20day VARCHAR(20),
  volume_quality VARCHAR(20),
  support_levels DECIMAL(10, 2)[] NOT NULL,
  resistance_levels DECIMAL(10, 2)[] NOT NULL,
  fibonacci_levels DECIMAL(10, 2)[] NOT NULL,
  swing_score DECIMAL(10, 2),
  swing_setup_quality VARCHAR(20),
  trading_plan TEXT,
  key_catalysts TEXT,
  risk_factors TEXT,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_key)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_stock_analysis_instrument_key ON stock_analysis(instrument_key);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_symbol ON stock_analysis(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_last_updated_at ON stock_analysis(last_updated_at DESC); 