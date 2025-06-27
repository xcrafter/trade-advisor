-- Add volume column to signals table
ALTER TABLE signals ADD COLUMN volume BIGINT;

-- Add comment for the new column
COMMENT ON COLUMN signals.volume IS 'Current trading volume for the stock at analysis time';

-- Update existing records to have NULL volume (will be populated by future analyses)
-- No need to set default values for existing records as they will be re-analyzed

-- Add index for volume-based queries if needed
CREATE INDEX IF NOT EXISTS idx_signals_volume ON signals(volume); 