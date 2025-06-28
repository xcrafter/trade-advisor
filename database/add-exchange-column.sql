-- Add exchange column to stocks table
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS exchange TEXT;

-- Create index on exchange column for better query performance
CREATE INDEX IF NOT EXISTS idx_stocks_exchange ON stocks(exchange);

-- Update existing stocks with exchange information from instrument_key
UPDATE stocks 
SET exchange = CASE 
  WHEN instrument_key LIKE 'NSE_EQ|%' THEN 'NSE'
  WHEN instrument_key LIKE 'BSE_EQ|%' THEN 'BSE'
  WHEN instrument_key LIKE 'NSE_%' THEN 'NSE'
  WHEN instrument_key LIKE 'BSE_%' THEN 'BSE'
  ELSE 'Unknown'
END
WHERE exchange IS NULL AND instrument_key IS NOT NULL; 