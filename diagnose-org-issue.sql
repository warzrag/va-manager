-- Diagnostic complet pour comprendre le problème avec organizations

-- 1. Vérifier les policies actuelles sur organizations
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'organizations';

-- 2. Vérifier si RLS est activé
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'organizations';

-- 3. Vérifier les données existantes (sans RLS)
SET LOCAL ROLE postgres;
SELECT id, name, owner_id, created_at
FROM organizations;
RESET ROLE;

-- 4. Tester la fonction user_has_access_to_org
SELECT user_has_access_to_org('e78e20c1-9c57-41bc-9744-ed6b8f0f1908');

-- 5. Vérifier si la fonction existe
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'user_has_access_to_org';
