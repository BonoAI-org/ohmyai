---
name: ohmyai project overview
description: Privacy-focused browser-based LLM chatbot using SvelteKit, WebLLM, Orama RAG, OPFS caching, MCP support
type: project
---

Oh my AI! is a privacy-first chatbot that runs LLMs entirely in-browser via WebAssembly (WebLLM). Developed by BonoAI-org.

**Stack:** SvelteKit 2 + Svelte 5 (runes), TailwindCSS 4, Vite 7, Dexie (IndexedDB), Orama (local vector RAG), OPFS for model caching, Cloudflare Pages deployment, svelte-i18n (FR/EN), pnpm + Bun.

**Key features:** Multi-model support (Qwen 3, Llama 3.2, Phi, Gemma), conversation history, RAG with Orama embeddings, 6 color themes + dark mode, PWA offline support, user profiles & system prompts, MCP server integration (in progress).

**Dev commands:** `bun run dev` (port 4242), `bun run build`, `bun run deploy` (Cloudflare).

**Why:** Full local execution means no data leaves the browser — privacy by architecture.

**How to apply:** All features must work offline/locally. Never suggest cloud-dependent AI backends. Model storage uses OPFS. State management uses Svelte 5 runes ($state, $derived). i18n keys in both en.json and fr.json.
