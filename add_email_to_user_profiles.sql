-- Add email column to user_profiles if it doesn't exist
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email TEXT;

-- Create a function to sync email from auth.users to user_profiles
CREATE OR REPLACE FUNCTION sync_user_email()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_profiles with email from auth.users
  UPDATE user_profiles
  SET email = NEW.email
  WHERE user_id = NEW.id;

  -- If profile doesn't exist, create it
  IF NOT FOUND THEN
    INSERT INTO user_profiles (user_id, email, pseudo)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'pseudo', 'Utilisateur'))
    ON CONFLICT (user_id)
    DO UPDATE SET email = NEW.email;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to sync email on user creation/update
DROP TRIGGER IF EXISTS on_auth_user_email_sync ON auth.users;
CREATE TRIGGER on_auth_user_email_sync
  AFTER INSERT OR UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email();

-- Backfill existing users' emails
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN
    SELECT id, email FROM auth.users
  LOOP
    UPDATE user_profiles
    SET email = user_record.email
    WHERE user_id = user_record.id;
  END LOOP;
END $$;

-- Grant necessary permissions
GRANT SELECT ON user_profiles TO authenticated;

SELECT 'Email column added and synced successfully!' as result;
