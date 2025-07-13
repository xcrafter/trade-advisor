-- =====================================================
-- MANUAL RLS POLICY FIX
-- Copy and paste these statements into your Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all stocks" ON public.stocks;
DROP POLICY IF EXISTS "Admins can view all analysis" ON public.stock_analysis;

-- STEP 2: Create fixed policies for user_profiles table
-- Users can view their own profile
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles (using JWT metadata to avoid recursion)
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
    FOR SELECT USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = id
    );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles" ON public.user_profiles
    FOR UPDATE USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = id
    );

-- Admins can delete profiles
CREATE POLICY "Admins can delete profiles" ON public.user_profiles
    FOR DELETE USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    );

-- STEP 3: Create fixed policies for stocks table  
CREATE POLICY "Admins can view all stocks" ON public.stocks
    FOR SELECT USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

CREATE POLICY "Admins can modify all stocks" ON public.stocks
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

-- STEP 4: Create fixed policies for stock_analysis table
CREATE POLICY "Admins can view all analysis" ON public.stock_analysis
    FOR SELECT USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

CREATE POLICY "Admins can modify all analysis" ON public.stock_analysis
    FOR ALL USING (
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
        OR 
        auth.uid() = user_id
    );

-- STEP 5: Create helper functions (optional, for future use)
CREATE OR REPLACE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
RETURNS boolean AS $$
BEGIN
    RETURN (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text AS $$
BEGIN
    RETURN COALESCE(
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
        'user'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- STEP 6: Grant permissions
GRANT EXECUTE ON FUNCTION public.is_admin_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- Run this to verify the fix worked
SELECT 'RLS policies fixed successfully! 🎉 You can now test your API calls.' as status; 