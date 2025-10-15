-- Fix complet et définitif pour organizations
-- On va tout nettoyer et recréer proprement

-- 1. Supprimer TOUTES les policies sur organizations
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Members can view organization VAs" ON organizations;

-- 2. Désactiver temporairement RLS
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- 3. Réactiver RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 4. Créer des policies ultra-simples SANS fonction
CREATE POLICY "view_own_org" ON organizations
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

CREATE POLICY "create_org" ON organizations
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "update_own_org" ON organizations
    FOR UPDATE
    USING (owner_id = auth.uid());

CREATE POLICY "delete_own_org" ON organizations
    FOR DELETE
    USING (owner_id = auth.uid());

-- 5. Test final
SELECT id, name, owner_id, created_at
FROM organizations
LIMIT 5;
