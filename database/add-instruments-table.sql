-- Add instruments table for Upstox instrument data
CREATE TABLE IF NOT EXISTS instruments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  instrument_key TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  company_clean TEXT NOT NULL,
  exchange TEXT NOT NULL,
  exchange_token TEXT,
  last_price NUMERIC DEFAULT 0,
  tick_size NUMERIC DEFAULT 0,
  search_terms TEXT[], -- Array of search terms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast searching
CREATE INDEX IF NOT EXISTS idx_instruments_symbol ON instruments(symbol);
CREATE INDEX IF NOT EXISTS idx_instruments_instrument_key ON instruments(instrument_key);
CREATE INDEX IF NOT EXISTS idx_instruments_exchange ON instruments(exchange);
CREATE INDEX IF NOT EXISTS idx_instruments_company_clean ON instruments(company_clean);
CREATE INDEX IF NOT EXISTS idx_instruments_search_terms ON instruments USING GIN(search_terms);

-- Add full-text search index for company names
CREATE INDEX IF NOT EXISTS idx_instruments_company_fts ON instruments USING GIN(to_tsvector('english', company_clean));

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_instruments_updated_at 
  BEFORE UPDATE ON instruments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add instrument_key column to stocks table if it doesn't exist
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS instrument_key TEXT;

-- Create index on instrument_key in stocks table
CREATE INDEX IF NOT EXISTS idx_stocks_instrument_key ON stocks(instrument_key); 