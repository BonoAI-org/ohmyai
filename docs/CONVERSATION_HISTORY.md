# 💬 Guide de l'Historique des Conversations / Conversation History Guide

Ce guide explique comment utiliser la fonctionnalité d'historique des conversations qui sauvegarde automatiquement toutes vos discussions localement.

This guide explains how to use the conversation history feature that automatically saves all your discussions locally.

---

## ✨ Fonctionnalités / Features

### 🔄 Sauvegarde Automatique / Automatic Saving
- **Sauvegarde après chaque message** : Chaque conversation est automatiquement sauvegardée après l'envoi d'un message
- **Titres automatiques** : Les conversations sont automatiquement nommées d'après le premier message
- **Limite de 50 conversations** : Les 50 conversations les plus récentes sont conservées

### 📚 Gestion Complète / Complete Management
- ✅ **Créer** une nouvelle conversation
- ✅ **Charger** une conversation passée
- ✅ **Renommer** une conversation
- ✅ **Supprimer** une conversation
- ✅ **Exporter** tout l'historique en JSON
- ✅ **Importer** un historique depuis un fichier JSON

### 💾 Stockage Local / Local Storage
- **100% privé** : Tout reste dans votre navigateur (localStorage)
- **Aucun serveur** : Aucune donnée n'est envoyée à l'extérieur
- **Persistant** : Les conversations restent même après fermeture du navigateur

---

## 🎯 Comment Utiliser / How to Use

### Ouvrir l'Historique / Open History

#### Sur Desktop :
Cliquez sur le bouton **"🕐 Historique"** dans le header (en haut à droite)

#### Sur Mobile :
Cliquez sur l'icône **🕐** à côté du titre de l'application

### Interface de l'Historique / History Interface

Le panneau latéral affiche :
- **Liste des conversations** : Triées par date (plus récentes en premier)
- **Nombre de messages** : Compteur pour chaque conversation  
- **Date/Heure** : Quand la conversation a été modifiée
- **Conversation actuelle** : Marquée avec "Actuel" en violet

---

## 📝 Opérations Disponibles / Available Operations

### 1. Nouvelle Conversation / New Conversation

**Bouton** : **"➕ Nouvelle / New"** en haut du panneau

**Effet** :
- Sauvegarde la conversation actuelle (si elle contient des messages)
- Efface l'écran de chat
- Démarre une nouvelle conversation vierge

**Raccourci** : Non disponible actuellement

---

### 2. Charger une Conversation / Load a Conversation

**Action** : Cliquez sur une conversation dans la liste

**Effet** :
- Charge tous les messages de cette conversation
- Marque la conversation comme "Actuelle"
- Ferme le panneau d'historique
- Les messages s'affichent immédiatement

**Note** : Le modèle utilisé est indiqué mais n'est pas changé automatiquement

---

### 3. Renommer une Conversation / Rename a Conversation

**Action** : 
1. Survolez une conversation
2. Cliquez sur l'icône **✏️ (crayon)**
3. Tapez le nouveau titre
4. Appuyez sur **✓ (check)** ou **Enter** pour sauvegarder
5. Appuyez sur **✗** ou **Escape** pour annuler

**Limites** : Aucune limite de caractères

**Tip** : Utilisez des titres descriptifs pour retrouver facilement vos conversations !

---

### 4. Supprimer une Conversation / Delete a Conversation

**Action** :
1. Survolez une conversation
2. Cliquez sur l'icône **🗑️ (poubelle)** rouge
3. Confirmez la suppression

**Effet** :
- La conversation est supprimée définitivement
- Si c'est la conversation actuelle, l'écran de chat est effacé
- **Attention** : Cette action est irréversible !

---

### 5. Exporter l'Historique / Export History

**Bouton** : **⬇️** (flèche vers le bas) en haut du panneau

**Effet** :
- Télécharge un fichier JSON avec :
  - Toutes les conversations
  - Tous les modèles personnalisés
  - La date d'export
- Nom du fichier : `llm-chat-history-YYYY-MM-DD.json`

**Cas d'usage** :
- Sauvegarde de sécurité
- Transfert vers un autre navigateur
- Archivage

---

### 6. Importer l'Historique / Import History

**Bouton** : **⬆️** (flèche vers le haut) en haut du panneau

**Action** :
1. Cliquez sur le bouton
2. Sélectionnez un fichier JSON d'export
3. L'historique est importé et fusionné avec l'existant

**Format accepté** : Fichiers JSON créés par l'export

**Note** : Les conversations existantes sont conservées

---

## 📊 Informations Affichées / Displayed Information

### Pour Chaque Conversation / For Each Conversation

| Élément | Description |
|---------|-------------|
| **Titre** | Nom de la conversation (automatique ou personnalisé) |
| **Date** | Quand la conversation a été modifiée |
| **Messages** | Nombre de messages dans la conversation |
| **Modèle** | (Visible au chargement) Quel modèle était utilisé |
| **Badge "Actuel"** | Indique la conversation en cours |

### Formats de Date / Date Formats

- **"Il y a X min"** : Moins d'une heure
- **"Aujourd'hui HH:MM"** : Même jour
- **"Hier HH:MM"** : La veille
- **"DD MMM"** : Autre date (année en cours)
- **"DD MMM YYYY"** : Autre année

---

## 💡 Conseils d'Utilisation / Usage Tips

### 🎯 Bonnes Pratiques / Best Practices

1. **Nommez vos conversations importantes** : Renommez-les avec des titres descriptifs
2. **Exportez régulièrement** : Créez des sauvegardes de sécurité
3. **Organisez par thème** : Utilisez des préfixes dans les titres (`[Code]`, `[Idées]`, etc.)
4. **Nettoyez l'historique** : Supprimez les conversations inutiles régulièrement

### ⚡ Workflow Efficace / Efficient Workflow

**Pour les sessions de travail** :
```
1. Ouvrir l'historique
2. Charger la conversation du projet en cours
3. Continuer le travail
4. La sauvegarde est automatique !
```

**Pour commencer un nouveau sujet** :
```
1. Cliquer sur "Nouvelle conversation"
2. Poser votre première question
3. Continuer normalement
4. Renommer avec un titre pertinent (optionnel)
```

---

## 🔧 Stockage Technique / Technical Storage

### Où Sont les Données ? / Where Is the Data?

Les conversations sont stockées dans :
```
localStorage['conversationHistory']
```

### Structure des Données / Data Structure

```json
{
  "conversations": [
    {
      "id": "conv_1234567890_abc123",
      "title": "Titre de la conversation",
      "messages": [
        { "role": "user", "content": "..." },
        { "role": "assistant", "content": "..." }
      ],
      "model": "Llama-3.2-1B-Instruct-q4f32_1-MLC",
      "timestamp": 1634567890000,
      "lastModified": 1634567891000
    }
  ],
  "customModels": [...],
  "exportDate": "2025-01-18T12:00:00.000Z"
}
```

### Limites de Taille / Size Limits

- **localStorage** : ~5-10 MB selon le navigateur
- **Conversations** : Limité à 50 pour éviter de dépasser la limite
- **Messages** : Aucune limite par conversation

---

## 🐛 Dépannage / Troubleshooting

### L'historique ne se charge pas / History won't load

**Problème** : Le panneau d'historique est vide

**Solutions** :
1. Vérifiez que des conversations ont été sauvegardées
2. Ouvrez la console (F12) et vérifiez les erreurs
3. Vérifiez `localStorage` : `localStorage.getItem('conversationHistory')`
4. Essayez de vider le cache et recharger

---

### "Quota exceeded" erreur / "Quota exceeded" error

**Problème** : Erreur lors de la sauvegarde

**Solutions** :
1. Supprimez des conversations anciennes
2. Exportez l'historique
3. Videz `localStorage` : `localStorage.clear()`
4. Importez uniquement les conversations importantes

---

### La conversation ne se charge pas correctement / Conversation won't load properly

**Problème** : Messages manquants ou erreur au chargement

**Solutions** :
1. Essayez de recharger la page
2. Vérifiez que la conversation n'est pas corrompue
3. Supprimez la conversation problématique
4. Réimportez depuis une sauvegarde

---

### Les conversations disparaissent / Conversations disappear

**Problème** : L'historique se vide

**Causes possibles** :
- Mode navigation privée (localStorage est effacé à la fermeture)
- Nettoyage du cache du navigateur
- Extension de nettoyage automatique
- Problème de synchronisation du navigateur

**Solutions** :
- Utilisez un navigateur normal (pas privé)
- Désactivez le nettoyage automatique pour ce site
- Exportez régulièrement votre historique

---

## 🔐 Confidentialité et Sécurité / Privacy and Security

### Où Vont les Données ? / Where Does Data Go?

**Réponse courte** : Nulle part ! 🎉

**Détails** :
- ✅ Tout est stocké dans votre navigateur (localStorage)
- ✅ Aucune connexion réseau n'est établie
- ✅ Aucun serveur distant n'est contacté
- ✅ Les conversations restent sur votre appareil

### Qui Peut Voir Mes Conversations ? / Who Can See My Conversations?

**Personne !** Sauf :
- Vous-même
- Quelqu'un ayant accès physique à votre ordinateur
- Logiciels malveillants sur votre système (comme pour n'importe quel fichier local)

### Puis-je Partager Mes Conversations ? / Can I Share Conversations?

**Oui**, via l'export :
1. Exportez votre historique
2. Partagez le fichier JSON
3. L'autre personne peut l'importer

⚠️ **Attention** : Ne partagez que si vous êtes sûr du contenu !

---

## 📈 Statistiques / Statistics

Au bas du panneau, vous verrez :
```
X conversation(s) sauvegardée(s)
```

Cela indique le nombre total de conversations dans l'historique.

---

## 🎓 Cas d'Usage Avancés / Advanced Use Cases

### 1. Archivage par Projet / Project Archiving

```
1. Export régulier par projet
2. Nommage : project-name-2025-01-15.json
3. Import au besoin
```

### 2. Sauvegarde Automatisée / Automated Backup

**Console JavaScript** :
```javascript
// Exporter automatiquement
const data = llmStore.exportHistory();
// Sauvegarder dans votre système de fichiers
```

### 3. Migration entre Navigateurs / Browser Migration

```
1. Exporter depuis l'ancien navigateur
2. Installer l'app dans le nouveau navigateur
3. Importer le fichier JSON
4. Toutes les conversations sont transférées !
```

---

## ❓ FAQ

**Q : Combien de conversations puis-je sauvegarder ?**  
R : 50 conversations sont conservées. Les plus anciennes sont automatiquement supprimées.

**Q : Puis-je augmenter cette limite ?**  
R : Oui, en modifiant le code dans `llm.svelte.js` ligne 373.

**Q : Les conversations sont-elles synchronisées entre appareils ?**  
R : Non, elles restent locales à chaque navigateur.

**Q : Puis-je rechercher dans mes conversations ?**  
R : Pas encore, mais c'est une fonctionnalité future !

**Q : Le modèle change-t-il automatiquement au chargement d'une conversation ?**  
R : Non, pour éviter les rechargements. Vous pouvez le changer manuellement.

**Q : Que se passe-t-il si je vide mon cache ?**  
R : L'historique est perdu. Exportez régulièrement !

---

## 🚀 Prochaines Fonctionnalités / Upcoming Features

- [ ] Recherche dans les conversations
- [ ] Tags/catégories pour les conversations
- [ ] Favoris
- [ ] Statistiques d'utilisation
- [ ] Export en Markdown/PDF
- [ ] Synchronisation cloud (optionnelle)

---

## 📚 Ressources / Resources

- `README.md` - Documentation principale
- `MODELES.md` - Guide des modèles
- `CUSTOM_MODELS.md` - Modèles personnalisés
- `QUICKSTART.md` - Démarrage rapide

---

**Profitez de votre historique sauvegardé ! / Enjoy your saved history!** 💬✨
