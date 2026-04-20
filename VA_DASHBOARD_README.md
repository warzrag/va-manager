# 📊 VA Dashboard - Guide d'Utilisation

## Vue d'ensemble

Le **VA Dashboard** est un espace personnel sécurisé permettant à chaque Virtual Assistant (VA) d'accéder à ses propres statistiques, créatrices et comptes en warmup, sans avoir accès aux données des autres VAs.

---

## 🚀 Configuration Initiale

### 1. Ajouter un VA avec ses Identifiants

Dans l'application principale (`app.html`), allez dans **"Ajouter un VA"** :

1. **Prénom du VA** : Ex: Hugo
2. **Email de connexion** : Ex: hugo@example.com
3. **Mot de passe** : Minimum 6 caractères

Les VAs seront enregistrés dans la base de données Supabase avec leurs identifiants.

### 2. Donner Accès au Dashboard VA

Les VAs peuvent se connecter via : `va-dashboard.html`

**Identifiants de connexion :**
- Email : Celui configuré dans l'app principale
- Mot de passe : Celui configuré dans l'app principale

---

## 🔐 Système d'Authentification

### Sécurité

- **Sessions locales** : Les sessions sont sauvegardées dans le localStorage
- **Auto-connexion** : Les VAs restent connectés jusqu'à déconnexion manuelle
- **Validation** : Email et mot de passe vérifiés à chaque connexion
- **Données isolées** : Chaque VA ne voit que ses propres données

### Déconnexion

Les VAs peuvent se déconnecter à tout moment via le bouton en haut à droite.

---

## 📈 Fonctionnalités du Dashboard VA

### 1. Statistiques Personnelles

Le VA voit en temps réel :

- **💰 Revenus Générés** : Total des revenus de la semaine (en €)
- **👥 Nouveaux Abonnés** : Nombre d'abonnés gagnés cette semaine
- **💸 Commission à Venir** : 30% des revenus générés
- **🏆 Classement** : Position dans le leaderboard des VAs

### 2. Mes Créatrices

Liste des créatrices assignées au VA avec :

- **Nom de la créatrice**
- **Comptes Instagram** : Liens cliquables (sans mots de passe)
- **Comptes Twitter** : Liens cliquables (sans mots de passe)

### 3. Comptes en Warm-up

Tous les comptes Instagram en warm-up assignés au VA :

- **Progression** : Jour X/21
- **Barre de progression visuelle**
- **Tâches du jour** :
  - Jours 1-7 : Stories, likes basiques
  - Jours 8-14 : Plus de stories, commentaires
  - Jours 15-21 : Stories, likes, commentaires, DMs

---

## 🔒 Restrictions d'Accès VA

### ✅ Ce que les VAs PEUVENT voir :

- Leurs propres statistiques
- Leurs créatrices assignées uniquement
- Les comptes Instagram/Twitter de leurs créatrices (usernames seulement)
- La progression des warm-ups de leurs comptes
- Leur classement dans la compétition

### ❌ Ce que les VAs NE PEUVENT PAS voir :

- Dashboard admin complet
- Autres VAs et leurs performances
- Créatrices des autres VAs
- Mots de passe des comptes sociaux
- Ajout/suppression de VAs
- Gestion financière globale
- Vue d'ensemble de l'agence

---

## 💻 Configuration Technique

### Prérequis

1. **Supabase actif** : Le dashboard charge les données depuis Supabase
2. **Même organisation** : Les données sont partagées avec l'app principale
3. **localStorage** : Utilisé pour la session et le fallback

### Fichiers

- `va-dashboard.html` : Dashboard VA complet (standalone)
- `app.html` : Application principale (admin)

### Données Chargées

Le dashboard charge automatiquement :
- VAs (pour authentification)
- Créatrices assignées
- Comptes Instagram/Twitter
- Revenus et abonnements
- Progression warmup (localStorage)

---

## 🎯 Utilisation Quotidienne

### Pour l'Admin

1. Créer les VAs avec email/password dans l'app principale
2. Assigner des créatrices aux VAs
3. Donner l'URL `va-dashboard.html` + identifiants aux VAs

### Pour les VAs

1. Ouvrir `va-dashboard.html`
2. Se connecter avec email/password
3. Consulter leurs stats quotidiennes
4. Suivre les warm-ups Instagram
5. Accéder aux comptes de leurs créatrices

---

## 🔄 Synchronisation des Données

### Temps Réel

Le dashboard VA charge les données à chaque connexion. Pour voir les mises à jour :

1. **Rafraîchir la page** : F5 ou Ctrl+R
2. **Se reconnecter** : Déconnexion → Connexion

### Source des Données

- **Priorité 1** : Supabase (si configuré)
- **Priorité 2** : localStorage (fallback)

---

## 🛠️ Dépannage

### Le VA ne peut pas se connecter

- Vérifier que l'email est correct (sensible à la casse)
- Vérifier le mot de passe (minimum 6 caractères)
- Vérifier que le VA existe dans l'app principale

### Les stats ne s'affichent pas

- Vérifier la connexion Supabase
- Vérifier que des créatrices sont assignées au VA
- Actualiser la page (F5)

### Les créatrices ne s'affichent pas

- Vérifier que le VA a des créatrices assignées (`assignedVaId`)
- Vérifier dans l'app principale : "Gestion des Créatrices"

### Les warm-ups ne s'affichent pas

- Les warm-ups doivent être démarrés depuis l'app principale
- Les comptes Instagram doivent être assignés à une créatrice du VA

---

## 🔐 Sécurité et Bonnes Pratiques

### Mots de Passe

- **Production** : Utiliser un hashing côté serveur (bcrypt)
- **Développement** : Mots de passe stockés en clair (à améliorer)

### Sessions

- Durée illimitée jusqu'à déconnexion manuelle
- Validation à chaque chargement de page

### Données Sensibles

- Les VAs ne voient jamais les mots de passe des comptes
- Isolation totale entre les VAs

---

## 📱 Mobile-Friendly

Le dashboard est entièrement responsive :

- Design adapté aux petits écrans
- Cartes empilées verticalement
- Navigation simplifiée

---

## 🎨 Personnalisation

### Couleurs

Les couleurs sont cohérentes avec l'app principale :
- **Violet/Purple gradient** : Header
- **Cartes colorées** : Stats
- **Badges** : Instagram (gradient rose), Twitter (bleu)

### Logo

Modifier le titre dans le header :
```html
<h1 id="va-greeting">Bienvenue 👋</h1>
```

---

## 📊 Exemples de Cas d'Usage

### Scénario 1 : VA Hugo

- Email : hugo@agency.com
- Password : hugo123
- Créatrices : Marie, Julie
- Stats : 450€ cette semaine, #2 au classement

### Scénario 2 : VA Sarah

- Email : sarah@agency.com
- Password : sarah456
- Créatrices : Laura, Emma, Sophie
- Warm-ups : 2 comptes Instagram (jour 12/21 et jour 5/21)

---

## 🚀 Évolutions Futures Possibles

- Notifications push pour nouvelles missions
- Chat intégré admin ↔ VA
- Graphiques d'évolution des performances
- Badges et gamification
- Application mobile native
- Export PDF des statistiques mensuelles

---

## 📞 Support

Pour toute question ou problème, contactez l'administrateur de la plateforme.

---

**Version** : 1.0
**Date** : 2025-10-15
**Créé avec** : Claude Code
