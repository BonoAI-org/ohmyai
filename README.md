# 🤖 Oh my AI!

A modern web application that runs a Large Language Model (LLM) entirely in your browser using WebAssembly.

## ✨ Features

- 🚀 **Local execution**: The model runs 100% in your browser via WebAssembly
- 🔒 **Complete privacy**: No data is sent to external servers
- 💬 **Modern chat interface**: Elegant UI built with TailwindCSS
- ⚡ **Real-time streaming**: Responses appear as they are generated
- 🎨 **Responsive design**: Works perfectly on desktop and mobile

## 🛠️ Technologies

- **SvelteKit**: Modern and performant web framework
- **Bun**: Ultra-fast JavaScript runtime
- **TailwindCSS**: Utility-first CSS framework
- **WebLLM**: Library to run LLMs in WASM (default engine, MLC models)
- **Transformers.js**: ONNX Runtime Web engine, used for models not yet supported by WebLLM (e.g. **Gemma 4 E2B** on WebGPU, text-only, experimental)
- **WebAssembly**: Compilation for native performance

## 📋 Prerequisites

- **Bun**: Version 1.3 or higher (the only package manager this project uses)
- **Node.js**: Version 20.19 or higher, required by Vite and Playwright
- **Modern browser**: Chrome, Firefox, Safari or Edge with WebAssembly support
- **Memory**: At least 4 GB RAM recommended

## 🚀 Installation

### 1. Clone the project

```sh
git clone https://github.com/BonoAI-org/ohmyai.git
cd ohmyai
```

### 2. Install dependencies

```sh
bun install
```

### 3. Start development server

```sh
bun run dev
```

The application will be available at `http://localhost:4242`

### 4. Open in browser

Open your browser and go to the displayed URL. The model will start downloading automatically.

## 📦 Build for production

To create an optimized production version:

```sh
bun run build
```

To preview the production build:

```sh
bun run preview
```

## ✅ Quality gates

These commands run locally and in CI on every pull request:

```sh
bun run check
```

```sh
bun run test
```

`check` runs svelte-check and `test` runs the Bun unit tests over `src/lib`.

Interface journeys are not covered by an automated suite. They are verified in a
real Chrome driven by Claude Code, following `e2e/README.md`. That verification
is run on demand rather than on every pull request.

## 🎯 Usage

### First use

1. **Model loading**: On first load, the model (~1-2 GB) will be downloaded and cached
2. **Wait for loading**: A progress bar will show the download status
3. **Start chatting**: Once loaded, type your message and press Enter or click the send button

### Interface features

- **Enter**: Send a message
- **Shift + Enter**: New line
- **🗑️ Button**: Clear conversation

## 🧩 Project architecture

```
ohmyai/
├── .github/workflows/ci.yml           # CI: build, svelte-check, unit tests
├── src/
│   ├── lib/
│   │   ├── components/                # UI, all assembled by the chat page
│   │   │   ├── AppHeader.svelte       # Branding, actions, language + model pickers
│   │   │   ├── ModelSelector.svelte   # Model dropdown, owns its outside-click
│   │   │   ├── StatusPanels.svelte    # RAM / loading / download / error banners
│   │   │   ├── MessageList.svelte     # Welcome screen + conversation messages
│   │   │   ├── ChatMessage.svelte     # One message, thinking block, tool calls
│   │   │   ├── ChatComposer.svelte    # Textarea, image attachments, send/stop
│   │   │   └── ...                    # Modals, history panel, knowledge base
│   │   ├── engines/
│   │   │   ├── webllm.js              # Lazy @mlc-ai/web-llm loader (own chunk)
│   │   │   ├── transformersEngine.js  # ONNX Runtime Web engine (lazy)
│   │   │   └── transformersCache.js   # Cache API probing, library-free
│   │   ├── llm/                       # Pure logic, unit-tested with `bun test`
│   │   │   ├── models.js              # Model catalog + lookup helpers
│   │   │   ├── chatContext.js         # Context assembly sent to the model
│   │   │   ├── streamBatcher.js       # Per-frame token batching
│   │   │   ├── toolLoop.js            # MCP tool-calling rounds
│   │   │   ├── hardware.js            # Pre-download hardware estimation
│   │   │   ├── conversationMeta.js    # Id, title, custom-model merging
│   │   │   ├── conversationRepo.js    # IndexedDB access (Dexie)
│   │   │   ├── storage.js             # Forgiving localStorage access
│   │   │   └── exportMarkdown.js      # Conversation export
│   │   ├── rag/                       # Local retrieval: ingestion, plain text
│   │   ├── stores/                    # Reactive state (Svelte 5 runes)
│   │   │   ├── llm.svelte.js          # LLM state owner and public facade
│   │   │   ├── mcp.svelte.js          # MCP servers and tools
│   │   │   ├── orama.svelte.js        # Vector index for the knowledge base
│   │   │   ├── theme.svelte.js        # Light/dark theme
│   │   │   └── installPrompt.svelte.js# PWA install prompt
│   │   ├── db/conversationDB.js       # Dexie schema and migrations
│   │   └── opfs.js                    # Origin Private File System helpers
│   ├── routes/
│   │   ├── +layout.svelte             # Main layout
│   │   └── +page.svelte               # Chat page, assembles the components
│   ├── service-worker.js              # PWA caching + OPFS model interception
│   ├── app.css                        # Global styles
│   └── app.html                       # HTML template
├── e2e/                               # Chrome DevTools interface checks
├── static/                            # Static files
├── package.json                       # Dependencies (Bun)
├── svelte.config.js                   # Svelte configuration
└── vite.config.js                     # Vite + PWA configuration
```

Unit tests live next to the module they cover, as `*.test.js`.

## 🔧 Configuration

### Change the model

To use a different model, modify the `selectedModel` value in `/src/lib/stores/llm.svelte.js`:

```javascript
selectedModel = $state('Llama-3.2-1B-Instruct-q4f32_1-MLC');
```

Available models:
- `Llama-3.2-1B-Instruct-q4f32_1-MLC` (lightweight)
- `Llama-3.2-3B-Instruct-q4f32_1-MLC` (balanced)
- `Phi-3.5-mini-instruct-q4f16_1-MLC` (fast)
- `onnx-community/gemma-4-e2b-it-ONNX` (Gemma 4 E2B, WebGPU via Transformers.js, text-only, experimental 🧪)
- See full list at: https://github.com/mlc-ai/web-llm

### Adjust generation parameters

In `/src/lib/stores/llm.svelte.js`, `sendMessage()` method:

```javascript
const asyncChunkGenerator = await this.engine.chat.completions.create({
	messages: chatMessages,
	temperature: 0.7,      // Creativity (0-1)
	max_tokens: 512,       // Max length
	stream: true,
});
```

## 🐛 Troubleshooting

### Model won't load

- Check your internet connection
- Make sure you have enough disk space (browser cache)
- Try a smaller model

### Memory error

- Close other tabs
- Use a smaller model
- Increase available RAM for your browser

### Slow performance

- Use a Chromium-based browser (Chrome, Edge) for better performance
- Make sure hardware acceleration is enabled in browser settings
- Try a smaller quantized model

## 📚 Documentation

### Complete Guides

- 🚀 **[Quick Start](docs/QUICKSTART.md)** - Quick start guide
- 🏗️ **[Architecture](docs/ARCHITECTURE.md)** - Project architecture
- 🌐 **[Deployment](docs/DEPLOYMENT.md)** - Complete deployment guide
- ⚡ **[Cloudflare Quick Deploy](docs/CLOUDFLARE_QUICKSTART.md)** - Cloudflare deployment
- 📱 **[PWA Guide](docs/PWA_GUIDE.md)** - Progressive Web App features
- 💾 **[RAM Check](docs/RAM_CHECK.md)** - RAM detection

### Features

- 🤖 **[Models](docs/MODELES.md)** - Available models list
- ➕ **[Custom Models](docs/CUSTOM_MODELS.md)** - Add custom models
- 💬 **[History](docs/CONVERSATION_HISTORY.md)** - Conversation management
- 🗄️ **[Dexie Migration](docs/DEXIE_MIGRATION.md)** - Database migration
- 🗺️ **[Sitemap](docs/SITEMAP.md)** - SEO sitemap configuration

### Development

- 🤝 **[Contributing](docs/CONTRIBUTING.md)** - Contribution guide
- 📊 **[Project Summary](docs/PROJECT_SUMMARY.md)** - Project summary

## 📚 External Resources

- [WebLLM Documentation](https://github.com/mlc-ai/web-llm)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Bun Documentation](https://bun.sh/)
- [TailwindCSS](https://tailwindcss.com/)

## 🌐 About

This project is developed by [BonoAI](https://bonoai.org) - Building the future of local AI applications.

**Repository**: [github.com/BonoAI-org/ohmyai](https://github.com/BonoAI-org/ohmyai)

Visit [bonoai.org](https://bonoai.org) to discover more innovative AI projects.

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or pull request.
