-- VA Manager Pro - Team System (Organizations)
-- À exécuter dans le SQL Editor de Supabase APRÈS le schema principal

-- Table: organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: organization_members (qui fait partie de quelle organisation)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Policies pour organizations
CREATE POLICY "Users can view their own organizations" ON organizations
    FOR SELECT
    USING (
        owner_id = auth.uid() OR
        id IN (SELECT organization_id FROM organization_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their organizations" ON organizations
    FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their organizations" ON organizations
    FOR DELETE
    USING (owner_id = auth.uid());

-- Policies pour organization_members
CREATE POLICY "Users can view members of their organizations" ON organization_members
    FOR SELECT
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can add members" ON organization_members
    FOR INSERT
    WITH CHECK (
        organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can remove members" ON organization_members
    FOR DELETE
    USING (
        organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    );

-- Fonction helper: obtenir l'organization_id d'un user
CREATE OR REPLACE FUNCTION get_user_organization_id(user_uuid UUID)
RETURNS UUID AS $$
BEGIN
    -- D'abord, chercher si l'user est propriétaire d'une org
    RETURN (
        SELECT id FROM organizations WHERE owner_id = user_uuid
        UNION
        SELECT organization_id FROM organization_members WHERE user_id = user_uuid
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: créer automatiquement une organisation quand un user s'inscrit
CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Créer une organisation pour le nouveau user
    INSERT INTO organizations (owner_id, name)
    VALUES (NEW.id, 'Mon Organisation');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: créer org automatiquement
CREATE OR REPLACE TRIGGER on_auth_user_created_create_org
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_organization_for_new_user();

-- Maintenant, MODIFIER toutes les tables existantes pour ajouter organization_id
-- Et MODIFIER les RLS policies pour partager les données au sein de l'organisation

-- Ajouter organization_id à toutes les tables
ALTER TABLE vas ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE creators ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE va_creators ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE gmail_accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE twitter_accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE instagram_accounts ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE revenues ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE twitter_stats ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Indexes pour organization_id
CREATE INDEX IF NOT EXISTS idx_vas_org_id ON vas(organization_id);
CREATE INDEX IF NOT EXISTS idx_creators_org_id ON creators(organization_id);
CREATE INDEX IF NOT EXISTS idx_gmail_org_id ON gmail_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_twitter_org_id ON twitter_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_instagram_org_id ON instagram_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_revenues_org_id ON revenues(organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_org_id ON payments(organization_id);
CREATE INDEX IF NOT EXISTS idx_twitter_stats_org_id ON twitter_stats(organization_id);

-- SUPPRIMER les anciennes policies (basées sur user_id)
DROP POLICY IF EXISTS "Users can view their own VAs" ON vas;
DROP POLICY IF EXISTS "Users can insert their own VAs" ON vas;
DROP POLICY IF EXISTS "Users can update their own VAs" ON vas;
DROP POLICY IF EXISTS "Users can delete their own VAs" ON vas;

DROP POLICY IF EXISTS "Users can view their own creators" ON creators;
DROP POLICY IF EXISTS "Users can insert their own creators" ON creators;
DROP POLICY IF EXISTS "Users can update their own creators" ON creators;
DROP POLICY IF EXISTS "Users can delete their own creators" ON creators;

DROP POLICY IF EXISTS "Users can view their own va_creators" ON va_creators;
DROP POLICY IF EXISTS "Users can insert their own va_creators" ON va_creators;
DROP POLICY IF EXISTS "Users can update their own va_creators" ON va_creators;
DROP POLICY IF EXISTS "Users can delete their own va_creators" ON va_creators;

DROP POLICY IF EXISTS "Users can view their own gmail accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Users can insert their own gmail accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Users can update their own gmail accounts" ON gmail_accounts;
DROP POLICY IF EXISTS "Users can delete their own gmail accounts" ON gmail_accounts;

DROP POLICY IF EXISTS "Users can view their own twitter accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Users can insert their own twitter accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Users can update their own twitter accounts" ON twitter_accounts;
DROP POLICY IF EXISTS "Users can delete their own twitter accounts" ON twitter_accounts;

DROP POLICY IF EXISTS "Users can view their own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can insert their own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can update their own instagram accounts" ON instagram_accounts;
DROP POLICY IF EXISTS "Users can delete their own instagram accounts" ON instagram_accounts;

DROP POLICY IF EXISTS "Users can view their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "Users can view their own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can insert their own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can update their own revenues" ON revenues;
DROP POLICY IF EXISTS "Users can delete their own revenues" ON revenues;

DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
DROP POLICY IF EXISTS "Users can update their own payments" ON payments;
DROP POLICY IF EXISTS "Users can delete their own payments" ON payments;

DROP POLICY IF EXISTS "Users can view their own twitter stats" ON twitter_stats;
DROP POLICY IF EXISTS "Users can insert their own twitter stats" ON twitter_stats;
DROP POLICY IF EXISTS "Users can update their own twitter stats" ON twitter_stats;
DROP POLICY IF EXISTS "Users can delete their own twitter stats" ON twitter_stats;

-- CRÉER les nouvelles policies (basées sur organization_id)

-- VAs
CREATE POLICY "Members can view organization VAs" ON vas
    FOR SELECT
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can insert organization VAs" ON vas
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can update organization VAs" ON vas
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Members can delete organization VAs" ON vas
    FOR DELETE
    USING (
        organization_id IN (
            SELECT id FROM organizations WHERE owner_id = auth.uid()
            UNION
            SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
        )
    );

-- Creators (même pattern)
CREATE POLICY "Members can view organization creators" ON creators FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization creators" ON creators FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization creators" ON creators FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization creators" ON creators FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- VA Creators
CREATE POLICY "Members can view organization va_creators" ON va_creators FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization va_creators" ON va_creators FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization va_creators" ON va_creators FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization va_creators" ON va_creators FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Gmail Accounts
CREATE POLICY "Members can view organization gmail_accounts" ON gmail_accounts FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization gmail_accounts" ON gmail_accounts FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization gmail_accounts" ON gmail_accounts FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization gmail_accounts" ON gmail_accounts FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Twitter Accounts
CREATE POLICY "Members can view organization twitter_accounts" ON twitter_accounts FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization twitter_accounts" ON twitter_accounts FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization twitter_accounts" ON twitter_accounts FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization twitter_accounts" ON twitter_accounts FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Instagram Accounts
CREATE POLICY "Members can view organization instagram_accounts" ON instagram_accounts FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization instagram_accounts" ON instagram_accounts FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization instagram_accounts" ON instagram_accounts FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization instagram_accounts" ON instagram_accounts FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Subscriptions
CREATE POLICY "Members can view organization subscriptions" ON subscriptions FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization subscriptions" ON subscriptions FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization subscriptions" ON subscriptions FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization subscriptions" ON subscriptions FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Revenues
CREATE POLICY "Members can view organization revenues" ON revenues FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization revenues" ON revenues FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization revenues" ON revenues FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization revenues" ON revenues FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Payments
CREATE POLICY "Members can view organization payments" ON payments FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization payments" ON payments FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization payments" ON payments FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization payments" ON payments FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Twitter Stats
CREATE POLICY "Members can view organization twitter_stats" ON twitter_stats FOR SELECT USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can insert organization twitter_stats" ON twitter_stats FOR INSERT WITH CHECK (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can update organization twitter_stats" ON twitter_stats FOR UPDATE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete organization twitter_stats" ON twitter_stats FOR DELETE USING (organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid() UNION SELECT organization_id FROM organization_members WHERE user_id = auth.uid()));

-- Migrer les données existantes : mettre organization_id pour toutes les lignes existantes
-- (à exécuter manuellement après pour chaque user existant)
DO $$
DECLARE
    user_record RECORD;
    org_id UUID;
BEGIN
    FOR user_record IN SELECT id FROM auth.users LOOP
        -- Trouver ou créer l'organisation de l'user
        SELECT id INTO org_id FROM organizations WHERE owner_id = user_record.id LIMIT 1;

        IF org_id IS NOT NULL THEN
            -- Mettre à jour toutes les données de cet user
            UPDATE vas SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE creators SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE va_creators SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE gmail_accounts SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE twitter_accounts SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE instagram_accounts SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE subscriptions SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE revenues SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE payments SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
            UPDATE twitter_stats SET organization_id = org_id WHERE user_id = user_record.id AND organization_id IS NULL;
        END IF;
    END LOOP;
END $$;

-- Tout est prêt ! 🎉
