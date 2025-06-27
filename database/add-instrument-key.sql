-- Migration: Add instrument_key column to stocks table
-- This allows us to store the Upstox instrument key for API calls

ALTER TABLE stocks ADD COLUMN instrument_key TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_stocks_instrument_key ON stocks(instrument_key);

-- Update existing records to set instrument_key based on symbol
-- This is a best-effort approach for existing data
UPDATE stocks SET instrument_key = 'NSE_EQ|' || symbol WHERE instrument_key IS NULL; 