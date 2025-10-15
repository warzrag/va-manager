-- ================================================================
-- DEEP CLEAN: Organizations Table - Complete Fix for HTTP 500
-- ================================================================
-- This script completely removes all dependencies, policies, and
-- functions that may be causing the organizations table to return
-- HTTP 500 errors, even when RLS is disabled.
--
-- ROOT CAUSE IDENTIFIED:
-- The user_has_access_to_org() function creates a circular dependency
-- by querying the organizations table within policies that are applied
-- to the organizations table itself, causing infinite recursion.
-- Even with RLS disabled, the function may still be invoked by other
-- table policies, creating cascading failures.
-- ================================================================

-- ================================================================
-- STEP 1: DROP THE PROBLEMATIC FUNCTION
-- ================================================================
-- This function is the root cause of the 500 error. It queries the
-- organizations table and is used in RLS policies on OTHER tables,
-- which creates a circular dependency when those tables reference
-- organizations through foreign keys.

DROP FUNCTION IF EXISTS user_has_access_to_org(UUID);
DROP FUNCTION IF EXISTS user_has_access_to_org(UUID) CASCADE;

-- Also drop other helper functions that might reference organizations
DROP FUNCTION IF EXISTS get_user_organization_id(UUID);
DROP FUNCTION IF EXISTS get_user_organization_id(UUID) CASCADE;
DROP FUNCTION IF EXISTS create_organization_for_new_user();
DROP FUNCTION IF EXISTS create_organization_for_new_user() CASCADE;

-- ================================================================
-- STEP 2: DROP ALL TRIGGERS ON ORGANIZATIONS
-- ================================================================
-- Remove any triggers that might be causing issues

DROP TRIGGER IF EXISTS on_auth_user_created_create_org ON auth.users;
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;

-- ================================================================
-- STEP 3: DROP ALL POLICIES ON ORGANIZATIONS
-- ================================================================
-- Remove all RLS policies, even if they appear to be disabled

DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view organization VAs" ON organizations;
DROP POLICY IF EXISTS "view_own_org" ON organizations;
DROP POLICY IF EXISTS "create_org" ON organizations;
DROP POLICY IF EXISTS "update_own_org" ON organizations;
DROP POLICY IF EXISTS "delete_own_org" ON organizations;

-- ================================================================
-- STEP 4: DROP ALL POLICIES ON RELATED TABLES THAT USE THE FUNCTION
-- ================================================================
-- These policies use user_has_access_to_org() which no longer exists
-- We need to drop them to prevent errors

-- VAs
DROP POLICY IF EXISTS "Members can view organization VAs" ON vas;
DROP POLICY IF EXISTS "Members can insert organization VAs" ON vas;
DROP POLICY IF EXISTS "Members can update organization VAs" ON vas;
DROP POLICY IF EXISTS "Members can delete organization VAs" ON vas;

-- Creators
DROP POLICY IF EXISTS "Members can view organization creators" ON creators;
DROP POLICY IF EXISTS "Members can insert organization creators" ON creators;
DROP POLICY IF EXISTS "Members can update organization creators" ON creators;
DROP POLICY IF EXISTS "Members can delete organization creators" ON creators;

-- VA Creators
DROP POLICY IF EXISTS "Members can view organization va_creators" ON va_creators;
DROP POLICY IF EXISTS "Members can insert organization va_creators" ON va_creators;
DROP POLICY IF EXISTS "Members can update organization va_creators" ON va_creators;
DROP POLICY IF EXISTS "Members can delete organization va_creators" ON va_creators;

-- Gmail Accounts
DROP POLICY IF EXISTS "Members can view organization gmail_accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Members can insert organization gmail_accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Members can update organization gmail_accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Members can delete organization gmail_accounts" ON gmail_accounts;

-- Twitter Accounts
DROP POLICY IF EXISTS "Members can view organization twitter_accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Members can insert organization twitter_accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Members can update organization twitter_accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Members can delete organization twitter_accounts" ON twitter_accounts;

-- Instagram Accounts
DROP POLICY IF EXISTS "Members can view organization instagram_accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Members can insert organization instagram_accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Members can update organization instagram_accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Members can delete organization instagram_accounts" ON instagram_accounts;

-- Subscriptions
DROP POLICY IF EXISTS "Members can view organization subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Members can insert organization subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Members can update organization subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Members can delete organization subscriptions" ON subscriptions;

-- Revenues
DROP POLICY IF EXISTS "Members can view organization revenues" ON revenues;
DROP POLICY IF EXISTS "Members can insert organization revenues" ON revenues;
DROP POLICY IF EXISTS "Members can update organization revenues" ON revenues;
DROP POLICY IF EXISTS "Members can delete organization revenues" ON revenues;

-- Payments
DROP POLICY IF EXISTS "Members can view organization payments" ON payments;
DROP POLICY IF EXISTS "Members can insert organization payments" ON payments;
DROP POLICY IF EXISTS "Members can update organization payments" ON payments;
DROP POLICY IF EXISTS "Members can delete organization payments" ON payments;

-- Twitter Stats
DROP POLICY IF EXISTS "Members can view organization twitter_stats" ON twitter_stats;
DROP POLICY IF EXISTS "Members can insert organization twitter_stats" ON twitter_stats;
DROP POLICY IF EXISTS "Members can update organization twitter_stats" ON twitter_stats;
DROP POLICY IF EXISTS "Members can delete organization twitter_stats" ON twitter_stats;

-- ================================================================
-- STEP 5: ENSURE RLS IS DISABLED ON ORGANIZATIONS
-- ================================================================
-- Make absolutely sure RLS is disabled

ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 6: DIAGNOSTIC QUERIES
-- ================================================================
-- Run these to verify the clean state

-- Check if any policies still exist on organizations
SELECT 'Remaining policies on organizations:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'organizations';

-- Check if any functions still reference organizations
SELECT 'Functions that might reference organizations:' as info;
SELECT proname, prosrc
FROM pg_proc
WHERE prosrc ILIKE '%organizations%'
  AND proname NOT LIKE 'pg_%';

-- Check RLS status
SELECT 'RLS status on organizations:' as info;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'organizations';

-- Check for triggers on organizations
SELECT 'Triggers on organizations:' as info;
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'organizations'::regclass
  AND tgname NOT LIKE 'pg_%'
  AND tgname NOT LIKE 'RI_%';

-- ================================================================
-- STEP 7: TEST QUERY
-- ================================================================
-- This should now work without 500 error

SELECT 'Testing organizations table access:' as info;
SELECT id, name, owner_id, created_at
FROM organizations
LIMIT 5;

-- ================================================================
-- NEXT STEPS AFTER RUNNING THIS SCRIPT:
-- ================================================================
-- 1. Test the organizations table via Supabase API
-- 2. If it works, you can re-enable RLS with SIMPLE policies
--    (avoid circular dependencies - never query organizations
--    FROM a policy ON organizations)
-- 3. Recreate the user_has_access_to_org function ONLY for use
--    in OTHER tables' policies, NOT on organizations itself
-- 4. Recreate policies on child tables using the function
-- ================================================================

-- ================================================================
-- OPTIONAL: RECREATE SIMPLE POLICIES (Only run if needed)
-- ================================================================
-- Uncomment these if you want to re-enable RLS with safe policies

/*
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Simple policy without recursion - direct column check only
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR
        id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update organizations" ON organizations
    FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete organizations" ON organizations
    FOR DELETE
    USING (owner_id = auth.uid());
*/

-- ================================================================
-- OPTIONAL: RECREATE HELPER FUNCTION (Only run if needed)
-- ================================================================
-- This version is safe for use in OTHER tables' policies

/*
CREATE OR REPLACE FUNCTION user_has_access_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user owns the org OR is a member
    RETURN EXISTS (
        SELECT 1 FROM organizations
        WHERE id = org_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION user_has_access_to_org(UUID) TO authenticated;
*/

-- ================================================================
-- END OF SCRIPT
-- ================================================================
