# 🎨 Guide des Modèles Personnalisés / Custom Models Guide

Ce guide explique comment ajouter et utiliser vos propres modèles LLM personnalisés dans l'application.

This guide explains how to add and use your own custom LLM models in the application.

---

## ✨ Fonctionnalité / Feature

Vous pouvez maintenant ajouter vos propres modèles WebLLM compatibles en plus des modèles standard fournis !

You can now add your own WebLLM-compatible models in addition to the provided standard models!

### Avantages / Benefits

- ✅ **Flexibilité totale** : Utilisez n'importe quel modèle compatible WebLLM
- ✅ **Persistance** : Les modèles personnalisés sont sauvegardés dans le navigateur
- ✅ **Gestion facile** : Ajoutez et supprimez des modèles via l'interface
- ✅ **Pas de limite** : Ajoutez autant de modèles que vous voulez

---

## 📖 Comment Ajouter un Modèle / How to Add a Model

### Étape 1 : Ouvrir le Sélecteur / Step 1: Open the Selector

1. Cliquez sur le bouton **⚙️ [Nom du modèle]** dans le header
2. Le menu déroulant s'affiche avec tous les modèles disponibles

### Étape 2 : Cliquer sur "Ajouter un Modèle" / Step 2: Click "Add Model"

Au bas du menu, cliquez sur le bouton vert :
**➕ Ajouter un modèle personnalisé / Add custom model**

### Étape 3 : Remplir le Formulaire / Step 3: Fill the Form

Un modal s'ouvre avec les champs suivants :

#### Champs Requis / Required Fields

1. **ID du Modèle / Model ID** ⚠️ **IMPORTANT**
   - L'identifiant unique du modèle (généralement fourni par le créateur)
   - Exemple : `Llama-3.2-1B-Instruct-q4f32_1-MLC`
   - **Doit correspondre exactement** au nom du modèle dans WebLLM

2. **Nom d'Affichage / Display Name**
   - Le nom qui apparaîtra dans l'interface
   - Exemple : `Mon Modèle Personnalisé`
   - Peut être n'importe quel texte descriptif

3. **URL du Modèle / Model URL**
   - L'URL de base où le modèle est hébergé
   - Doit être accessible publiquement
   - Exemple : `https://huggingface.co/mlc-ai/Mon-Modele-MLC`

#### Champs Optionnels / Optional Fields

4. **Taille Estimée / Estimated Size**
   - La taille approximative du modèle
   - Exemple : `~1.5 GB`

5. **Description**
   - Une courte description du modèle
   - Exemple : `Modèle optimisé pour la génération de code Python`

### Étape 4 : Ajouter / Step 4: Add

Cliquez sur **➕ Ajouter le Modèle / Add Model**

Le modèle apparaît maintenant dans la section "Modèles Personnalisés" du menu !

---

## 🔍 Où Trouver des Modèles / Where to Find Models

### Option 1 : HuggingFace MLC-AI

Les modèles officiels WebLLM sont disponibles sur HuggingFace :

```
https://huggingface.co/mlc-ai
```

**Exemples de modèles disponibles** :
- `mlc-ai/Mistral-7B-Instruct-v0.2-q4f16_1-MLC`
- `mlc-ai/gemma-2b-it-q4f16_1-MLC`
- `mlc-ai/RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC`

### Option 2 : Compiler Vos Propres Modèles

Vous pouvez compiler vos propres modèles avec [MLC-LLM](https://github.com/mlc-ai/mlc-llm) :

1. Téléchargez MLC-LLM
2. Compilez votre modèle au format MLC
3. Hébergez-le sur un serveur accessible
4. Ajoutez-le à l'application !

---

## 📝 Exemple Complet / Complete Example

### Configuration pour Mistral 7B

```yaml
ID: Mistral-7B-Instruct-v0.2-q4f16_1-MLC
Nom: Mistral 7B Instruct v0.2
URL: https://huggingface.co/mlc-ai/Mistral-7B-Instruct-v0.2-q4f16_1-MLC
Taille: ~4.2 GB
Description: Modèle Mistral 7B optimisé pour les instructions, excellente qualité
```

### Configuration pour Gemma 2B

```yaml
ID: gemma-2b-it-q4f16_1-MLC
Nom: Gemma 2B Instruct
URL: https://huggingface.co/mlc-ai/gemma-2b-it-q4f16_1-MLC
Taille: ~1.3 GB
Description: Modèle Google Gemma compact et rapide
```

---

## 🗑️ Supprimer un Modèle / Delete a Model

1. Ouvrez le sélecteur de modèles
2. Survolez un modèle personnalisé
3. Un bouton **🗑️** rouge apparaît à droite
4. Cliquez pour supprimer (après confirmation)

**Note** : Les modèles standard ne peuvent pas être supprimés.

---

## ⚙️ Configuration Technique / Technical Configuration

### Format des Modèles / Model Format

Les modèles doivent être au format **MLC (Machine Learning Compilation)** :
- Compilés avec TVM
- Optimisés pour WebAssembly
- Incluent les fichiers de configuration nécessaires

### Structure Attendue / Expected Structure

```
model-url/
├── mlc-chat-config.json      # Configuration du modèle
├── ndarray-cache.json         # Métadonnées des poids
├── params_shard_*.bin         # Fichiers de poids (multiples shards)
└── tokenizer.json             # Tokenizer
```

### En-têtes CORS / CORS Headers

⚠️ **Important** : L'URL du modèle doit avoir les en-têtes CORS appropriés :

```
Access-Control-Allow-Origin: *
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
```

---

## 🐛 Dépannage / Troubleshooting

### Le modèle ne se charge pas / Model won't load

**Problème** : Erreur lors du chargement du modèle personnalisé

**Solutions** :
1. Vérifiez que l'ID du modèle est correct
2. Assurez-vous que l'URL est accessible publiquement
3. Testez l'URL dans votre navigateur
4. Vérifiez les en-têtes CORS du serveur
5. Consultez la console du navigateur pour plus de détails

### "Un modèle avec cet ID existe déjà"

**Problème** : L'ID que vous essayez d'utiliser est déjà pris

**Solution** : Utilisez un ID unique ou supprimez d'abord le modèle existant

### Le modèle est très lent / Model is very slow

**Problème** : Le modèle prend beaucoup de temps à générer

**Solutions** :
1. Vérifiez la taille du modèle (peut être trop gros)
2. Utilisez un modèle quantifié (q4f16 ou q4f32)
3. Fermez les autres onglets du navigateur
4. Assurez-vous d'avoir assez de RAM

---

## 💾 Sauvegarde et Données / Storage and Data

### Où sont stockés les modèles personnalisés ? / Where are custom models stored?

Les **configurations** des modèles personnalisés sont sauvegardées dans :
- `localStorage` du navigateur
- Clé : `customModels`

Les **fichiers du modèle** (poids, config) sont téléchargés et cachés dans :
- `IndexedDB` du navigateur
- Base de données : `webllm`

### Les données sont-elles partagées ? / Is data shared?

❌ **Non !** Tout reste 100% local :
- Aucune donnée n'est envoyée à un serveur externe
- Les modèles sont stockés uniquement dans votre navigateur
- Vos configurations sont privées

### Comment sauvegarder mes modèles ? / How to backup my models?

Pour sauvegarder vos **configurations** :

```javascript
// Dans la console du navigateur / In browser console
const customModels = localStorage.getItem('customModels');
console.log(customModels); // Copiez cette valeur
```

Pour restaurer :

```javascript
// Dans la console du navigateur / In browser console
localStorage.setItem('customModels', 'VALEUR_COPIEE');
window.location.reload();
```

---

## 🔐 Sécurité / Security

### Modèles de Confiance Uniquement / Trusted Models Only

⚠️ **Avertissement de Sécurité / Security Warning** :

N'ajoutez que des modèles provenant de sources fiables :
- Dépôts officiels (HuggingFace mlc-ai)
- Vos propres modèles compilés
- Sources vérifiées et reconnues

**Pourquoi ?** Les modèles malveillants pourraient :
- Consommer beaucoup de ressources
- Générer du contenu inapproprié
- Exploiter des vulnérabilités du navigateur

---

## 📚 Ressources / Resources

### Documentation Officielle

- [WebLLM GitHub](https://github.com/mlc-ai/web-llm)
- [MLC-LLM Documentation](https://llm.mlc.ai/)
- [Liste des Modèles Supportés](https://github.com/mlc-ai/web-llm/blob/main/src/config.ts)

### Tutoriels / Tutorials

- [Compiler un Modèle MLC](https://llm.mlc.ai/docs/compilation/compile_models.html)
- [Héberger un Modèle](https://llm.mlc.ai/docs/deploy/webllm.html)

---

## 🎉 Exemples d'Utilisation / Usage Examples

### Cas d'Usage 1 : Modèle Multilingue

```yaml
ID: Qwen2.5-7B-Instruct-q4f16_1-MLC
Nom: Qwen 2.5 7B (Multilingue)
URL: https://huggingface.co/mlc-ai/Qwen2.5-7B-Instruct-q4f16_1-MLC
Description: Excellent pour le chinois, japonais, coréen et français
```

### Cas d'Usage 2 : Modèle Spécialisé Code

```yaml
ID: CodeLlama-7b-Instruct-hf-q4f16_1-MLC
Nom: CodeLlama 7B
URL: https://huggingface.co/mlc-ai/CodeLlama-7b-Instruct-hf-q4f16_1-MLC
Description: Spécialisé pour la génération et l'explication de code
```

### Cas d'Usage 3 : Modèle Léger

```yaml
ID: TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC
Nom: TinyLlama 1.1B
URL: https://huggingface.co/mlc-ai/TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC
Description: Très rapide, idéal pour les appareils moins puissants
```

---

## ❓ FAQ

**Q : Combien de modèles puis-je ajouter ?**
R : Illimité ! Mais attention à l'espace disque du cache du navigateur.

**Q : Les modèles personnalisés sont-ils aussi rapides que les standards ?**
R : Oui, si ils sont correctement compilés au format MLC.

**Q : Puis-je partager mes modèles personnalisés ?**
R : Oui, partagez simplement l'ID et l'URL du modèle.

**Q : Les modèles fonctionnent-ils hors ligne ?**
R : Une fois téléchargés et mis en cache, oui !

**Q : Que se passe-t-il si je vide le cache ?**
R : Les configurations restent, mais les modèles devront être retéléchargés.

---

**Besoin d'aide ? / Need help?**

Consultez les autres guides :
- `README.md` - Documentation principale
- `MODELES.md` - Guide des modèles standard
- `QUICKSTART.md` - Démarrage rapide

---

**Bon ajout de modèles ! / Happy model adding!** 🎨✨
