# 📊 Guide d'utilisation : Statistiques Instagram

## 🎯 Vue d'ensemble

Le système de statistiques Instagram vous permet de :
- 📈 Suivre l'évolution des followers de vos comptes
- 🏆 Voir le classement des meilleurs comptes
- 📊 Analyser la croissance et l'engagement
- 🕒 Consulter l'historique complet

## 📝 Comment ajouter des statistiques ?

### Étape 1 : Accéder à la page
1. Cliquez sur **<i class="fab fa-instagram"></i> Instagram Stats** dans le menu de navigation à gauche

### Étape 2 : Remplir le formulaire
Le formulaire contient les champs suivants :

| Champ | Obligatoire | Description | Exemple |
|-------|-------------|-------------|---------|
| **Compte Instagram** | ✅ Oui | Sélectionner le compte depuis la liste | @justine_beauty |
| **Date** | ✅ Oui | Date de la statistique | 15/01/2025 |
| **Nombre de Followers** | ✅ Oui | Nombre actuel de followers | 15240 |
| **Taux d'engagement (%)** | ❌ Non | Taux d'engagement moyen | 3.5 |
| **Following** | ❌ Non | Nombre de comptes suivis | 520 |
| **Nombre de posts** | ❌ Non | Total de publications | 145 |

### Étape 3 : Enregistrer
Cliquez sur **Enregistrer les statistiques** ✅

## 📊 Où voir les résultats ?

### 1️⃣ Dashboard - Section "Top Comptes Instagram"
- **Classement automatique** par nombre de followers
- **Top 10** des meilleurs comptes
- **Badges** : 🥇 Or (1er) / 🥈 Argent (2e) / 🥉 Bronze (3e)
- **Informations affichées** :
  - Rang du compte (#1, #2, etc.)
  - Username avec lien vers Instagram
  - Nom de la créatrice et du VA
  - Nombre de followers
  - Taux d'engagement (si disponible)
  - Date de dernière mise à jour

### 2️⃣ Page Instagram Stats - Historique complet
Dans la section "Historique des statistiques" :

**Pour chaque compte, vous verrez :**
- 📅 **Timeline** : Toutes les statistiques enregistrées
- 📈 **Croissance** : Différence entre chaque entrée
  - ⬆️ Flèche verte : croissance positive (+150 followers / +2.3%)
  - ⬇️ Flèche rouge : baisse (-50 followers / -0.8%)
- 🗑️ **Suppression** : Bouton pour effacer une statistique

## 💡 Conseils d'utilisation

### Fréquence recommandée
- **Hebdomadaire** : Idéal pour suivre les tendances sans surcharger
- **Bi-mensuelle** : Minimum pour voir l'évolution
- **Quotidienne** : Si vous lancez une campagne marketing

### Comment obtenir les stats Instagram ?
1. **Ouvrir Instagram** sur navigateur
2. **Aller sur le profil** du compte
3. **Noter les informations** :
   - Followers : affiché sous le nom
   - Following : à côté de followers
   - Posts : nombre total de publications

### Calcul du taux d'engagement (optionnel)
Formule simple :
```
Engagement = (Likes moyens + Commentaires moyens) / Followers × 100
```

**Exemple** :
- Followers : 10,000
- Likes moyens par post : 300
- Commentaires moyens : 20
- **Taux d'engagement** : (300 + 20) / 10,000 × 100 = **3.2%**

## ❓ Questions fréquentes

### Q : Que se passe-t-il si j'oublie d'ajouter une semaine ?
**R** : Pas de problème ! Vous pouvez ajouter une statistique avec une date passée. Le système calculera quand même la croissance correctement.

### Q : Puis-je modifier une statistique après l'avoir enregistrée ?
**R** : Non, mais vous pouvez la supprimer et en créer une nouvelle.

### Q : Combien de comptes puis-je suivre ?
**R** : Illimité ! Tous vos comptes Instagram apparaissent dans la liste déroulante.

### Q : Le classement se met-il à jour automatiquement ?
**R** : Oui ! Dès que vous ajoutez une nouvelle statistique, le dashboard se met à jour instantanément.

### Q : Comment savoir quel compte progresse le plus ?
**R** : Dans l'historique, regardez les pourcentages de croissance (flèches vertes ⬆️).

## 🚀 Exemple d'utilisation

### Scénario : Suivi d'un compte pendant 4 semaines

**Semaine 1** (08/01/2025)
- Followers : 10,000
- Engagement : 3.2%

**Semaine 2** (15/01/2025)
- Followers : 10,520 → **+520 (+5.2%)** ✅ Excellent !
- Engagement : 3.5%

**Semaine 3** (22/01/2025)
- Followers : 10,680 → **+160 (+1.5%)** 👍 Bien
- Engagement : 3.1%

**Semaine 4** (29/01/2025)
- Followers : 11,200 → **+520 (+4.9%)** ✅ Excellent !
- Engagement : 3.8%

**Analyse** : Le compte a gagné **1,200 followers en 1 mois** (+12%) 🎉

## 🎨 Captures d'écran

### Dashboard
```
┌────────────────────────────────────────┐
│  Top Comptes Instagram     10 comptes  │
├────────────────────────────────────────┤
│  🥇 #1  @meilleur_compte               │
│         15,240 followers               │
│         Justine • Hugo                 │
│         3.5% engagement                │
├────────────────────────────────────────┤
│  🥈 #2  @deuxieme_compte               │
│         12,580 followers               │
│         Marie • Lucas                  │
└────────────────────────────────────────┘
```

### Historique
```
┌────────────────────────────────────────┐
│  📷 @mon_compte      15,240 followers  │
│      Justine                           │
├────────────────────────────────────────┤
│  22/01/2025  15,240  ⬆️ +520 (+3.5%)   │
│  15/01/2025  14,720  ⬆️ +180 (+1.2%)   │
│  08/01/2025  14,540                    │
└────────────────────────────────────────┘
```

## 🆘 Besoin d'aide ?

Si vous rencontrez un problème :
1. Vérifiez que la table `instagram_stats` est bien créée dans Supabase
2. Assurez-vous d'avoir au moins un compte Instagram ajouté
3. Consultez la console du navigateur (F12) pour les erreurs
4. Vérifiez que vous êtes bien authentifié

Bon suivi de vos statistiques Instagram ! 📊✨
