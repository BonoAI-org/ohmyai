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
- **WebLLM**: Library to run LLMs in WASM
- **WebAssembly**: Compilation for native performance

## 📋 Prerequisites

- **Bun**: Version 1.0 or higher
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

The application will be available at `http://localhost:5173`

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
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── ChatMessage.svelte     # Message component
│   │   └── stores/
│   │       └── llm.svelte.js          # LLM management store
│   ├── routes/
│   │   ├── +layout.svelte             # Main layout
│   │   └── +page.svelte               # Chat page
│   ├── app.css                        # Global styles
│   └── app.html                       # HTML template
├── static/                            # Static files
├── package.json                       # Dependencies
├── svelte.config.js                   # Svelte configuration
├── vite.config.js                     # Vite configuration
└── tailwind.config.js                 # Tailwind configuration
```

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
