-- Créer des organisations pour tous les users qui n'en ont pas

DO $$
DECLARE
    user_record RECORD;
    org_id UUID;
BEGIN
    FOR user_record IN SELECT id, email FROM auth.users LOOP
        -- Vérifier si l'user a déjà une organisation
        SELECT id INTO org_id FROM organizations WHERE owner_id = user_record.id LIMIT 1;

        IF org_id IS NULL THEN
            -- Créer une organisation pour cet user
            INSERT INTO organizations (owner_id, name)
            VALUES (user_record.id, 'Mon Organisation')
            RETURNING id INTO org_id;

            RAISE NOTICE 'Organisation créée pour user: % (org_id: %)', user_record.email, org_id;

            -- Migrer toutes ses données vers cette organisation
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
        ELSE
            RAISE NOTICE 'User % a déjà une organisation: %', user_record.email, org_id;
        END IF;
    END LOOP;
END $$;

-- Vérifier le résultat
SELECT
    u.email,
    o.id as organization_id,
    o.name as organization_name,
    o.created_at
FROM auth.users u
LEFT JOIN organizations o ON o.owner_id = u.id
ORDER BY u.created_at DESC;
