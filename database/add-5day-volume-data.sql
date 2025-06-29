-- Add 5-day volume analysis columns to signals table
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_avg DECIMAL(15,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_vs_5day_avg DECIMAL(8,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_trend_5day VARCHAR(20);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_high DECIMAL(15,2);
ALTER TABLE signals ADD COLUMN IF NOT EXISTS volume_5day_low DECIMAL(15,2);

-- Add comments for clarity
COMMENT ON COLUMN signals.volume_5day_avg IS '5-day average volume';
COMMENT ON COLUMN signals.volume_vs_5day_avg IS 'Current volume as percentage of 5-day average';
COMMENT ON COLUMN signals.volume_trend_5day IS 'Volume trend over 5 days (increasing/decreasing/stable)';
COMMENT ON COLUMN signals.volume_5day_high IS 'Highest volume in last 5 days';
COMMENT ON COLUMN signals.volume_5day_low IS 'Lowest volume in last 5 days'; 