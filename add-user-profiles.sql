-- Créer la table user_profiles pour stocker les pseudos
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    pseudo VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Désactiver RLS (pour simplifier)
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);

-- Créer des profils pour les utilisateurs existants (optionnel)
INSERT INTO user_profiles (user_id, pseudo)
SELECT id, SPLIT_PART(email, '@', 1)
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM user_profiles);
