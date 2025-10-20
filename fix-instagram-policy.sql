-- Fix Instagram RLS policy pour permettre l'import

-- Ajouter policy temporaire pour l'insertion Instagram
CREATE POLICY "Allow insert instagram for import"
    ON public.instagram_accounts FOR INSERT
    WITH CHECK (true);

-- Vérification
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd
FROM pg_policies
WHERE tablename = 'instagram_accounts'
ORDER BY policyname;
