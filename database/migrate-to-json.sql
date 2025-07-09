-- Migration to simplify stock_analysis table to use JSON storage
-- This will drop the existing table and recreate it with JSON storage

DROP TABLE IF EXISTS stock_analysis CASCADE;

-- Create simplified table for storing stock analysis results
CREATE TABLE stock_analysis (
  id SERIAL PRIMARY KEY,
  instrument_key VARCHAR(50) NOT NULL REFERENCES instruments(instrument_key),
  symbol VARCHAR(50) NOT NULL,
  analysis_data JSONB NOT NULL,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(instrument_key)
);

-- Create index for faster lookups
CREATE INDEX idx_stock_analysis_instrument_key ON stock_analysis(instrument_key);
CREATE INDEX idx_stock_analysis_symbol ON stock_analysis(symbol);
CREATE INDEX idx_stock_analysis_last_updated_at ON stock_analysis(last_updated_at DESC);

-- Create GIN index for JSON queries (optional, for better JSON query performance)
CREATE INDEX idx_stock_analysis_data ON stock_analysis USING GIN (analysis_data);

SELECT 'Migration to JSON storage completed successfully! 🎉' as status; 