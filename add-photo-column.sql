-- Ajouter la colonne photo_url à la table creators
ALTER TABLE creators ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Commentaire pour la colonne
COMMENT ON COLUMN creators.photo_url IS 'URL ou base64 de la photo de profil de la créatrice';
