-- Fix pour les policies de récursion infinie
-- Corriger la policy "Users can view their own organizations"

-- Supprimer l'ancienne policy problématique
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;

-- Créer une nouvelle policy simple sans récursion
CREATE POLICY "Users can view their own organizations" ON organizations
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR
        EXISTS (
            SELECT 1 FROM organization_members
            WHERE organization_members.organization_id = organizations.id
            AND organization_members.user_id = auth.uid()
        )
    );

-- Vérifier que toutes les policies sur les autres tables sont correctes
-- Si ça ne marche toujours pas, simplifier davantage en utilisant une fonction

-- Créer une fonction helper sécurisée
CREATE OR REPLACE FUNCTION user_has_access_to_org(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organizations
        WHERE id = org_id AND owner_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM organization_members
        WHERE organization_id = org_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Maintenant recréer TOUTES les policies avec cette fonction

-- VAs
DROP POLICY IF EXISTS "Members can view organization VAs" ON vas;
CREATE POLICY "Members can view organization VAs" ON vas
    FOR SELECT
    USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization VAs" ON vas;
CREATE POLICY "Members can insert organization VAs" ON vas
    FOR INSERT
    WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization VAs" ON vas;
CREATE POLICY "Members can update organization VAs" ON vas
    FOR UPDATE
    USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization VAs" ON vas;
CREATE POLICY "Members can delete organization VAs" ON vas
    FOR DELETE
    USING (user_has_access_to_org(organization_id));

-- Creators
DROP POLICY IF EXISTS "Members can view organization creators" ON creators;
CREATE POLICY "Members can view organization creators" ON creators FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization creators" ON creators;
CREATE POLICY "Members can insert organization creators" ON creators FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization creators" ON creators;
CREATE POLICY "Members can update organization creators" ON creators FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization creators" ON creators;
CREATE POLICY "Members can delete organization creators" ON creators FOR DELETE USING (user_has_access_to_org(organization_id));

-- VA Creators
DROP POLICY IF EXISTS "Members can view organization va_creators" ON va_creators;
CREATE POLICY "Members can view organization va_creators" ON va_creators FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization va_creators" ON va_creators;
CREATE POLICY "Members can insert organization va_creators" ON va_creators FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization va_creators" ON va_creators;
CREATE POLICY "Members can update organization va_creators" ON va_creators FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization va_creators" ON va_creators;
CREATE POLICY "Members can delete organization va_creators" ON va_creators FOR DELETE USING (user_has_access_to_org(organization_id));

-- Gmail Accounts
DROP POLICY IF EXISTS "Members can view organization gmail_accounts" ON gmail_accounts;
CREATE POLICY "Members can view organization gmail_accounts" ON gmail_accounts FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization gmail_accounts" ON gmail_accounts;
CREATE POLICY "Members can insert organization gmail_accounts" ON gmail_accounts FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization gmail_accounts" ON gmail_accounts;
CREATE POLICY "Members can update organization gmail_accounts" ON gmail_accounts FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization gmail_accounts" ON gmail_accounts;
CREATE POLICY "Members can delete organization gmail_accounts" ON gmail_accounts FOR DELETE USING (user_has_access_to_org(organization_id));

-- Twitter Accounts
DROP POLICY IF EXISTS "Members can view organization twitter_accounts" ON twitter_accounts;
CREATE POLICY "Members can view organization twitter_accounts" ON twitter_accounts FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization twitter_accounts" ON twitter_accounts;
CREATE POLICY "Members can insert organization twitter_accounts" ON twitter_accounts FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization twitter_accounts" ON twitter_accounts;
CREATE POLICY "Members can update organization twitter_accounts" ON twitter_accounts FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization twitter_accounts" ON twitter_accounts;
CREATE POLICY "Members can delete organization twitter_accounts" ON twitter_accounts FOR DELETE USING (user_has_access_to_org(organization_id));

-- Instagram Accounts
DROP POLICY IF EXISTS "Members can view organization instagram_accounts" ON instagram_accounts;
CREATE POLICY "Members can view organization instagram_accounts" ON instagram_accounts FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization instagram_accounts" ON instagram_accounts;
CREATE POLICY "Members can insert organization instagram_accounts" ON instagram_accounts FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization instagram_accounts" ON instagram_accounts;
CREATE POLICY "Members can update organization instagram_accounts" ON instagram_accounts FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization instagram_accounts" ON instagram_accounts;
CREATE POLICY "Members can delete organization instagram_accounts" ON instagram_accounts FOR DELETE USING (user_has_access_to_org(organization_id));

-- Subscriptions
DROP POLICY IF EXISTS "Members can view organization subscriptions" ON subscriptions;
CREATE POLICY "Members can view organization subscriptions" ON subscriptions FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization subscriptions" ON subscriptions;
CREATE POLICY "Members can insert organization subscriptions" ON subscriptions FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization subscriptions" ON subscriptions;
CREATE POLICY "Members can update organization subscriptions" ON subscriptions FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization subscriptions" ON subscriptions;
CREATE POLICY "Members can delete organization subscriptions" ON subscriptions FOR DELETE USING (user_has_access_to_org(organization_id));

-- Revenues
DROP POLICY IF EXISTS "Members can view organization revenues" ON revenues;
CREATE POLICY "Members can view organization revenues" ON revenues FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization revenues" ON revenues;
CREATE POLICY "Members can insert organization revenues" ON revenues FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization revenues" ON revenues;
CREATE POLICY "Members can update organization revenues" ON revenues FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization revenues" ON revenues;
CREATE POLICY "Members can delete organization revenues" ON revenues FOR DELETE USING (user_has_access_to_org(organization_id));

-- Payments
DROP POLICY IF EXISTS "Members can view organization payments" ON payments;
CREATE POLICY "Members can view organization payments" ON payments FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization payments" ON payments;
CREATE POLICY "Members can insert organization payments" ON payments FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization payments" ON payments;
CREATE POLICY "Members can update organization payments" ON payments FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization payments" ON payments;
CREATE POLICY "Members can delete organization payments" ON payments FOR DELETE USING (user_has_access_to_org(organization_id));

-- Twitter Stats
DROP POLICY IF EXISTS "Members can view organization twitter_stats" ON twitter_stats;
CREATE POLICY "Members can view organization twitter_stats" ON twitter_stats FOR SELECT USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can insert organization twitter_stats" ON twitter_stats;
CREATE POLICY "Members can insert organization twitter_stats" ON twitter_stats FOR INSERT WITH CHECK (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can update organization twitter_stats" ON twitter_stats;
CREATE POLICY "Members can update organization twitter_stats" ON twitter_stats FOR UPDATE USING (user_has_access_to_org(organization_id));

DROP POLICY IF EXISTS "Members can delete organization twitter_stats" ON twitter_stats;
CREATE POLICY "Members can delete organization twitter_stats" ON twitter_stats FOR DELETE USING (user_has_access_to_org(organization_id));

-- Succès ! Les policies sont maintenant non-récursives
