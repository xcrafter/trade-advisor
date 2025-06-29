-- Add volume range columns to signals table
-- Migration: Add volume range recommendations

ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS min_volume INTEGER,
ADD COLUMN IF NOT EXISTS max_volume INTEGER,
ADD COLUMN IF NOT EXISTS recommended_volume INTEGER,
ADD COLUMN IF NOT EXISTS position_size_percent NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS volume_range_text TEXT;

-- Add indexes for volume columns
CREATE INDEX IF NOT EXISTS idx_signals_recommended_volume ON signals(recommended_volume);
CREATE INDEX IF NOT EXISTS idx_signals_position_size ON signals(position_size_percent);

-- Add comments for documentation
COMMENT ON COLUMN signals.min_volume IS 'Minimum recommended number of shares to buy';
COMMENT ON COLUMN signals.max_volume IS 'Maximum recommended number of shares to buy';
COMMENT ON COLUMN signals.recommended_volume IS 'Recommended number of shares to buy';
COMMENT ON COLUMN signals.position_size_percent IS 'Recommended position size as percentage of account';
COMMENT ON COLUMN signals.volume_range_text IS 'Human-readable volume recommendations for different account sizes'; 