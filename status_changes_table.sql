-- À exécuter dans Supabase SQL Editor (une seule fois)
CREATE TABLE IF NOT EXISTS status_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES twitter_accounts(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    flags TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_status_changes_unack ON status_changes(acknowledged_at) WHERE acknowledged_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_status_changes_detected ON status_changes(detected_at DESC);
