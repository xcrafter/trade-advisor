-- =====================================================
-- USER-SPECIFIC STOCK MANAGEMENT MIGRATION
-- This adds user associations to stocks and analysis tables
-- =====================================================

-- Add user_id column to stocks table
ALTER TABLE stocks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to stock_analysis table  
ALTER TABLE stock_analysis 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes for user_id columns
CREATE INDEX IF NOT EXISTS idx_stocks_user_id ON stocks(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_analysis_user_id ON stock_analysis(user_id);

-- Update unique constraints to include user_id
-- Drop old constraints
ALTER TABLE stocks DROP CONSTRAINT IF EXISTS stocks_symbol_exchange_key;
ALTER TABLE stocks DROP CONSTRAINT IF EXISTS stocks_instrument_key_key;
ALTER TABLE stock_analysis DROP CONSTRAINT IF EXISTS stock_analysis_instrument_key_key;

-- Add new user-specific constraints
ALTER TABLE stocks ADD CONSTRAINT stocks_user_symbol_exchange_key 
    UNIQUE(user_id, symbol, exchange);
ALTER TABLE stocks ADD CONSTRAINT stocks_user_instrument_key 
    UNIQUE(user_id, instrument_key);
ALTER TABLE stock_analysis ADD CONSTRAINT stock_analysis_user_instrument_key 
    UNIQUE(user_id, instrument_key);

-- Enable Row Level Security (RLS)
ALTER TABLE stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_analysis ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for stocks table
CREATE POLICY "Users can view their own stocks" ON stocks
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stocks" ON stocks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stocks" ON stocks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stocks" ON stocks
    FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for stock_analysis table
CREATE POLICY "Users can view their own analysis" ON stock_analysis
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis" ON stock_analysis
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis" ON stock_analysis
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis" ON stock_analysis
    FOR DELETE USING (auth.uid() = user_id);

-- Admin policies (admins can see all data)
CREATE POLICY "Admins can view all stocks" ON stocks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all analysis" ON stock_analysis
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Function to get user stocks count
CREATE OR REPLACE FUNCTION get_user_stocks_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM stocks 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user analysis count
CREATE OR REPLACE FUNCTION get_user_analysis_count()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM stock_analysis 
        WHERE user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stocks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON stock_analysis TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================
SELECT 'User-specific stock management migration completed! 🎉' as status; 