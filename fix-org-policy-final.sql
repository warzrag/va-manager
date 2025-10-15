-- Fix final pour la policy organizations
-- Désactiver temporairement RLS pour organizations pour voir si c'est le problème

-- Option 1: Désactiver complètement RLS sur organizations (temporaire pour tester)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Option 2: Si vous voulez garder RLS, utiliser une policy ultra-simple
DROP POLICY IF EXISTS "Users can view their own organizations" ON organizations;

CREATE POLICY "Users can view their own organizations" ON organizations
    FOR SELECT
    USING (owner_id = auth.uid());

-- Policy pour insérer
DROP POLICY IF EXISTS "Users can create organizations" ON organizations;
CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Policy pour update
DROP POLICY IF EXISTS "Owners can update their organizations" ON organizations;
CREATE POLICY "Owners can update their organizations" ON organizations
    FOR UPDATE
    USING (owner_id = auth.uid());

-- Policy pour delete
DROP POLICY IF EXISTS "Owners can delete their organizations" ON organizations;
CREATE POLICY "Owners can delete their organizations" ON organizations
    FOR DELETE
    USING (owner_id = auth.uid());

-- Réactiver RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Test: vérifier que ça fonctionne
SELECT
    id,
    name,
    owner_id,
    created_at
FROM organizations
WHERE owner_id = auth.uid()
LIMIT 5;
