-- =====================================================
-- FIX DATA LEAKAGE BETWEEN USERS
-- This script checks and fixes any data leakage issues
-- =====================================================

-- First, let's check for any stock_analysis records without user_id
SELECT 'Stock Analysis Records without user_id' as check_type,
       COUNT(*) as count
FROM stock_analysis
WHERE user_id IS NULL;

-- Check for any stocks records without user_id
SELECT 'Stocks Records without user_id' as check_type,
       COUNT(*) as count
FROM stocks
WHERE user_id IS NULL;

-- Check for duplicate instrument_key across different users in stock_analysis
SELECT instrument_key, COUNT(DISTINCT user_id) as user_count
FROM stock_analysis
GROUP BY instrument_key
HAVING COUNT(DISTINCT user_id) > 1;

-- Check for duplicate symbol/exchange combinations across different users in stocks
SELECT symbol, exchange, COUNT(DISTINCT user_id) as user_count
FROM stocks
GROUP BY symbol, exchange
HAVING COUNT(DISTINCT user_id) > 1;

-- Fix conflicting constraints
ALTER TABLE stock_analysis DROP CONSTRAINT IF EXISTS stock_analysis_instrument_key_key;
ALTER TABLE stock_analysis DROP CONSTRAINT IF EXISTS stock_analysis_user_instrument_key;

-- Add the correct user-specific constraint
ALTER TABLE stock_analysis ADD CONSTRAINT stock_analysis_user_instrument_key 
    UNIQUE(user_id, instrument_key);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can insert their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can update their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can delete their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Admins can view all analysis" ON stock_analysis;

-- Recreate RLS policies with stricter conditions
CREATE POLICY "Users can view their own analysis" ON stock_analysis
    FOR SELECT
    USING (
        auth.uid() = user_id AND 
        user_id IS NOT NULL
    );

CREATE POLICY "Users can insert their own analysis" ON stock_analysis
    FOR INSERT
    WITH CHECK (
        auth.uid() = user_id AND 
        user_id IS NOT NULL
    );

CREATE POLICY "Users can update their own analysis" ON stock_analysis
    FOR UPDATE
    USING (
        auth.uid() = user_id AND 
        user_id IS NOT NULL
    );

CREATE POLICY "Users can delete their own analysis" ON stock_analysis
    FOR DELETE
    USING (
        auth.uid() = user_id AND 
        user_id IS NOT NULL
    );

-- Admin policy with stricter check
CREATE POLICY "Admins can view all analysis" ON stock_analysis
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
            AND id IS NOT NULL
        )
    );

-- Add NOT NULL constraint to user_id if not already present
ALTER TABLE stock_analysis 
    ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE stocks 
    ALTER COLUMN user_id SET NOT NULL;

-- Verify RLS is enabled
ALTER TABLE stock_analysis FORCE ROW LEVEL SECURITY;
ALTER TABLE stocks FORCE ROW LEVEL SECURITY;

-- Show current RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public' 
AND (tablename = 'stock_analysis' OR tablename = 'stocks')
ORDER BY tablename, policyname;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check for any remaining duplicates
SELECT 'Duplicate Instrument Keys' as check_type,
       instrument_key,
       COUNT(*) as count,
       array_agg(user_id) as user_ids
FROM stock_analysis
GROUP BY instrument_key
HAVING COUNT(*) > 1;

-- Check constraints
SELECT conname, contype, conrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'stock_analysis'::regclass::oid;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Stock analysis table structure and policies fixed! 🎉' as status; 