-- Vérifier les emails en doublon dans user_profiles
SELECT email, COUNT(*) as count
FROM user_profiles
WHERE email IS NOT NULL
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Vérifier tous les profils utilisateurs
SELECT
    up.user_id,
    up.pseudo,
    up.email,
    up.created_at,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.user_id = au.id
ORDER BY up.created_at DESC;

-- Vérifier les utilisateurs dans auth.users
SELECT
    id,
    email,
    created_at,
    last_sign_in_at,
    email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
