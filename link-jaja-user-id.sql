-- ============================================================================
-- LIER LE COMPTE AUTH JAJA AU VA EXISTANT
-- ============================================================================
--
-- CONTEXTE: Le compte auth existe maintenant avec l'ID:
-- 86d5e231-e77f-44c8-a499-249fc6fce191
--
-- Mais le VA JAJA a toujours user_id = NULL à cause des RLS policies
-- qui bloquent la mise à jour depuis le client.
--
-- SOLUTION: Exécuter cette mise à jour directement dans le SQL Editor
-- de Supabase (qui bypass les RLS policies)
-- ============================================================================

-- Mise à jour du VA JAJA avec le user_id correct
UPDATE public.vas
SET user_id = '86d5e231-e77f-44c8-a499-249fc6fce191'
WHERE id = '18259750-03f5-47a8-a609-91c8336d03e2'
  AND name = 'JAJA'
  AND email = 'jaja@test.com';

-- Vérification
SELECT
    v.id as va_id,
    v.name,
    v.email as va_email,
    v.user_id,
    u.email as auth_email,
    u.id as auth_id,
    o.name as organization
FROM public.vas v
LEFT JOIN auth.users u ON v.user_id = u.id
LEFT JOIN public.organizations o ON v.organization_id = o.id
WHERE v.id = '18259750-03f5-47a8-a609-91c8336d03e2';

-- Résultat attendu:
-- va_id: 18259750-03f5-47a8-a609-91c8336d03e2
-- name: JAJA
-- va_email: jaja@test.com
-- user_id: 86d5e231-e77f-44c8-a499-249fc6fce191  ✅ (doit être non-null)
-- auth_email: jaja@test.com
-- auth_id: 86d5e231-e77f-44c8-a499-249fc6fce191
-- organization: Agence LENY
