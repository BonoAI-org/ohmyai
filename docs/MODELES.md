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

### 5. **Gemma 4 (E2B) — WebGPU** 🧪 (Expérimental / Experimental)
- **Taille / Size**: ~2.4 GB
- **RAM requise / Required RAM**: ~4 GB
- **Moteur / Engine**: **Transformers.js** (ONNX Runtime Web), *pas* WebLLM/MLC
- **Modèle / Model**: `onnx-community/gemma-4-e2b-it-ONNX`
- **Cas d'usage / Use cases**:
  - Discussions générales avec le dernier modèle de Google / General chat with Google's latest model
- **Notes importantes / Important notes**:
  - ⚠️ **Texte uniquement** pour l'instant (la vision de Gemma 4 n'est pas encore portée dans le navigateur) / **Text only** for now (Gemma 4 vision is not yet ported to the browser).
  - Seules les variantes **E2B/E4B** ("Efficient") tiennent dans WebGPU ; les gros Gemma 4 (26B A4B, 31B) n'ont **pas de port ONNX navigateur** et demanderaient trop de VRAM / Only the **E2B/E4B** ("Efficient") variants fit in WebGPU; the big Gemma 4 (26B A4B, 31B) have **no browser ONNX port** and would need too much VRAM.
  - **Pourquoi un moteur différent ?** WebLLM/MLC ne supporte pas encore l'architecture `gemma4`. On utilise donc Transformers.js pour ce modèle, tout en gardant WebLLM pour tous les autres / **Why a different engine?** WebLLM/MLC does not yet support the `gemma4` architecture, so we use Transformers.js for this model while keeping WebLLM for all others.
  - Les fichiers sont mis en cache via la **Cache API** du navigateur (et non le cache WebLLM/OPFS) / Files are cached via the browser **Cache API** (not the WebLLM/OPFS cache).

### 6. **Gemma 4 (E4B) — WebGPU** 🧪 (Expérimental / Experimental)
- **Taille / Size**: ~5 GB
- **RAM requise / Required RAM**: ~8 GB
- **Moteur / Engine**: **Transformers.js** (ONNX Runtime Web), *pas* WebLLM/MLC
- **Modèle / Model**: `onnx-community/gemma-4-E4B-it-ONNX` (dtype `q4f16`)
- **Cas d'usage / Use cases**:
  - Meilleure qualité que E2B pour les machines avec assez de mémoire / Better quality than E2B for machines with enough memory
- **Notes importantes / Important notes**:
  - Mêmes limitations que E2B (texte uniquement, Cache API, Transformers.js) / Same limitations as E2B (text only, Cache API, Transformers.js).
  - ⚠️ Avant le téléchargement, l'app **vérifie le matériel** (RAM rapportée par le navigateur + limites de l'adaptateur WebGPU) et avertit si la machine semble trop limitée / Before download, the app **checks the hardware** (browser-reported RAM + WebGPU adapter limits) and warns if the machine seems too limited.

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
| Gemma 4 (E2B) 🧪 | 2.4 GB | ~4 GB | ⚡⚡ | ⭐⭐⭐⭐ | Dernier modèle Google (via Transformers.js) |
| Gemma 4 (E4B) 🧪 | ~5 GB | ~8 GB | ⚡ | ⭐⭐⭐⭐⭐ | Meilleur Gemma 4 navigateur (via Transformers.js) |

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
