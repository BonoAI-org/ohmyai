# 🤖 Ho my AI!

Une application web moderne qui exécute un Large Language Model (LLM) entièrement dans votre navigateur grâce à WebAssembly.

A modern web application that runs a Large Language Model (LLM) entirely in your browser using WebAssembly.

## ✨ Fonctionnalités / Features

- 🚀 **Exécution locale** : Le modèle s'exécute 100% dans votre navigateur via WebAssembly
- 🔒 **Confidentialité totale** : Aucune donnée n'est envoyée à un serveur externe
- 💬 **Interface de chat moderne** : Interface utilisateur élégante avec TailwindCSS
- ⚡ **Streaming en temps réel** : Les réponses s'affichent au fur et à mesure de leur génération
- 🎨 **Design responsive** : Fonctionne parfaitement sur ordinateur et mobile

---

- 🚀 **Local execution**: The model runs 100% in your browser via WebAssembly
- 🔒 **Complete privacy**: No data is sent to external servers
- 💬 **Modern chat interface**: Elegant UI built with TailwindCSS
- ⚡ **Real-time streaming**: Responses appear as they are generated
- 🎨 **Responsive design**: Works perfectly on desktop and mobile

## 🛠️ Technologies

- **SvelteKit** : Framework web moderne et performant / Modern and performant web framework
- **Bun** : Runtime JavaScript ultra-rapide / Ultra-fast JavaScript runtime
- **TailwindCSS** : Framework CSS utilitaire / Utility-first CSS framework
- **WebLLM** : Bibliothèque pour exécuter des LLM en WASM / Library to run LLMs in WASM
- **WebAssembly** : Compilation pour performances natives / Compilation for native performance

## 📋 Prérequis / Prerequisites

- **Bun** : Version 1.0 ou supérieure / Version 1.0 or higher
- **Navigateur moderne** : Chrome, Firefox, Safari ou Edge avec support WebAssembly / Modern browser with WebAssembly support
- **Mémoire** : Au moins 4 GB de RAM recommandé / At least 4 GB RAM recommended

## 🚀 Installation

### 1. Cloner le projet / Clone the project

```sh
git clone <votre-repo>
cd llm-wasm-app
```

### 2. Installer les dépendances / Install dependencies

```sh
bun install
```

### 3. Lancer le serveur de développement / Start development server

```sh
bun run dev
```

L'application sera accessible sur `http://localhost:5173`

The application will be available at `http://localhost:5173`

### 4. Ouvrir dans le navigateur / Open in browser

Ouvrez votre navigateur et accédez à l'URL affichée. Le modèle commencera à se télécharger automatiquement.

Open your browser and go to the displayed URL. The model will start downloading automatically.

## 📦 Build pour la production / Build for production

Pour créer une version optimisée pour la production :

To create an optimized production version:

```sh
bun run build
```

Pour prévisualiser le build de production :

To preview the production build:

```sh
bun run preview
```

## 🎯 Utilisation / Usage

### Première utilisation / First use

1. **Chargement du modèle** : Au premier chargement, le modèle (~1-2 GB) sera téléchargé et mis en cache
2. **Attendre le chargement** : Une barre de progression indiquera l'état du téléchargement
3. **Commencer à discuter** : Une fois chargé, tapez votre message et appuyez sur Entrée ou cliquez sur le bouton d'envoi

---

1. **Model loading**: On first load, the model (~1-2 GB) will be downloaded and cached
2. **Wait for loading**: A progress bar will show the download status
3. **Start chatting**: Once loaded, type your message and press Enter or click the send button

### Fonctionnalités de l'interface / Interface features

- **Enter** : Envoyer un message / Send a message
- **Shift + Enter** : Nouvelle ligne / New line
- **Bouton 🗑️** : Effacer la conversation / Clear conversation

## 🧩 Architecture du projet / Project architecture

```
llm-wasm-app/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ChatMessage.svelte     # Composant message / Message component
│   │   └── stores/
│   │       └── llm.svelte.js          # Store de gestion du LLM / LLM management store
│   ├── routes/
│   │   ├── +layout.svelte             # Layout principal / Main layout
│   │   └── +page.svelte               # Page de chat / Chat page
│   ├── app.css                        # Styles globaux / Global styles
│   └── app.html                       # Template HTML / HTML template
├── static/                            # Fichiers statiques / Static files
├── package.json                       # Dépendances / Dependencies
├── svelte.config.js                   # Configuration Svelte
├── vite.config.js                     # Configuration Vite
└── tailwind.config.js                 # Configuration Tailwind (si présent)
```

## 🔧 Configuration

### Changer le modèle / Change the model

Pour utiliser un modèle différent, modifiez la valeur de `selectedModel` dans `/src/lib/stores/llm.svelte.js` :

To use a different model, modify the `selectedModel` value in `/src/lib/stores/llm.svelte.js`:

```javascript
selectedModel = $state('Llama-3.2-1B-Instruct-q4f32_1-MLC');
```

Modèles disponibles / Available models:
- `Llama-3.2-1B-Instruct-q4f32_1-MLC` (léger / lightweight)
- `Llama-3.2-3B-Instruct-q4f32_1-MLC` (équilibré / balanced)
- `Phi-3.5-mini-instruct-q4f16_1-MLC` (rapide / fast)
- Voir la liste complète sur : https://github.com/mlc-ai/web-llm

### Ajuster les paramètres de génération / Adjust generation parameters

Dans `/src/lib/stores/llm.svelte.js`, méthode `sendMessage()` :

In `/src/lib/stores/llm.svelte.js`, `sendMessage()` method:

```javascript
const asyncChunkGenerator = await this.engine.chat.completions.create({
	messages: chatMessages,
	temperature: 0.7,      // Créativité (0-1) / Creativity (0-1)
	max_tokens: 512,       // Longueur max / Max length
	stream: true,
});
```

## 🐛 Dépannage / Troubleshooting

### Le modèle ne se charge pas / Model won't load

- Vérifiez votre connexion internet / Check your internet connection
- Assurez-vous d'avoir assez d'espace disque (cache du navigateur) / Make sure you have enough disk space (browser cache)
- Essayez un modèle plus petit / Try a smaller model

### Erreur de mémoire / Memory error

- Fermez les autres onglets / Close other tabs
- Utilisez un modèle plus petit / Use a smaller model
- Augmentez la RAM disponible pour votre navigateur / Increase available RAM for your browser

### Performance lente / Slow performance

- Utilisez un navigateur basé sur Chromium (Chrome, Edge) pour de meilleures performances
- Assurez-vous que l'accélération matérielle est activée dans les paramètres du navigateur
- Essayez un modèle quantifié plus petit / Try a smaller quantized model

---

- Use a Chromium-based browser (Chrome, Edge) for better performance
- Make sure hardware acceleration is enabled in browser settings
- Try a smaller quantized model

## 📚 Ressources / Resources

- [Documentation WebLLM](https://github.com/mlc-ai/web-llm)
- [Documentation SvelteKit](https://kit.svelte.dev/)
- [Documentation Bun](https://bun.sh/)
- [TailwindCSS](https://tailwindcss.com/)

## 📝 Licence / License

MIT

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

Contributions are welcome! Feel free to open an issue or pull request.
