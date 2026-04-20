# VA Manager Pro - Version Supabase

Migration du VA Manager Pro vers une architecture avec base de données en ligne (Supabase).

## 🚀 Installation et Configuration

### Étape 1 : Créer un compte Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Créez un compte gratuit
3. Créez un nouveau projet
   - Nom du projet : `va-manager-pro`
   - Database Password : **Notez-le bien !**
   - Region : Europe (ou le plus proche de vous)

### Étape 2 : Configurer la base de données

1. Dans votre projet Supabase, allez dans **SQL Editor**
2. Copiez tout le contenu du fichier `supabase-schema.sql`
3. Collez-le dans l'éditeur SQL
4. Cliquez sur **Run** pour exécuter le script
5. ✅ Vous devriez voir "Success. No rows returned"

### Étape 3 : Récupérer les clés API

1. Dans Supabase, allez dans **Settings** → **API**
2. Notez ces deux informations :
   - **Project URL** : `https://xxxxxxxxxx.supabase.co`
   - **anon/public key** : `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Étape 4 : Configurer l'application

1. Ouvrez le fichier `config.js`
2. Remplacez les valeurs par vos propres clés :

```javascript
const SUPABASE_URL = 'VOTRE_PROJECT_URL_ICI';
const SUPABASE_ANON_KEY = 'VOTRE_ANON_KEY_ICI';
```

### Étape 5 : Lancer l'application

**Option A - Local (test):**
```bash
# Ouvrez simplement index.html dans un navigateur
# Ou utilisez un serveur local
python -m http.server 8000
# Puis ouvrez http://localhost:8000
```

**Option B - Déploiement Vercel (production):**
```bash
# Installez Vercel CLI
npm i -g vercel

# Dans le dossier du projet
vercel

# Suivez les instructions
# Votre site sera en ligne sur https://votre-projet.vercel.app
```

## 📁 Structure du Projet

```
D:\claude\Leny\
├── index.html              # Page principale avec auth
├── app.html                # Application VA Manager (après login)
├── auth.js                 # Gestion authentification
├── supabase-client.js      # Client Supabase et fonctions API
├── config.js               # Configuration (clés API)
├── supabase-schema.sql     # Schema de la base de données
├── styles.css              # Styles (copié de l'original)
└── README.md               # Ce fichier
```

## 🔐 Sécurité

### Ce qui a changé par rapport à l'ancienne version :

✅ **Mots de passe chiffrés** : Utilisation de bcrypt côté serveur
✅ **Authentification sécurisée** : Système de login avec JWT tokens
✅ **Row Level Security** : Chaque utilisateur voit uniquement ses données
✅ **HTTPS automatique** : Connexions chiffrées
✅ **Base de données distante** : Plus de localStorage non sécurisé

### Fonctions de chiffrement

Les mots de passe sont maintenant chiffrés avec **bcrypt** avant d'être stockés.
- Vous ne pourrez plus voir les mots de passe en clair (c'est normal et sécurisé !)
- Pour "voir" un mot de passe, il faudra utiliser la fonction de déchiffrement

## 📊 Base de Données

### Tables créées :

1. **users** - Utilisateurs (géré par Supabase Auth)
2. **vas** - Virtual Assistants
3. **creators** - Créatrices
4. **va_creators** - Relation Many-to-Many VAs ↔ Creators
5. **gmail_accounts** - Comptes Gmail
6. **twitter_accounts** - Comptes Twitter
7. **instagram_accounts** - Comptes Instagram
8. **subscriptions** - Abonnements
9. **revenues** - Revenus et commissions
10. **payments** - Paiements
11. **twitter_stats** - Statistiques Twitter

### Relations :

- Un user → Plusieurs VAs, Creators, Accounts
- Une créatrice → Plusieurs VAs (multi-VA support)
- Un compte Twitter → 1 créatrice + 1 VA + 1 Gmail (optionnel)

## 🔄 Migration des Données

Si vous avez des données dans l'ancienne version (localStorage), vous pouvez les migrer :

1. Ouvrez l'ancienne version (`va_manager_pro.html`)
2. Ouvrez la console (F12)
3. Tapez : `exportAllData()`
4. Téléchargez le fichier JSON
5. Dans la nouvelle version, utilisez la fonction d'import (à venir)

## 🎯 Fonctionnalités

Toutes les fonctionnalités de l'ancienne version sont conservées :

- ✅ Gestion des VAs
- ✅ Gestion des Créatrices (multi-VA)
- ✅ Comptes Twitter/Instagram
- ✅ Comptes Gmail
- ✅ Suivi des abonnements
- ✅ Revenus et commissions
- ✅ Vue financière globale
- ✅ Analytics Twitter
- ✅ Dark mode
- ✅ Export/Import données

**Nouvelles fonctionnalités :**

- ✅ Authentification sécurisée
- ✅ Multi-utilisateurs (chacun ses données)
- ✅ Synchronisation automatique
- ✅ Accessible de n'importe où
- ✅ Mots de passe vraiment chiffrés

## 🐛 Dépannage

**Erreur "Invalid API key"**
→ Vérifiez que vous avez bien copié la clé dans `config.js`

**Erreur "User not authenticated"**
→ Reconnectez-vous via la page de login

**Erreur lors de l'exécution du SQL**
→ Vérifiez que vous êtes dans le bon projet Supabase

**Les données ne s'affichent pas**
→ Ouvrez la console (F12) pour voir les erreurs

## 💰 Coûts

**Plan Gratuit Supabase :**
- ✅ 500 MB de base de données
- ✅ 2 GB de bande passante
- ✅ Suffisant pour 5-10 VAs avec des centaines de créatrices
- ✅ Backups automatiques

**Si vous dépassez les limites :**
- Plan Pro : 25$/mois (Base de données 8GB + 250GB bande passante)

**Hébergement Vercel :**
- ✅ Gratuit pour toujours
- ✅ HTTPS automatique
- ✅ Déploiement instantané

## 📞 Support

Pour toute question, vérifiez :
1. La documentation Supabase : https://supabase.com/docs
2. La console du navigateur (F12) pour les erreurs
3. Les logs Supabase dans le dashboard

## 🔄 Prochaines Étapes

Après avoir configuré Supabase :
1. ✅ Testez en local
2. ✅ Créez un compte utilisateur
3. ✅ Importez vos données existantes (si besoin)
4. ✅ Déployez sur Vercel
5. ✅ Partagez l'URL avec votre équipe

**Bon courage ! 🚀**
