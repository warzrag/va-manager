-- Ajouter Hugo comme manager de l'agence de Flo

DO $$
DECLARE
    flo_org_id uuid;
    new_user_id uuid;
BEGIN
    -- 1. Récupérer l'ID de l'organisation de Flo
    SELECT id INTO flo_org_id
    FROM organizations
    WHERE owner_email = 'flo@test.com'
    LIMIT 1;

    IF flo_org_id IS NULL THEN
        RAISE EXCEPTION 'Organisation de Flo introuvable';
    END IF;

    -- 2. Créer l'utilisateur auth pour Hugo
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
    )
    VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'hugo@flo-agency.com',
        crypt('hugo123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id INTO new_user_id;

    -- 3. Créer le manager dans la table managers
    INSERT INTO managers (
        id,
        user_id,
        organization_id,
        name,
        email,
        created_at
    )
    VALUES (
        gen_random_uuid(),
        new_user_id,
        flo_org_id,
        'Hugo',
        'hugo@flo-agency.com',
        NOW()
    );

    RAISE NOTICE 'Manager Hugo créé avec succès pour l''agence de Flo';
    RAISE NOTICE 'Email: hugo@flo-agency.com';
    RAISE NOTICE 'Mot de passe: hugo123';
END $$;

-- Vérification
SELECT
    m.name as manager_name,
    m.email as manager_email,
    o.name as organization_name,
    o.owner_email as owner_email
FROM managers m
JOIN organizations o ON m.organization_id = o.id
WHERE m.email = 'hugo@flo-agency.com';
