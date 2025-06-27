-- Fix NULL constraint issues in signals table
-- Run this in your Supabase SQL Editor

-- Remove NOT NULL constraints from old columns that might be NULL in new system
ALTER TABLE signals ALTER COLUMN rsi DROP NOT NULL;
ALTER TABLE signals ALTER COLUMN vwap DROP NOT NULL;
ALTER TABLE signals ALTER COLUMN sma DROP NOT NULL;
ALTER TABLE signals ALTER COLUMN volume_spike DROP NOT NULL;
ALTER TABLE signals ALTER COLUMN trend DROP NOT NULL;
ALTER TABLE signals ALTER COLUMN llm_opinion DROP NOT NULL;

-- Set default values for boolean columns to prevent NULL issues
ALTER TABLE signals ALTER COLUMN volume_spike SET DEFAULT FALSE;

-- Update any existing NULL values to defaults
UPDATE signals SET volume_spike = FALSE WHERE volume_spike IS NULL;
UPDATE signals SET trend = 'neutral' WHERE trend IS NULL;
UPDATE signals SET llm_opinion = 'No analysis available' WHERE llm_opinion IS NULL;

-- Verify the changes
SELECT 
    column_name, 
    is_nullable, 
    column_default,
    data_type
FROM information_schema.columns 
WHERE table_name = 'signals' 
AND column_name IN ('rsi', 'vwap', 'sma', 'volume_spike', 'trend', 'llm_opinion')
ORDER BY column_name; 