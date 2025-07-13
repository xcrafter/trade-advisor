-- =====================================================
-- FIX MISSING USER IDs
-- This script updates existing records with missing user IDs
-- =====================================================

-- First, let's identify the admin user
DO $$ 
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the first admin user's ID
    SELECT id INTO admin_user_id
    FROM public.user_profiles
    WHERE role = 'admin'
    LIMIT 1;

    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'No admin user found in user_profiles table';
    END IF;

    -- Update stocks table - assign records with null user_id to admin
    UPDATE public.stocks
    SET user_id = admin_user_id
    WHERE user_id IS NULL;

    -- Update stock_analysis table - assign records with null user_id to admin
    UPDATE public.stock_analysis
    SET user_id = admin_user_id
    WHERE user_id IS NULL;

    -- Output the results
    RAISE NOTICE 'Migration completed:';
    RAISE NOTICE '- Updated % records in stocks table', (SELECT COUNT(*) FROM public.stocks WHERE user_id = admin_user_id);
    RAISE NOTICE '- Updated % records in stock_analysis table', (SELECT COUNT(*) FROM public.stock_analysis WHERE user_id = admin_user_id);
END $$;

-- Verify the results
SELECT 'Stocks Table Status' as table_name, 
       COUNT(*) as total_records,
       COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
       COUNT(CASE WHEN user_id IS NULL THEN 1 END) as records_without_user_id
FROM public.stocks
UNION ALL
SELECT 'Stock Analysis Table' as table_name,
       COUNT(*) as total_records,
       COUNT(CASE WHEN user_id IS NOT NULL THEN 1 END) as records_with_user_id,
       COUNT(CASE WHEN user_id IS NULL THEN 1 END) as records_without_user_id
FROM public.stock_analysis; 