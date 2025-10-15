# Configuration Instagram Stats

## Étapes d'installation

### 1. Créer la table dans Supabase

Aller dans le **SQL Editor** de votre projet Supabase et exécuter le fichier :
```
supabase/migrations/20250115_create_instagram_stats.sql
```

Ou copier-coller directement ce SQL :

```sql
-- Create instagram_stats table
CREATE TABLE instagram_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  date DATE NOT NULL,
  followers_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER,
  posts_count INTEGER,
  engagement_rate DECIMAL(5,2),
  va_id UUID REFERENCES vas(id) ON DELETE CASCADE,
  creator_id UUID REFERENCES creators(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_instagram_stats_organization_id ON instagram_stats(organization_id);
CREATE INDEX idx_instagram_stats_username ON instagram_stats(username);
CREATE INDEX idx_instagram_stats_date ON instagram_stats(date);
CREATE INDEX idx_instagram_stats_va_id ON instagram_stats(va_id);
CREATE INDEX idx_instagram_stats_creator_id ON instagram_stats(creator_id);

-- Enable Row Level Security
ALTER TABLE instagram_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view Instagram stats from their organization" ON instagram_stats
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert Instagram stats in their organization" ON instagram_stats
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update Instagram stats in their organization" ON instagram_stats
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete Instagram stats in their organization" ON instagram_stats
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_instagram_stats_updated_at
  BEFORE UPDATE ON instagram_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### 2. Vérifier l'installation

Après avoir exécuté le SQL, vérifiez que la table a été créée :

```sql
SELECT * FROM instagram_stats LIMIT 1;
```

### 3. Utiliser la fonctionnalité

Une fois la table créée, vous pouvez :

1. **Voir le classement sur le dashboard** : La section "Top Comptes Instagram" s'affiche automatiquement
2. **Ajouter des stats** : Utilisez la console pour ajouter des données de test :

```javascript
await createInstagramStat({
  username: '@exemple_compte',
  date: '2025-01-15',
  followers_count: 15000,
  following_count: 500,
  posts_count: 120,
  engagement_rate: 3.5,
  va_id: 'uuid-du-va',  // optionnel
  creator_id: 'uuid-de-la-creatrice'  // optionnel
});
```

## Fonctionnalités

- **Top 10 des comptes** : Classement automatique par nombre de followers
- **Badges de rang** : 🥇 Or, 🥈 Argent, 🥉 Bronze pour le top 3
- **Affichage des créatrices et VAs** : Si les comptes sont liés
- **Taux d'engagement** : Affiché si disponible
- **Mode sombre/clair** : S'adapte automatiquement au thème
- **Liens Instagram** : Cliquez sur un compte pour ouvrir Instagram

## API disponible

Les fonctions suivantes sont disponibles dans `supabase-client.js` :

- `getAllInstagramStats()` - Récupère toutes les stats
- `getInstagramStatsByUsername(username)` - Stats pour un compte spécifique
- `getLatestInstagramStat(username)` - Dernière stat d'un compte
- `createInstagramStat(statsData)` - Créer une nouvelle stat
- `updateInstagramStat(statId, updates)` - Mettre à jour une stat
- `deleteInstagramStat(statId)` - Supprimer une stat
