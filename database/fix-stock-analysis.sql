-- =====================================================
-- FIX STOCK ANALYSIS TABLE
-- This script checks and fixes stock analysis table issues
-- =====================================================

-- First, let's make sure the table exists with correct structure
CREATE TABLE IF NOT EXISTS stock_analysis (
    id SERIAL PRIMARY KEY,
    instrument_key VARCHAR(50) NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    analysis_data JSONB NOT NULL,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_stock_analysis_user_id ON stock_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_symbol ON stock_analysis(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_instrument_key ON stock_analysis(instrument_key);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_last_updated ON stock_analysis(last_updated_at);

-- Drop old constraints if they exist
ALTER TABLE stock_analysis DROP CONSTRAINT IF EXISTS stock_analysis_instrument_key_key;
ALTER TABLE stock_analysis DROP CONSTRAINT IF EXISTS stock_analysis_user_instrument_key;

-- Add new user-specific constraint
ALTER TABLE stock_analysis ADD CONSTRAINT stock_analysis_user_instrument_key 
    UNIQUE(user_id, instrument_key);

-- Enable RLS
ALTER TABLE stock_analysis ENABLE ROW LEVEL SECURITY;

-- Drop old policies
DROP POLICY IF EXISTS "Users can view their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can insert their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can update their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Users can delete their own analysis" ON stock_analysis;
DROP POLICY IF EXISTS "Admins can view all analysis" ON stock_analysis;

-- Create new policies using JWT metadata
CREATE POLICY "Users can view their own analysis" ON stock_analysis
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis" ON stock_analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis" ON stock_analysis
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis" ON stock_analysis
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all analysis" ON stock_analysis
    FOR SELECT USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

CREATE POLICY "Admins can modify all analysis" ON stock_analysis
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON stock_analysis TO authenticated;
GRANT USAGE ON SEQUENCE stock_analysis_id_seq TO authenticated;

-- Function to check if analysis exists
CREATE OR REPLACE FUNCTION public.has_stock_analysis(p_symbol TEXT, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stock_analysis 
        WHERE symbol = p_symbol AND user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get analysis count
CREATE OR REPLACE FUNCTION public.get_user_analysis_count(p_user_id UUID DEFAULT auth.uid())
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM stock_analysis 
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.has_stock_analysis(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_analysis_count(UUID) TO authenticated;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name = 'stock_analysis'
ORDER BY 
    ordinal_position;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies 
WHERE 
    tablename = 'stock_analysis';

-- Check row count
SELECT 
    'Total rows' as metric, 
    COUNT(*) as value 
FROM 
    stock_analysis
UNION ALL
SELECT 
    'Distinct users' as metric, 
    COUNT(DISTINCT user_id) as value 
FROM 
    stock_analysis;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'Stock analysis table structure and policies fixed! 🎉' as status; 