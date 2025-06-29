-- Add intraday volume statistics columns to signals table
-- Migration: Add average, max, and median volume for intraday analysis

ALTER TABLE signals 
ADD COLUMN IF NOT EXISTS volume_avg_intraday BIGINT,
ADD COLUMN IF NOT EXISTS volume_max_intraday BIGINT,
ADD COLUMN IF NOT EXISTS volume_median_intraday BIGINT,
ADD COLUMN IF NOT EXISTS volume_total_intraday BIGINT,
ADD COLUMN IF NOT EXISTS volume_candle_count INTEGER;

-- Add indexes for volume statistics
CREATE INDEX IF NOT EXISTS idx_signals_volume_avg_intraday ON signals(volume_avg_intraday);
CREATE INDEX IF NOT EXISTS idx_signals_volume_max_intraday ON signals(volume_max_intraday);
CREATE INDEX IF NOT EXISTS idx_signals_volume_median_intraday ON signals(volume_median_intraday);

-- Add comments for documentation
COMMENT ON COLUMN signals.volume_avg_intraday IS 'Average volume per minute during intraday session';
COMMENT ON COLUMN signals.volume_max_intraday IS 'Maximum volume in any single minute during intraday session';
COMMENT ON COLUMN signals.volume_median_intraday IS 'Median volume per minute during intraday session';
COMMENT ON COLUMN signals.volume_total_intraday IS 'Total volume across all intraday minutes';
COMMENT ON COLUMN signals.volume_candle_count IS 'Number of 1-minute candles used for volume calculations'; 