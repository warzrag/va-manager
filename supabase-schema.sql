-- VA Manager Pro - Supabase Database Schema
-- À exécuter dans le SQL Editor de Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users (gérée automatiquement par Supabase Auth)
-- Pas besoin de la créer, Supabase le fait

-- Table: vas (Virtual Assistants)
CREATE TABLE vas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: creators (Créatrices)
CREATE TABLE creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: va_creators (Relation Many-to-Many entre VAs et Creators)
CREATE TABLE va_creators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(va_id, creator_id)
);

-- Table: gmail_accounts
CREATE TABLE gmail_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE SET NULL,
    email VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL, -- Chiffré côté serveur
    assigned_twitter_username VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: twitter_accounts
CREATE TABLE twitter_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE SET NULL,
    assigned_va_id UUID REFERENCES vas(id) ON DELETE SET NULL, -- Pour multi-VA
    gmail_id UUID REFERENCES gmail_accounts(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: instagram_accounts
CREATE TABLE instagram_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE SET NULL,
    gmail_id UUID REFERENCES gmail_accounts(id) ON DELETE SET NULL,
    username VARCHAR(255) NOT NULL,
    encrypted_password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: subscriptions
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: revenues
CREATE TABLE revenues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount_usd DECIMAL(10, 2) NOT NULL DEFAULT 0,
    exchange_rate DECIMAL(10, 4) NOT NULL DEFAULT 1,
    amount_eur DECIMAL(10, 2) NOT NULL DEFAULT 0,
    commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tracking_link VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL, -- 'subs', 'commissions', 'both', 'custom'
    period VARCHAR(255),
    subs_amount DECIMAL(10, 2) DEFAULT 0,
    commissions_amount DECIMAL(10, 2) DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: twitter_stats
CREATE TABLE twitter_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    twitter_account_id UUID REFERENCES twitter_accounts(id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    followers INTEGER NOT NULL DEFAULT 0,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes pour optimiser les performances
CREATE INDEX idx_vas_user_id ON vas(user_id);
CREATE INDEX idx_creators_user_id ON creators(user_id);
CREATE INDEX idx_va_creators_va_id ON va_creators(va_id);
CREATE INDEX idx_va_creators_creator_id ON va_creators(creator_id);
CREATE INDEX idx_gmail_accounts_user_id ON gmail_accounts(user_id);
CREATE INDEX idx_twitter_accounts_user_id ON twitter_accounts(user_id);
CREATE INDEX idx_twitter_accounts_creator_id ON twitter_accounts(creator_id);
CREATE INDEX idx_instagram_accounts_user_id ON instagram_accounts(user_id);
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_va_id ON subscriptions(va_id);
CREATE INDEX idx_revenues_user_id ON revenues(user_id);
CREATE INDEX idx_revenues_va_id ON revenues(va_id);
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_twitter_stats_user_id ON twitter_stats(user_id);

-- Row Level Security (RLS) - Sécurité pour que chaque user ne voit que ses données
ALTER TABLE vas ENABLE ROW LEVEL SECURITY;
ALTER TABLE creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE va_creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE twitter_stats ENABLE ROW LEVEL SECURITY;

-- Policies RLS - Chaque user voit uniquement ses propres données

-- VAs
CREATE POLICY "Users can view their own VAs" ON vas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own VAs" ON vas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own VAs" ON vas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own VAs" ON vas FOR DELETE USING (auth.uid() = user_id);

-- Creators
CREATE POLICY "Users can view their own creators" ON creators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own creators" ON creators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own creators" ON creators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own creators" ON creators FOR DELETE USING (auth.uid() = user_id);

-- VA Creators
CREATE POLICY "Users can view their own va_creators" ON va_creators FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own va_creators" ON va_creators FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own va_creators" ON va_creators FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own va_creators" ON va_creators FOR DELETE USING (auth.uid() = user_id);

-- Gmail Accounts
CREATE POLICY "Users can view their own gmail accounts" ON gmail_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own gmail accounts" ON gmail_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own gmail accounts" ON gmail_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own gmail accounts" ON gmail_accounts FOR DELETE USING (auth.uid() = user_id);

-- Twitter Accounts
CREATE POLICY "Users can view their own twitter accounts" ON twitter_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own twitter accounts" ON twitter_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own twitter accounts" ON twitter_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own twitter accounts" ON twitter_accounts FOR DELETE USING (auth.uid() = user_id);

-- Instagram Accounts
CREATE POLICY "Users can view their own instagram accounts" ON instagram_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own instagram accounts" ON instagram_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own instagram accounts" ON instagram_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own instagram accounts" ON instagram_accounts FOR DELETE USING (auth.uid() = user_id);

-- Subscriptions
CREATE POLICY "Users can view their own subscriptions" ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own subscriptions" ON subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own subscriptions" ON subscriptions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own subscriptions" ON subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Revenues
CREATE POLICY "Users can view their own revenues" ON revenues FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own revenues" ON revenues FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own revenues" ON revenues FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own revenues" ON revenues FOR DELETE USING (auth.uid() = user_id);

-- Payments
CREATE POLICY "Users can view their own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own payments" ON payments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own payments" ON payments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own payments" ON payments FOR DELETE USING (auth.uid() = user_id);

-- Twitter Stats
CREATE POLICY "Users can view their own twitter stats" ON twitter_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own twitter stats" ON twitter_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own twitter stats" ON twitter_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own twitter stats" ON twitter_stats FOR DELETE USING (auth.uid() = user_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
CREATE TRIGGER update_vas_updated_at BEFORE UPDATE ON vas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_creators_updated_at BEFORE UPDATE ON creators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_gmail_accounts_updated_at BEFORE UPDATE ON gmail_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_twitter_accounts_updated_at BEFORE UPDATE ON twitter_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_instagram_accounts_updated_at BEFORE UPDATE ON instagram_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenues_updated_at BEFORE UPDATE ON revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
