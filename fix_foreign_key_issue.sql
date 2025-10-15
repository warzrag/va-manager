-- Le problème : la foreign key sur user_id empêche l'insertion car auth.users n'est pas encore commité
-- Solution : Retirer temporairement la contrainte de foreign key, ou mieux : utiliser DEFERRABLE

-- Option 1 : Rendre la foreign key DEFERRABLE (meilleure solution)
-- Cela permet à la contrainte d'être vérifiée à la fin de la transaction au lieu d'immédiatement

-- D'abord, identifier la contrainte
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_def
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND contype = 'f'  -- foreign key
  AND confrelid = 'auth.users'::regclass;

-- Supprimer l'ancienne contrainte (remplace 'CONSTRAINT_NAME' par le nom trouvé ci-dessus)
-- Si le nom est user_profiles_user_id_fkey, exécute :
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Recréer la contrainte comme DEFERRABLE INITIALLY DEFERRED
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id)
ON DELETE CASCADE
DEFERRABLE INITIALLY DEFERRED;

-- Vérifier que la nouvelle contrainte est bien deferrable
SELECT
    conname,
    condeferrable,
    condeferred
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND contype = 'f';

SELECT 'Foreign key contrainte mise à jour en DEFERRABLE !' AS result;
