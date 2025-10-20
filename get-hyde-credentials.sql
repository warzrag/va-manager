-- Récupérer les informations de connexion pour HYDE

-- 1. Informations du VA HYDE
SELECT
    v.id as va_id,
    v.name as va_name,
    v.user_id,
    v.created_at
FROM vas v
WHERE v.name = 'HYDE';

-- 2. Email de connexion (depuis auth.users)
SELECT
    v.name as va_name,
    au.email,
    au.created_at as user_created_at
FROM vas v
JOIN auth.users au ON v.user_id = au.id
WHERE v.name = 'HYDE';

-- 3. Informations complètes (si password est stocké dans vas)
SELECT
    v.name as va_name,
    au.email,
    v.password as stored_password,
    v.created_at
FROM vas v
JOIN auth.users au ON v.user_id = au.id
WHERE v.name = 'HYDE';
