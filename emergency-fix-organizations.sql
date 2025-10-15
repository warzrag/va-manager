-- ============================================================================
-- EMERGENCY FIX FOR ORGANIZATIONS TABLE - 500 ERROR RESOLUTION
-- ============================================================================
-- This script completely resets the organizations table to eliminate all
-- potential sources of 500 errors including:
-- - Recursive/circular RLS policies
-- - Problematic triggers
-- - Security definer functions causing issues
-- - Any lingering policies even when RLS is disabled
-- ============================================================================

-- STEP 1: DROP ALL POLICIES (even if RLS is disabled, policies can still cause issues)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on organizations table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON organizations';
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- STEP 2: DISABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- STEP 3: DROP PROBLEMATIC FUNCTIONS THAT USE SECURITY DEFINER
-- ============================================================================
DROP FUNCTION IF EXISTS user_has_access_to_org(UUID);
DROP FUNCTION IF EXISTS get_user_organization_id(UUID);

-- STEP 4: CHECK FOR AND DROP ANY TRIGGERS ON ORGANIZATIONS
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name FROM information_schema.triggers
              WHERE event_object_table = 'organizations' AND trigger_schema = 'public')
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || r.trigger_name || ' ON organizations';
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- STEP 5: VERIFY TABLE STRUCTURE IS INTACT
-- ============================================================================
-- Check that the table exists and has the correct columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- STEP 6: CHECK EXISTING DATA
-- ============================================================================
-- Verify that data exists and is accessible
SELECT
    COUNT(*) as total_orgs,
    COUNT(DISTINCT owner_id) as unique_owners
FROM organizations;

-- Show sample data (first 5 rows)
SELECT
    id,
    name,
    owner_id,
    created_at,
    updated_at
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- STEP 7: VERIFY THE SPECIFIC ORGANIZATION EXISTS
-- ============================================================================
SELECT
    id,
    name,
    owner_id,
    created_at,
    updated_at
FROM organizations
WHERE id = 'e78e20c1-9c57-41bc-9744-ed6b8f0f1908';

-- STEP 8: CHECK FOR ANY FOREIGN KEY ISSUES
-- ============================================================================
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'organizations'
    AND tc.constraint_type = 'FOREIGN KEY';

-- STEP 9: TEST BASIC QUERIES
-- ============================================================================
-- Test 1: Simple SELECT (should work now)
SELECT id, name FROM organizations LIMIT 1;

-- Test 2: SELECT with WHERE clause
SELECT id, name FROM organizations WHERE owner_id IS NOT NULL LIMIT 1;

-- Test 3: COUNT query
SELECT COUNT(*) FROM organizations;

-- STEP 10: VERIFY RLS STATUS
-- ============================================================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN 'ENABLED - This may cause issues'
        ELSE 'DISABLED - Good for debugging'
    END as status
FROM pg_tables
WHERE tablename = 'organizations';

-- STEP 11: CHECK FOR ANY REMAINING POLICIES
-- ============================================================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'organizations';

-- STEP 12: DIAGNOSE POTENTIAL ISSUES WITH REST API
-- ============================================================================
-- Check if there are any grants issues
SELECT
    grantee,
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'organizations'
    AND table_schema = 'public';

-- ============================================================================
-- FINAL STATUS REPORT
-- ============================================================================
DO $$
DECLARE
    org_count INTEGER;
    rls_status BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Get counts
    SELECT COUNT(*) INTO org_count FROM organizations;
    SELECT rowsecurity INTO rls_status FROM pg_tables WHERE tablename = 'organizations';
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE tablename = 'organizations';

    -- Print report
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ORGANIZATIONS TABLE - STATUS REPORT';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Total organizations in table: %', org_count;
    RAISE NOTICE 'RLS Status: %', CASE WHEN rls_status THEN 'ENABLED' ELSE 'DISABLED' END;
    RAISE NOTICE 'Active policies: %', policy_count;
    RAISE NOTICE '============================================================';

    IF rls_status THEN
        RAISE WARNING 'RLS is still ENABLED. For REST API access without auth, RLS should be DISABLED.';
    END IF;

    IF policy_count > 0 THEN
        RAISE WARNING 'There are still % active policies. These may cause issues.', policy_count;
    END IF;

    IF NOT rls_status AND policy_count = 0 THEN
        RAISE NOTICE 'SUCCESS: Table is clean with RLS disabled and no policies.';
    END IF;
END $$;

-- ============================================================================
-- OPTIONAL: RE-ENABLE RLS WITH SIMPLE POLICIES (ONLY IF NEEDED)
-- ============================================================================
-- Uncomment the following section ONLY if you want to re-enable RLS with
-- simplified policies that won't cause recursion issues:

/*
-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Create a simple policy for authenticated users only
CREATE POLICY "authenticated_users_all_access" ON organizations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- OR create owner-based policies (safer, but requires authentication)
CREATE POLICY "owners_can_view" ON organizations
    FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "owners_can_insert" ON organizations
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_can_update" ON organizations
    FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "owners_can_delete" ON organizations
    FOR DELETE
    USING (owner_id = auth.uid());
*/

-- ============================================================================
-- TESTING INSTRUCTIONS
-- ============================================================================
-- After running this script:
--
-- 1. Test via SQL Editor:
--    SELECT * FROM organizations LIMIT 5;
--
-- 2. Test via REST API (anonymous):
--    curl https://vjsovnhmjgehqawjmqxn.supabase.co/rest/v1/organizations \
--         -H "apikey: YOUR_ANON_KEY"
--
-- 3. Test via REST API (authenticated):
--    curl https://vjsovnhmjgehqawjmqxn.supabase.co/rest/v1/organizations \
--         -H "apikey: YOUR_ANON_KEY" \
--         -H "Authorization: Bearer YOUR_USER_JWT"
--
-- 4. If you get 200 response with empty array [], the issue is with RLS policies
--    and authentication, not with the table itself.
--
-- 5. If you still get 500 error, check Supabase logs for specific error message.
-- ============================================================================
