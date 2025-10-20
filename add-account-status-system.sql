-- ============================================================================
-- SYSTÈME DE STATUT ET NOTES POUR LES COMPTES SOCIAUX
-- ============================================================================

-- 1. Créer le type enum pour les statuts
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'banned', 'suspended', 'warning', 'paused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Ajouter les colonnes à instagram_accounts
ALTER TABLE instagram_accounts
ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Ajouter les colonnes à twitter_accounts
ALTER TABLE twitter_accounts
ADD COLUMN IF NOT EXISTS status account_status DEFAULT 'active',
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS last_status_update TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Créer un index pour les recherches par statut
CREATE INDEX IF NOT EXISTS idx_instagram_status ON instagram_accounts(status);
CREATE INDEX IF NOT EXISTS idx_twitter_status ON twitter_accounts(status);

-- 5. Créer une fonction trigger pour mettre à jour last_status_update
CREATE OR REPLACE FUNCTION update_account_status_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status IS DISTINCT FROM OLD.status) OR (NEW.notes IS DISTINCT FROM OLD.notes) THEN
        NEW.last_status_update = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Créer les triggers
DROP TRIGGER IF EXISTS instagram_status_update ON instagram_accounts;
CREATE TRIGGER instagram_status_update
    BEFORE UPDATE ON instagram_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_account_status_timestamp();

DROP TRIGGER IF EXISTS twitter_status_update ON twitter_accounts;
CREATE TRIGGER twitter_status_update
    BEFORE UPDATE ON twitter_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_account_status_timestamp();

-- 7. Mettre à jour les RLS policies pour permettre aux VAs de modifier le statut
-- Instagram
DROP POLICY IF EXISTS instagram_update_policy ON instagram_accounts;
CREATE POLICY instagram_update_policy ON instagram_accounts
FOR UPDATE
USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM vas WHERE user_id = auth.uid())
)
WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM vas WHERE user_id = auth.uid())
);

-- Twitter
DROP POLICY IF EXISTS twitter_update_policy ON twitter_accounts;
CREATE POLICY twitter_update_policy ON twitter_accounts
FOR UPDATE
USING (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM vas WHERE user_id = auth.uid())
)
WITH CHECK (
    organization_id IN (SELECT id FROM organizations WHERE owner_id = auth.uid())
    OR organization_id IN (SELECT organization_id FROM vas WHERE user_id = auth.uid())
);

-- 8. Vérifier les modifications
SELECT
    'instagram_accounts' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'instagram_accounts'
  AND column_name IN ('status', 'notes', 'last_status_update')
UNION ALL
SELECT
    'twitter_accounts' as table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'twitter_accounts'
  AND column_name IN ('status', 'notes', 'last_status_update')
ORDER BY table_name, column_name;
