-- ============================================================================
-- Créer un utilisateur propriétaire pour l'organisation Agence Flo
-- ============================================================================

-- 1. Trouver l'ID de l'organisation Agence Flo
DO $$
DECLARE
    flo_org_id UUID;
    flo_user_id UUID;
BEGIN
    -- Récupérer l'ID de l'organisation Agence Flo
    SELECT id INTO flo_org_id
    FROM public.organizations
    WHERE name = 'Agence Flo'
    LIMIT 1;

    IF flo_org_id IS NULL THEN
        RAISE EXCEPTION 'Organisation "Agence Flo" not found';
    END IF;

    RAISE NOTICE 'Organisation Agence Flo trouvée: %', flo_org_id;

    -- Créer un user_id temporaire pour Flo (UUID fixe pour ce compte)
    -- Ce sera le compte admin de Flo
    flo_user_id := gen_random_uuid();

    RAISE NOTICE 'User ID créé pour Flo: %', flo_user_id;

    -- Mettre à jour l'organisation avec l'owner_id
    UPDATE public.organizations
    SET owner_id = flo_user_id
    WHERE id = flo_org_id;

    RAISE NOTICE 'Organisation mise à jour avec owner_id';

    -- Mettre à jour tous les VAs de Flo avec ce user_id
    UPDATE public.vas
    SET user_id = flo_user_id
    WHERE organization_id = flo_org_id;

    RAISE NOTICE 'VAs mis à jour avec user_id';

    -- Afficher les informations pour la connexion
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'IMPORTANT - NOTER CES INFORMATIONS:';
    RAISE NOTICE 'Organization ID: %', flo_org_id;
    RAISE NOTICE 'Owner User ID: %', flo_user_id;
    RAISE NOTICE '===============================================';

END $$;

-- Vérifier les résultats
SELECT
    o.id as org_id,
    o.name as org_name,
    o.owner_id,
    COUNT(v.id) as nb_vas
FROM public.organizations o
LEFT JOIN public.vas v ON v.organization_id = o.id
WHERE o.name = 'Agence Flo'
GROUP BY o.id, o.name, o.owner_id;
