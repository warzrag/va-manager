-- ============================================================================
-- RÉPARATION DU COMPTE jaja@test.com
-- ============================================================================
--
-- PROBLÈME: Le compte jaja@test.com existe dans auth.users mais le VA
-- correspondant dans la table vas n'a pas de user_id, donc les RLS policies
-- bloquent l'accès.
--
-- SOLUTION: Lier le VA jaja au bon user_id depuis auth.users
-- ============================================================================

-- Étape 1: Vérifier si le compte auth existe
SELECT
    id,
    email,
    created_at,
    raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'jaja@test.com';

-- Étape 2: Vérifier le VA dans la table vas
SELECT
    id,
    name,
    user_id,
    email,
    organization_id,
    created_at
FROM public.vas
WHERE name ILIKE '%jaja%' OR email ILIKE '%jaja%';

-- Étape 3: RÉPARER - Lier le VA au compte auth
UPDATE public.vas
SET user_id = (SELECT id FROM auth.users WHERE email = 'jaja@test.com')
WHERE name ILIKE '%jaja%' OR email = 'jaja@test.com';

-- Étape 4: Vérifier la réparation
SELECT
    v.id as va_id,
    v.name as va_name,
    v.user_id,
    v.email as va_email,
    u.email as auth_email,
    o.name as organization
FROM public.vas v
LEFT JOIN auth.users u ON v.user_id = u.id
LEFT JOIN public.organizations o ON v.organization_id = o.id
WHERE v.name ILIKE '%jaja%' OR v.email ILIKE '%jaja%';

-- Étape 5: Tester l'accès RLS
-- Connecte-toi avec jaja@test.com dans l'app et vérifie que tu peux voir tes données
