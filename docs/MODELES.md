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
  - Les variantes **E2B/E4B** ("Efficient") tiennent confortablement dans WebGPU. Le **26B A4B** a un port ONNX communautaire mais **a été retiré du catalogue** : ses 16 Gio de fichiers dépassent ce qu'un onglet peut charger (voir section 7) ; la **31B** n'a toujours aucun port navigateur / The **E2B/E4B** ("Efficient") variants fit comfortably in WebGPU. The **26B A4B** has a community ONNX port but **was removed from the catalog**: its 16 GiB of files exceed what a tab can load (see section 7); the **31B** still has no browser port at all.
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

### 7. **Gemma 4 (26B A4B)** — retiré du catalogue / removed from the catalog
- **Port essayé / Port tried**: `kibitz-coach/gemma-4-26B-A4B-it-ONNX` (décodeur `q4f16` en huit tranches, `embed_tokens` en `fp16`, 16,04 Gio au total / `q4f16` decoder in eight shards, `fp16` `embed_tokens`, 16.04 GiB in total)
- **Pourquoi il ne charge pas / Why it does not load**: Transformers.js 4.3 garde chaque fichier du modèle en entier dans la mémoire de l'onglet, sous forme d'ArrayBuffer, avant de le confier à onnxruntime. Chrome plafonne ces tampons à **15,75 Gio par page** (mesuré le 23 septembre 2026 sur Chrome 154, macOS, 64 Go de RAM). Sur ohmyai.org, les huit tranches du décodeur arrivaient, puis l'allocation du tampon des embeddings échouait. La limite est celle du navigateur : plus de RAM n'y change rien / Transformers.js 4.3 keeps every model file whole in the tab's memory, as an ArrayBuffer, before handing it to onnxruntime. Chrome caps those buffers at **15.75 GiB per page** (measured on September 23, 2026 on Chrome 154, macOS, 64 GB of RAM). On ohmyai.org, the eight decoder shards arrived, then allocating the embeddings buffer failed. The limit is the browser's: more RAM changes nothing.
- **Pourquoi l'interface restait bloquée / Why the UI stayed stuck**: Transformers.js perd l'erreur d'une tranche de données externes et attend indéfiniment. L'application écoute désormais ces rejets pendant le chargement et affiche une erreur (`src/lib/engines/loadFailure.js`) / Transformers.js loses an external data chunk's error and waits forever. The app now listens for those rejections while loading and shows an error (`src/lib/engines/loadFailure.js`).
- **Garde-fou / Guard rail**: la vérification matérielle refuse tout modèle Transformers.js de plus de 15 Go, sans bouton de contournement (`TRANSFORMERS_MAX_MODEL_GB` dans `src/lib/llm/hardware.js`) / the hardware check refuses any Transformers.js model above 15 GB, with no override button.
- **Ce qui le rendrait possible / What would make it possible**: un chargement qui confie les poids à onnxruntime par morceaux au lieu de fichiers entiers, ou une quantification plus agressive sous 15 Go / a loading path that hands weights to onnxruntime piece by piece instead of whole files, or a more aggressive quantization under 15 GB.
- Deux autres dépôts « ONNX » de cette variante existent (`justinchuby/gemma-4-26b-a4b-it-onnx`, `ReconOut/gemma-4-26B-A4B-it-oQ8e`) mais sont au format **onnxruntime-genai** ou en safetensors : Transformers.js ne peut pas les charger / Two other "ONNX" repositories of this variant exist but are in the **onnxruntime-genai** format or in safetensors: Transformers.js cannot load them.

### 7 bis. **Gemma 4 (12B)** — pas encore de port navigateur / no browser port yet
- **Modèle source / Source model**: `google/gemma-4-12B-it` (dense, 11,95 milliards de paramètres, texte + images + audio, 256K de contexte / dense, 11.95 billion parameters, text + images + audio, 256K context)
- **État au 19 septembre 2026 / Status as of September 19, 2026**:
  - Google ne publie que des safetensors et des GGUF (`gemma-4-12B-it-qat-q4_0-gguf`) / Google only publishes safetensors and GGUF (`gemma-4-12B-it-qat-q4_0-gguf`).
  - `mlc-ai` n'a aucun build Gemma 4, et `mlc-llm` ne connaît pas l'architecture `gemma4` : WebLLM est hors jeu / `mlc-ai` has no Gemma 4 build and `mlc-llm` does not know the `gemma4` architecture: WebLLM is out.
  - Le seul export ONNX (`justinchuby/gemma-4-12b-onnx`) est au format **onnxruntime-genai** (`genai_config.json`, décodeur/embedding/encodeurs séparés, opérateurs fusionnés `com.microsoft`), issu du modèle de base et non de la version instruite. Transformers.js ne peut pas le charger / The only ONNX export (`justinchuby/gemma-4-12b-onnx`) is in the **onnxruntime-genai** format (`genai_config.json`, separate decoder/embedding/encoders, fused `com.microsoft` operators), built from the base model rather than the instruction-tuned one. Transformers.js cannot load it.
  - Produire notre propre export n'est pas à portée d'un script : `optimum-onnx` n'enregistre pas `gemma4`, et `onnx-community` n'a pas publié la méthode utilisée pour E2B/E4B (voir la discussion « ONNX conversion script? » sur leur dépôt) / Producing our own export is not a script away: `optimum-onnx` does not register `gemma4`, and `onnx-community` has not published the method used for E2B/E4B (see the "ONNX conversion script?" discussion on their repository).
- **Spike du 19 septembre 2026 / Spike of September 19, 2026** (`scripts/spike-gemma4-onnx/`, résultats dans son README / results in its README) : le décodeur texte du 12B **s'exporte avec l'outillage standard** (`torch.onnx.export` en mode dynamo, transformers 5.17, opérateurs décomposés, sans fusion) et **tourne sur WebGPU en q4 sans aucun NaN**, avec le même premier jeton que PyTorch et huit jetons gloutons identiques avant une divergence due à la quantification, identique sur CPU. Poids q4 : 8,2 Go en quatre tranches de 2 Go. L'étape de fusion d'opérateurs jugée obligatoire par la communauté ne l'est donc pas pour la stabilité ; elle reste souhaitable pour la vitesse, mesurée à 374 ms par jeton sur un M1 Max sans optimisation / the 12B text decoder **exports with standard tooling** (`torch.onnx.export` in dynamo mode, transformers 5.17, decomposed operators, no fusion) and **runs on WebGPU in q4 with no NaN at all**, with the same first token as PyTorch and eight identical greedy tokens before a quantization-induced divergence, identical on CPU. q4 weights: 8.2 GB in four 2 GB shards. The operator-fusion step the community deemed mandatory is therefore not required for stability; it remains desirable for speed, measured at 374 ms per token on an M1 Max without optimization.
- **Ce qu'il reste pour l'intégrer / What remains to integrate it**: un dépôt au format Transformers.js (`config.json` avec `transformers.js_config`, `onnx/embed_tokens_*.onnx`, `onnx/decoder_model_merged_*.onnx`, `onnx/vision_encoder_*.onnx`, `tokenizer.json`). Le moteur actuel le chargerait alors sans modification, via `Gemma4ForConditionalGeneration` comme E4B. Poids attendus en `q4f16` : environ 7 Go pour le décodeur plus l'encodeur vision en fp16 / A repository in the Transformers.js layout (`config.json` with `transformers.js_config`, `onnx/embed_tokens_*.onnx`, `onnx/decoder_model_merged_*.onnx`, `onnx/vision_encoder_*.onnx`, `tokenizer.json`). The current engine would then load it unchanged, through `Gemma4ForConditionalGeneration` like E4B. Expected `q4f16` weights: about 7 GB for the decoder plus the fp16 vision encoder.

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
