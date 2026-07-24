-- Restore founder/admin access to every organization.
-- Run this in the Supabase SQL Editor for the project:
-- https://vjsovnhmjgehqawjmqxn.supabase.co

CREATE OR REPLACE FUNCTION is_platform_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.jwt() ->> 'email' = 'florent.media2@gmail.com';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION user_has_access_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM organizations
            WHERE id = org_id AND owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_id = org_id AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM managers
            WHERE organization_id = org_id AND user_id = auth.uid()
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "view_own_org" ON organizations;
DROP POLICY IF EXISTS "platform_admin_view_orgs" ON organizations;

CREATE POLICY "platform_admin_view_orgs" ON organizations
    FOR SELECT
    USING (
        is_platform_admin()
        OR owner_id = auth.uid()
        OR id IN (
            SELECT organization_id
            FROM organization_members
            WHERE user_id = auth.uid()
        )
        OR id IN (
            SELECT organization_id
            FROM managers
            WHERE user_id = auth.uid()
        )
    );

-- Keep organization data policies aligned with the helper above.
DROP POLICY IF EXISTS "Members can view organization VAs" ON vas;
CREATE POLICY "Members can view organization VAs" ON vas
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization creators" ON creators;
CREATE POLICY "Members can view organization creators" ON creators
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization va_creators" ON va_creators;
CREATE POLICY "Members can view organization va_creators" ON va_creators
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization gmail_accounts" ON gmail_accounts;
CREATE POLICY "Members can view organization gmail_accounts" ON gmail_accounts
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization twitter_accounts" ON twitter_accounts;
CREATE POLICY "Members can view organization twitter_accounts" ON twitter_accounts
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization instagram_accounts" ON instagram_accounts;
CREATE POLICY "Members can view organization instagram_accounts" ON instagram_accounts
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization subscriptions" ON subscriptions;
CREATE POLICY "Members can view organization subscriptions" ON subscriptions
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization revenues" ON revenues;
CREATE POLICY "Members can view organization revenues" ON revenues
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization payments" ON payments;
CREATE POLICY "Members can view organization payments" ON payments
    FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can view organization twitter_stats" ON twitter_stats;
CREATE POLICY "Members can view organization twitter_stats" ON twitter_stats
    FOR SELECT USING (user_has_access_to_org(organization_id));

SELECT id, name, owner_id, created_at
FROM organizations
ORDER BY name;
