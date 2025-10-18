# 🏗️ Architecture Technique / Technical Architecture

Ce document explique l'architecture de l'application **Ho my AI!**.

This document explains the architecture of the **Ho my AI!** application.

## 📊 Vue d'Ensemble / Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Navigateur / Browser                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Interface Svelte (UI)                    │  │
│  │  - +page.svelte (Chat UI)                            │  │
│  │  - ChatMessage.svelte (Messages)                      │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │          Store Svelte (State Management)              │  │
│  │  - llm.svelte.js (LLM Store avec Runes)              │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │              WebLLM Library                           │  │
│  │  - MLCEngine (Moteur d'inférence)                    │  │
│  │  - Model Manager (Gestion des modèles)               │  │
│  └───────────────┬───────────────────────────────────────┘  │
│                  │                                           │
│  ┌───────────────▼───────────────────────────────────────┐  │
│  │          WebAssembly Runtime                          │  │
│  │  - WASM Module (Modèle compilé)                      │  │
│  │  - WebGPU/WebGL (Accélération)                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │          Cache (IndexedDB)                           │   │
│  │  - Modèles téléchargés                              │   │
│  │  - Poids du réseau neuronal                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

## 🧩 Composants Principaux / Main Components

### 1. Interface Utilisateur / User Interface

#### `/src/routes/+page.svelte`
- **Rôle** : Page principale du chat
- **Responsabilités** :
  - Afficher l'interface de chat
  - Gérer les interactions utilisateur
  - Auto-scroll des messages
  - Afficher l'état de chargement

**Fonctions clés / Key functions** :
```javascript
- handleSend()        // Envoie un message / Send a message
- handleKeydown()     // Gestion du clavier / Keyboard handling
- $effect()           // Auto-scroll réactif / Reactive auto-scroll
```

#### `/src/lib/components/ChatMessage.svelte`
- **Rôle** : Composant pour afficher un message
- **Props** : `{ message: { role, content } }`
- **Features** :
  - Différenciation visuelle user/assistant
  - Support du texte multi-lignes
  - Icons SVG intégrés

### 2. Gestion de l'État / State Management

#### `/src/lib/stores/llm.svelte.js`
- **Rôle** : Store centralisé pour la logique LLM
- **Pattern** : Svelte 5 Runes (`$state`)
- **État géré / Managed state** :
  ```javascript
  {
    engine: null,              // Instance MLCEngine
    messages: [],              // Historique des messages
    isLoading: false,          // Chargement du modèle
    isGenerating: false,       // Génération en cours
    loadingProgress: '',       // Progression du téléchargement
    selectedModel: 'Llama...', // Modèle sélectionné
    error: null                // Erreurs
  }
  ```

**Méthodes principales / Main methods** :
```javascript
- initEngine()       // Initialise le moteur WebLLM
- sendMessage()      // Envoie un message et génère la réponse
- clearMessages()    // Efface la conversation
- changeModel()      // Change de modèle
```

### 3. Moteur WebLLM / WebLLM Engine

#### Initialisation / Initialization
```javascript
const engine = await CreateMLCEngine(modelName, {
  initProgressCallback: (progress) => {
    // Suivi de la progression / Progress tracking
  }
});
```

#### Génération de Texte / Text Generation
```javascript
const stream = await engine.chat.completions.create({
  messages: [...],
  temperature: 0.7,
  max_tokens: 512,
  stream: true  // Mode streaming
});
```

## 🔄 Flux de Données / Data Flow

### 1. Initialisation de l'Application / Application Initialization

```
User ouvre l'app
    ↓
onMount() déclenché
    ↓
llmStore.initEngine()
    ↓
CreateMLCEngine() appelé
    ↓
Téléchargement du modèle (CDN)
    ↓
Mise en cache (IndexedDB)
    ↓
Compilation WASM
    ↓
Modèle prêt ✓
```

### 2. Envoi d'un Message / Sending a Message

```
User tape un message
    ↓
handleSend() appelé
    ↓
llmStore.sendMessage(message)
    ↓
Ajout du message user à l'historique
    ↓
engine.chat.completions.create()
    ↓
Génération en streaming
    ↓
Pour chaque chunk :
  - Mise à jour du message assistant
  - Réactivité Svelte déclenche le re-render
    ↓
Génération terminée
```

### 3. Streaming de Réponse / Response Streaming

```javascript
// Boucle de streaming / Streaming loop
for await (const chunk of asyncChunkGenerator) {
  const newContent = chunk.choices[0]?.delta?.content || '';
  
  // Mise à jour réactive du state
  // Reactive state update
  this.messages = this.messages.map((msg, idx) => 
    idx === assistantMessageIndex 
      ? { ...msg, content: msg.content + newContent }
      : msg
  );
}
```

## 🧠 Fonctionnement de WebLLM / How WebLLM Works

### Architecture Interne / Internal Architecture

```
┌─────────────────────────────────────────┐
│          WebLLM Components              │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     Model Loader                  │ │
│  │  - Télécharge les poids du modèle│ │
│  │  - Gère le cache IndexedDB        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     TVM Runtime (WASM)            │ │
│  │  - Moteur d'inférence compilé    │ │
│  │  - Optimisé pour le navigateur    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     WebGPU/WebGL Backend          │ │
│  │  - Accélération matérielle        │ │
│  │  - Calculs parallèles sur GPU     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │     Tokenizer                     │ │
│  │  - Encode/décode les tokens       │ │
│  │  - Gestion du vocabulaire         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### Pipeline d'Inférence / Inference Pipeline

```
Texte d'entrée / Input text
    ↓
Tokenization (texte → tokens)
    ↓
Embedding (tokens → vecteurs)
    ↓
Transformer Layers (WASM + GPU)
  - Self-Attention
  - Feed-Forward Networks
  - Layer Normalization
    ↓
Génération du token suivant
    ↓
Détokenization (token → texte)
    ↓
Texte de sortie (streaming)
```

## 💾 Gestion de la Mémoire / Memory Management

### Cache du Modèle / Model Cache

```javascript
// Structure du cache IndexedDB
{
  dbName: "webllm",
  stores: {
    "params": {
      // Poids du modèle / Model weights
      "model_params_shard_0": ArrayBuffer,
      "model_params_shard_1": ArrayBuffer,
      // ...
    },
    "config": {
      // Configuration du modèle
      "model_config.json": Object
    }
  }
}
```

### Optimisations Mémoire / Memory Optimizations

1. **Quantification** : Poids en 4-bit au lieu de 32-bit
   - Réduction de ~8x de la taille / ~8x size reduction
   
2. **Streaming** : Génération token par token
   - Évite de charger toute la réponse en mémoire
   - Avoid loading entire response in memory
   
3. **Cache intelligent** : Réutilisation du modèle
   - Pas de retéléchargement / No re-download
   - Chargement instantané après la première fois

## 🔒 Sécurité / Security

### En-têtes COOP/COEP / COOP/COEP Headers

**Pourquoi ? / Why?**
- Nécessaire pour `SharedArrayBuffer`
- Requis par WebAssembly pour performances optimales
- Required by WebAssembly for optimal performance

**Configuration** :
```javascript
// vite.config.js
server: {
  headers: {
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
  }
}
```

### Confidentialité / Privacy

- **100% local** : Aucune donnée envoyée à un serveur
- **Pas de tracking** : Aucune analytique externe
- **Cache local** : Données stockées uniquement dans le navigateur

## ⚡ Optimisations de Performance / Performance Optimizations

### 1. Build Optimizations

```javascript
// vite.config.js
build: {
  target: 'esnext',           // Utilise les dernières features JS
  rollupOptions: {
    output: {
      manualChunks: undefined // Évite le split excessif
    }
  }
}
```

### 2. Code Splitting

- Lazy loading des composants non-critiques
- Exclusion de `@mlc-ai/web-llm` de l'optimisation Vite
- Chargement progressif du modèle

### 3. Réactivité Svelte

```javascript
// Utilisation de Runes pour performance optimale
let messages = $state([]);     // Réactivité fine-grained
$effect(() => {                // Effects optimisés
  // Auto-scroll
});
```

## 🛠️ Technologies Utilisées / Technologies Used

| Technologie | Rôle | Version |
|------------|------|---------|
| **SvelteKit** | Framework web | ^2.43.2 |
| **Svelte 5** | UI réactive | ^5.39.5 |
| **Bun** | Runtime JS | ^1.2.16 |
| **Vite** | Build tool | ^7.1.7 |
| **TailwindCSS** | Styling | ^4.1.13 |
| **WebLLM** | LLM Engine | ^0.2.79 |
| **WebAssembly** | Runtime natif | - |
| **WebGPU** | Accélération GPU | - |

## 📈 Métriques de Performance / Performance Metrics

### Temps de Chargement / Loading Times

| Phase | Temps Typique |
|-------|---------------|
| Téléchargement modèle | 1-5 min (selon connexion) |
| Compilation WASM | 10-30 sec |
| Initialisation | 5-10 sec |
| **Total première fois** | **2-6 min** |
| **Chargements suivants** | **10-40 sec** |

### Génération de Texte / Text Generation

| Métrique | Llama-3.2-1B | Llama-3.2-3B |
|----------|--------------|--------------|
| Tokens/sec (laptop) | 15-30 | 8-15 |
| Tokens/sec (desktop) | 40-60 | 20-35 |
| Latence premier token | 100-300ms | 200-500ms |

## 🔮 Évolutions Futures / Future Improvements

### Court Terme / Short Term
- [ ] Sélecteur de modèle dans l'UI
- [ ] Paramètres ajustables (temperature, etc.)
- [ ] Export de conversations

### Moyen Terme / Medium Term
- [ ] Support du markdown
- [ ] Syntax highlighting
- [ ] Mode PWA (offline)
- [ ] Utilisation de WebGPU quand disponible

### Long Terme / Long Term
- [ ] Support multi-modal (images)
- [ ] Fine-tuning personnalisé
- [ ] RAG (Retrieval Augmented Generation)
- [ ] Plugins extensibles

## 📚 Ressources Additionnelles / Additional Resources

- [WebLLM Architecture](https://github.com/mlc-ai/web-llm)
- [TVM Runtime](https://tvm.apache.org/)
- [WebAssembly Spec](https://webassembly.github.io/spec/)
- [Svelte 5 Runes](https://svelte.dev/blog/runes)
- [WebGPU API](https://www.w3.org/TR/webgpu/)

---

**Documentation mise à jour** : Janvier 2025
