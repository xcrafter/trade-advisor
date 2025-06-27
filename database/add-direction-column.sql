-- Add direction column to signals table
-- This migration adds a column to track whether a trade is LONG or SHORT

ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'LONG' CHECK (direction IN ('LONG', 'SHORT'));

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_signals_direction ON signals(direction);

-- Update existing records to have LONG direction (default for backward compatibility)
UPDATE signals SET direction = 'LONG' WHERE direction IS NULL;

COMMENT ON COLUMN signals.direction IS 'Trade direction: LONG (buy) or SHORT (sell)'; 