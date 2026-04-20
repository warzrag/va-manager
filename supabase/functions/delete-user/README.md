# Delete User Edge Function

Cette fonction permet de supprimer complètement un utilisateur de Supabase Auth.

## Déploiement

### Prérequis
1. Installer Supabase CLI : `npm install -g supabase`
2. Se connecter à Supabase : `supabase login`

### Déployer la fonction

```bash
# Aller dans le dossier du projet
cd /mnt/d/claude/Leny

# Déployer la fonction
supabase functions deploy delete-user --project-ref VOTRE_PROJECT_REF
```

### Configuration

La fonction nécessite les variables d'environnement suivantes (automatiquement disponibles dans Supabase) :
- `SUPABASE_URL` : URL de votre projet Supabase
- `SUPABASE_SERVICE_ROLE_KEY` : Clé service role (avec privilèges admin)

### Test

```bash
# Tester localement
supabase functions serve delete-user

# Appeler la fonction
curl -X POST http://localhost:54321/functions/v1/delete-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"userId": "user-id-to-delete"}'
```

## Utilisation depuis l'application

La fonction est automatiquement appelée depuis le bouton "Supprimer" dans le panneau admin :

```javascript
const { data, error } = await supabase.functions.invoke('delete-user', {
  body: { userId: userId }
});
```

## Sécurité

⚠️ Cette fonction supprime DÉFINITIVEMENT un utilisateur de Supabase Auth.

Pour ajouter de la sécurité, vous pouvez :
1. Vérifier que l'utilisateur qui fait la requête est bien un owner
2. Ajouter des logs d'audit
3. Empêcher la suppression de certains comptes (ex: admin principal)

## Erreurs communes

- **Error 404** : La fonction n'est pas déployée
- **Error 403** : Problème de permissions (vérifier que SUPABASE_SERVICE_ROLE_KEY est défini)
- **Error 500** : Erreur serveur (vérifier les logs avec `supabase functions logs delete-user`)
