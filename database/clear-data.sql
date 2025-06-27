-- Clear All Data Script
-- Run this in your Supabase SQL Editor to remove all data
-- WARNING: This will permanently delete all your data!

-- Disable foreign key checks temporarily (if needed)
-- SET session_replication_role = replica;

-- Clear data in reverse dependency order to avoid foreign key constraints

-- 1. Clear signals first (references stocks)
DELETE FROM signals;

-- 2. Clear stocks next (references sessions)  
DELETE FROM stocks;

-- 3. Clear sessions last (no dependencies)
DELETE FROM sessions;

-- Re-enable foreign key checks
-- SET session_replication_role = DEFAULT;

-- Reset auto-increment sequences (if using SERIAL columns)
-- This ensures IDs start from 1 again
ALTER SEQUENCE IF EXISTS sessions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS stocks_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS signals_id_seq RESTART WITH 1;

-- Verify all data is cleared
SELECT 
    'Data cleared successfully!' as status,
    (SELECT COUNT(*) FROM sessions) as sessions_count,
    (SELECT COUNT(*) FROM stocks) as stocks_count,
    (SELECT COUNT(*) FROM signals) as signals_count; 