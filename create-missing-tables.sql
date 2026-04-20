-- ============================================================================
-- Script SQL pour créer les tables manquantes dans Supabase
-- Agence Flo - Tables Twitter et Gmail
-- ============================================================================

-- 1. TABLE: twitter_accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.twitter_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES public.creators(id) ON DELETE CASCADE,
    va_id UUID REFERENCES public.vas(id) ON DELETE SET NULL,
    gmail_id UUID REFERENCES public.gmail_accounts(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_creator_id ON public.twitter_accounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_va_id ON public.twitter_accounts(va_id);
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_organization_id ON public.twitter_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_twitter_accounts_username ON public.twitter_accounts(username);

-- Commentaires
COMMENT ON TABLE public.twitter_accounts IS 'Comptes Twitter gérés par les VAs';
COMMENT ON COLUMN public.twitter_accounts.username IS 'Nom d''utilisateur Twitter (avec @)';
COMMENT ON COLUMN public.twitter_accounts.encrypted_password IS 'Mot de passe chiffré du compte Twitter';
COMMENT ON COLUMN public.twitter_accounts.gmail_id IS 'Compte Gmail associé (optionnel)';

-- ============================================================================
-- 2. TABLE: gmail_accounts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.gmail_accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    va_id UUID REFERENCES public.vas(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    encrypted_password TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL
);

-- Index pour optimiser les recherches
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_va_id ON public.gmail_accounts(va_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_organization_id ON public.gmail_accounts(organization_id);
CREATE INDEX IF NOT EXISTS idx_gmail_accounts_email ON public.gmail_accounts(email);

-- Commentaires
COMMENT ON TABLE public.gmail_accounts IS 'Comptes Gmail utilisés pour les comptes sociaux';
COMMENT ON COLUMN public.gmail_accounts.email IS 'Adresse email Gmail';
COMMENT ON COLUMN public.gmail_accounts.encrypted_password IS 'Mot de passe chiffré du compte Gmail';

-- ============================================================================
-- 3. AJOUTER la colonne va_ids à creators (array de UUIDs)
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'creators'
        AND column_name = 'va_ids'
    ) THEN
        ALTER TABLE public.creators ADD COLUMN va_ids UUID[] DEFAULT ARRAY[]::UUID[];
        COMMENT ON COLUMN public.creators.va_ids IS 'IDs des VAs assignés à cette créatrice';
    END IF;
END $$;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) - Permettre l'accès selon l'organisation
-- ============================================================================

-- Activer RLS sur twitter_accounts
ALTER TABLE public.twitter_accounts ENABLE ROW LEVEL SECURITY;

-- Policy pour twitter_accounts: Les utilisateurs peuvent voir/modifier leurs propres comptes
CREATE POLICY "Users can view twitter_accounts in their organization"
    ON public.twitter_accounts FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert twitter_accounts in their organization"
    ON public.twitter_accounts FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update twitter_accounts in their organization"
    ON public.twitter_accounts FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete twitter_accounts in their organization"
    ON public.twitter_accounts FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

-- Activer RLS sur gmail_accounts
ALTER TABLE public.gmail_accounts ENABLE ROW LEVEL SECURITY;

-- Policy pour gmail_accounts
CREATE POLICY "Users can view gmail_accounts in their organization"
    ON public.gmail_accounts FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert gmail_accounts in their organization"
    ON public.gmail_accounts FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update gmail_accounts in their organization"
    ON public.gmail_accounts FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete gmail_accounts in their organization"
    ON public.gmail_accounts FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM public.vas WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. POLICY SPÉCIALE: Permettre l'insertion depuis le script d'import (TEMPORAIRE)
-- ============================================================================

-- Pour VAs: Permettre l'insertion même sans auth (pour le script d'import)
CREATE POLICY "Allow insert vas for import"
    ON public.vas FOR INSERT
    WITH CHECK (true);

-- Pour Twitter
CREATE POLICY "Allow insert twitter for import"
    ON public.twitter_accounts FOR INSERT
    WITH CHECK (true);

-- Pour Gmail
CREATE POLICY "Allow insert gmail for import"
    ON public.gmail_accounts FOR INSERT
    WITH CHECK (true);

-- Pour Creators
CREATE POLICY "Allow insert creators for import"
    ON public.creators FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- 6. TRIGGERS pour mettre à jour updated_at automatiquement
-- ============================================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour twitter_accounts
DROP TRIGGER IF EXISTS update_twitter_accounts_updated_at ON public.twitter_accounts;
CREATE TRIGGER update_twitter_accounts_updated_at
    BEFORE UPDATE ON public.twitter_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour gmail_accounts
DROP TRIGGER IF EXISTS update_gmail_accounts_updated_at ON public.gmail_accounts;
CREATE TRIGGER update_gmail_accounts_updated_at
    BEFORE UPDATE ON public.gmail_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================

-- Vérification des tables créées
SELECT
    'twitter_accounts' as table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'twitter_accounts'
UNION ALL
SELECT
    'gmail_accounts',
    COUNT(*)
FROM information_schema.columns
WHERE table_name = 'gmail_accounts';
