# 📚 Liste des Modèles Disponibles / Available Models

Ce document liste les modèles LLM compatibles avec WebLLM que vous pouvez utiliser dans cette application.

This document lists the LLM models compatible with WebLLM that you can use in this application.

## 🎯 Modèles Recommandés / Recommended Models

### 1. **Llama-3.2-1B-Instruct-q4f32_1-MLC** ⭐ (Par défaut / Default)
- **Taille / Size**: ~650 MB
- **Performance**: Rapide / Fast
- **RAM requise / Required RAM**: 2-3 GB
- **Cas d'usage / Use cases**: 
  - Discussions générales / General conversations
  - Questions-réponses simples / Simple Q&A
  - Tâches légères / Light tasks
- **Avantages / Advantages**:
  - Téléchargement rapide / Fast download
  - Faible consommation mémoire / Low memory usage
  - Bonne vitesse d'inférence / Good inference speed

### 2. **Llama-3.2-3B-Instruct-q4f32_1-MLC**
- **Taille / Size**: ~1.9 GB
- **Performance**: Équilibrée / Balanced
- **RAM requise / Required RAM**: 4-5 GB
- **Cas d'usage / Use cases**:
  - Tâches complexes / Complex tasks
  - Raisonnement amélioré / Improved reasoning
  - Génération de code / Code generation
- **Avantages / Advantages**:
  - Meilleure qualité de réponse / Better response quality
  - Plus créatif / More creative
  - Meilleure compréhension du contexte / Better context understanding

### 3. **Phi-3.5-mini-instruct-q4f16_1-MLC**
- **Taille / Size**: ~2.2 GB
- **Performance**: Excellente / Excellent
- **RAM requise / Required RAM**: 4-6 GB
- **Cas d'usage / Use cases**:
  - Programmation / Programming
  - Mathématiques / Mathematics
  - Analyse technique / Technical analysis
- **Avantages / Advantages**:
  - Très performant pour le code / Excellent for code
  - Bonne précision / Good accuracy
  - Optimisé par Microsoft / Optimized by Microsoft

### 4. **Qwen2.5-1.5B-Instruct-q4f16_1-MLC**
- **Taille / Size**: ~950 MB
- **Performance**: Rapide / Fast
- **RAM requise / Required RAM**: 3-4 GB
- **Cas d'usage / Use cases**:
  - Support multilingue / Multilingual support
  - Tâches générales / General tasks
- **Avantages / Advantages**:
  - Excellent support des langues asiatiques / Great Asian language support
  - Bon équilibre taille/performance / Good size/performance balance

## 🔄 Comment Changer de Modèle / How to Change Model

### Méthode 1: Modifier le code / Edit the code

1. Ouvrez le fichier `/src/lib/stores/llm.svelte.js`
2. Modifiez la ligne `selectedModel` :

```javascript
// Exemple / Example:
selectedModel = $state('Phi-3.5-mini-instruct-q4f16_1-MLC');
```

3. Rechargez l'application / Reload the application

### Méthode 2: Ajouter un sélecteur dans l'UI (TODO)

Vous pouvez améliorer l'application en ajoutant un menu déroulant pour changer de modèle dynamiquement.

You can enhance the application by adding a dropdown menu to change models dynamically.

## 📊 Comparaison des Modèles / Model Comparison

| Modèle / Model | Taille / Size | RAM | Vitesse / Speed | Qualité / Quality | Recommandé pour / Recommended for |
|---|---|---|---|---|---|
| Llama-3.2-1B | 650 MB | 2-3 GB | ⚡⚡⚡ | ⭐⭐⭐ | Débutants / Beginners |
| Llama-3.2-3B | 1.9 GB | 4-5 GB | ⚡⚡ | ⭐⭐⭐⭐ | Usage général / General use |
| Phi-3.5-mini | 2.2 GB | 4-6 GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Code & Tech |
| Qwen2.5-1.5B | 950 MB | 3-4 GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Multilingue / Multilingual |

## 🔍 Autres Modèles Disponibles / Other Available Models

Pour voir la liste complète des modèles supportés par WebLLM :
- 🔗 https://github.com/mlc-ai/web-llm/blob/main/src/config.ts

To see the full list of models supported by WebLLM:
- 🔗 https://github.com/mlc-ai/web-llm/blob/main/src/config.ts

## ⚙️ Quantification Expliquée / Quantization Explained

### Qu'est-ce que la quantification ? / What is quantization?

La quantification réduit la taille du modèle en utilisant moins de bits pour les poids, ce qui diminue la mémoire requise et accélère l'inférence.

Quantization reduces model size by using fewer bits for weights, which decreases required memory and speeds up inference.

### Types de quantification / Quantization types:

- **q4f32_1**: Poids en 4-bit, calculs en float32
  - Meilleur équilibre taille/qualité / Best size/quality balance
  - Recommandé pour la plupart des usages / Recommended for most uses

- **q4f16_1**: Poids en 4-bit, calculs en float16
  - Plus rapide / Faster
  - Nécessite support GPU / Requires GPU support

- **q0f32**: Pas de quantification
  - Qualité maximale / Maximum quality
  - Très gourmand en mémoire / Very memory intensive

## 💡 Conseils / Tips

### Pour ordinateurs peu puissants / For low-end computers:
- Utilisez Llama-3.2-1B ou Qwen2.5-1.5B / Use Llama-3.2-1B or Qwen2.5-1.5B
- Fermez les autres applications / Close other applications
- Limitez max_tokens à 256 / Limit max_tokens to 256

### Pour ordinateurs puissants / For powerful computers:
- Essayez Phi-3.5-mini ou Llama-3.2-3B / Try Phi-3.5-mini or Llama-3.2-3B
- Augmentez max_tokens à 1024+ / Increase max_tokens to 1024+
- Utilisez temperature plus élevée (0.8-0.9) pour plus de créativité / Use higher temperature (0.8-0.9) for more creativity

## 🌐 Support des Langues / Language Support

| Modèle / Model | Langues supportées / Supported Languages |
|---|---|
| Llama-3.2-* | Anglais (excellent), Français (bon), Espagnol, Allemand, Italien |
| Phi-3.5-mini | Anglais (excellent), Français (bon), Code (excellent) |
| Qwen2.5-* | Chinois (excellent), Anglais (excellent), Français (bon), autres |

## 📝 Notes Importantes / Important Notes

1. **Premier chargement / First load**: Le modèle est téléchargé une seule fois et mis en cache
2. **Cache navigateur / Browser cache**: Les modèles sont stockés localement (IndexedDB)
3. **Changement de modèle / Model switching**: Efface le cache et retélécharge le nouveau modèle
4. **Performance / Performance**: Varie selon votre matériel (CPU, GPU, RAM)
