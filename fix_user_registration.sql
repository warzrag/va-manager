-- D'abord, supprimer l'ancien trigger qui pose problème
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
DROP FUNCTION IF EXISTS sync_user_email();

-- Créer une fonction trigger améliorée pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insérer dans user_profiles si l'utilisateur n'existe pas
  INSERT INTO user_profiles (user_id, email, pseudo)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'pseudo', 'Utilisateur')
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    email = NEW.email,
    pseudo = COALESCE(NEW.raw_user_meta_data->>'pseudo', user_profiles.pseudo);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger sur INSERT uniquement (pas UPDATE)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Vérifier que la contrainte unique existe sur user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'user_profiles_user_id_key'
  ) THEN
    ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Nettoyer les éventuels profils orphelins (user_profiles sans auth.users)
DELETE FROM user_profiles
WHERE user_id NOT IN (SELECT id FROM auth.users);

SELECT 'Trigger de création utilisateur corrigé !' as result;
