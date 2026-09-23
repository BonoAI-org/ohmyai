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
  - ✅ **Texte + images** : l'encodeur vision est chargé via `Gemma4ForConditionalGeneration` ; attachez des images avec le bouton 🖼️ / **Text + images**: the vision encoder is loaded via `Gemma4ForConditionalGeneration`; attach images with the 🖼️ button. (Audio pas encore branché côté UI / Audio not wired in the UI yet.)
  - Les variantes **E2B/E4B** ("Efficient") tiennent confortablement dans WebGPU. Le **26B A4B** dispose depuis peu d'un port ONNX communautaire et figure au catalogue, mais ses 17 Go de poids le réservent aux machines à très forte mémoire graphique ; la **31B** n'a toujours aucun port navigateur / The **E2B/E4B** ("Efficient") variants fit comfortably in WebGPU. The **26B A4B** recently gained a community ONNX port and is listed in the catalog, but its 17 GB of weights restrict it to machines with very large graphics memory; the **31B** still has no browser port at all.
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
  - Mêmes capacités que E2B (texte + images, Cache API, Transformers.js) / Same capabilities as E2B (text + images, Cache API, Transformers.js).
  - ⚠️ Avant le téléchargement, l'app **vérifie le matériel** et avertit si la machine semble trop limitée, en nommant le critère fautif. WebGPU n'exposant aucune mémoire graphique totale, le budget retenu est la mémoire rapportée par le navigateur : c'est le bon chiffre sur les GPU à mémoire unifiée, et une surestimation sur une carte dédiée / Before download, the app **checks the hardware** and warns if the machine seems too limited, naming the failing criterion. Since WebGPU exposes no total graphics memory, the budget used is the browser-reported memory: the right figure on unified-memory GPUs, an overestimate on a discrete card.

### 7. **Gemma 4 (26B A4B) — WebGPU** 🧪 (Expérimental / Experimental)
- **Taille / Size**: ~17 GB
- **RAM requise / Required RAM**: ~20 GB de mémoire graphique / ~20 GB of graphics memory
- **Moteur / Engine**: **Transformers.js** (ONNX Runtime Web), *pas* WebLLM/MLC
- **Modèle / Model**: `kibitz-coach/gemma-4-26B-A4B-it-ONNX` (dtype `q4f16` pour le décodeur, `fp16` pour `embed_tokens`, seule précision publiée pour ce fichier / `q4f16` for the decoder, `fp16` for `embed_tokens`, the only precision published for that file)
- **Cas d'usage / Use cases**:
  - La meilleure qualité de la famille Gemma 4 accessible en navigateur, sur une machine qui peut la porter / The best quality in the Gemma 4 family reachable in a browser, on a machine that can carry it
- **Notes importantes / Important notes**:
  - **Mélange d'experts** : 26 milliards de paramètres dont 4 actifs par jeton. Le calcul par jeton est celui d'un 4B, mais **tous les experts doivent résider en mémoire**, donc le poids à charger reste celui des 26 milliards / **Mixture of experts**: 26 billion parameters with 4 active per token. Per-token compute is that of a 4B model, but **all experts must reside in memory**, so the weight to load remains that of the full 26 billion.
  - ⚠️ **Texte seul**, contrairement à E2B et E4B : ce port n'embarque pas d'encodeur vision, le bouton 🖼️ n'apparaît donc pas / ⚠️ **Text only**, unlike E2B and E4B: this port ships no vision encoder, so the 🖼️ button does not appear.
  - **Port communautaire** : Google ne publie ce modèle qu'en safetensors et `mlc-ai` n'en a aucun build. Ce dépôt est le seul au format attendu par Transformers.js / **Community port**: Google only publishes this model as safetensors and `mlc-ai` has no build of it. This repository is the only one in the layout Transformers.js expects.
  - ⚠️ La vérification matérielle le **refuse dès que le navigateur rapporte moins de 20 Go de mémoire**, avant tout téléchargement, donc sur une machine de 16 Go et moins. Un refus coûte moins cher qu'un échec après 17 Go / ⚠️ The hardware check **refuses it as soon as the browser reports less than 20 GB of memory**, before any download, so on a 16 GB machine or below. A refusal costs less than a failure after 17 GB.

### 8. **Variantes QAT de Gemma 4** 🧪 (Expérimental / Experimental)
- **Modèles / Models**: `onnx-community/gemma-4-E2B-it-qat-mobile-ONNX` (~2.6 GB), `onnx-community/gemma-4-E4B-it-qat-mobile-ONNX` (~3.6 GB)
- **Moteur / Engine**: **Transformers.js** (ONNX Runtime Web)
- **Notes importantes / Important notes**:
  - **Quantification pendant l'entraînement** et non après : le modèle apprend en tenant compte de la perte de précision, ce qui rend 2 bits utilisable là où une quantification postérieure dégraderait trop. Elles pèsent donc moins que les variantes E2B et E4B pour une qualité proche / **Quantization during training** rather than after: the model learns while accounting for the precision loss, which makes 2 bits usable where post-training quantization would degrade too much. They therefore weigh less than the E2B and E4B variants for comparable quality.
  - Texte + images comme leurs équivalents non QAT, et elles embarquent aussi un encodeur audio, pas encore branché côté interface / Text + images like their non-QAT counterparts, and they also ship an audio encoder, not wired in the UI yet.
  - Leur encodeur vision n'est publié qu'en fp16 : le catalogue déclare donc un `dtype` par sous-modèle et non une chaîne unique / Their vision encoder is only published in fp16: the catalog therefore declares a per-submodel `dtype` rather than a single string.

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
| Gemma 4 (26B A4B) 🧪 | ~17 GB | ~20 GB | ⚡ | ⭐⭐⭐⭐⭐ | Machines à très forte mémoire graphique, texte seul |
| Gemma 4 (E2B QAT) 🧪 | ~2.6 GB | ~4 GB | ⚡⚡ | ⭐⭐⭐⭐ | Gemma 4 le plus léger, texte + images |
| Gemma 4 (E4B QAT) 🧪 | ~3.6 GB | ~5 GB | ⚡⚡ | ⭐⭐⭐⭐ | E4B allégé, texte + images |
| Qwen 3.5 (2B) | ~1.1 GB | ~2.2 GB | ⚡⚡⚡ | ⭐⭐⭐⭐ | Dernier Qwen en version légère |
| Qwen 3.5 (4B) | ~2.4 GB | ~3.8 GB | ⚡⚡ | ⭐⭐⭐⭐⭐ | Dernier Qwen, bon compromis |
| Qwen 3.5 (9B) | ~5.1 GB | ~6.3 GB | ⚡ | ⭐⭐⭐⭐⭐ | Le plus capable en navigateur |
| Phi-4 Mini | ~2.2 GB | ~3.4 GB | ⚡⚡ | ⭐⭐⭐⭐ | Code et raisonnement |
| DeepSeek R1 Distill (7B) | ~4.3 GB | ~5 GB | ⚡ | ⭐⭐⭐⭐ | Raisonnement |
| Qwen 2.5 Coder (7B) | ~4.3 GB | ~5 GB | ⚡ | ⭐⭐⭐⭐⭐ | Code |

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
