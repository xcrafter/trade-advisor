-- Add trading plan columns to signals table
-- This migration adds columns for comprehensive trading plans

ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS buy_price NUMERIC,
ADD COLUMN IF NOT EXISTS target_price NUMERIC,
ADD COLUMN IF NOT EXISTS stop_loss NUMERIC,
ADD COLUMN IF NOT EXISTS trading_plan TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_signals_buy_price ON signals(buy_price);
CREATE INDEX IF NOT EXISTS idx_signals_target_price ON signals(target_price);
CREATE INDEX IF NOT EXISTS idx_signals_stop_loss ON signals(stop_loss);

-- Update existing records to have default values if needed
-- (Optional: You can uncomment these if you want to populate existing records)
-- UPDATE signals SET buy_price = price * 0.98 WHERE buy_price IS NULL AND price IS NOT NULL;
-- UPDATE signals SET target_price = price * 1.05 WHERE target_price IS NULL AND price IS NOT NULL;
-- UPDATE signals SET stop_loss = price * 0.95 WHERE stop_loss IS NULL AND price IS NOT NULL;

COMMENT ON COLUMN signals.buy_price IS 'Recommended buy price or price range';
COMMENT ON COLUMN signals.target_price IS 'Target price for profit booking';
COMMENT ON COLUMN signals.stop_loss IS 'Stop loss price for risk management';
COMMENT ON COLUMN signals.trading_plan IS 'Detailed trading plan and strategy'; 