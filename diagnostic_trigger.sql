-- 1. Vérifier si le trigger existe
SELECT
    tgname AS trigger_name,
    tgtype,
    tgenabled,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'auth.users'::regclass;

-- 2. Vérifier le code de la fonction handle_new_user
SELECT
    proname AS function_name,
    prosrc AS function_code
FROM pg_proc
WHERE proname = 'handle_new_user';

-- 3. Essayer de créer un utilisateur test directement dans user_profiles
DO $$
DECLARE
    test_id UUID := gen_random_uuid();
    test_email TEXT := 'test_' || gen_random_uuid()::TEXT || '@example.com';
BEGIN
    -- Simuler ce que le trigger devrait faire
    INSERT INTO user_profiles (user_id, email, pseudo)
    VALUES (test_id, test_email, 'TestUser');

    RAISE NOTICE 'Test INSERT réussi avec user_id: %, email: %', test_id, test_email;

    -- Nettoyer
    DELETE FROM user_profiles WHERE user_id = test_id;
    RAISE NOTICE 'Nettoyage terminé';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERREUR lors du test: %', SQLERRM;
        RAISE NOTICE 'Détails: %', SQLSTATE;
END $$;

-- 4. Vérifier les contraintes sur user_profiles
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass;

-- 5. Vérifier la structure complète de user_profiles
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
