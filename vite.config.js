import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

// Configuration pour supporter WebAssembly et WebLLM
// Configuration to support WebAssembly and WebLLM
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			srcDir: 'src',
			mode: 'production',
			strategies: 'injectManifest',
			filename: 'service-worker.js',
			scope: '/',
			base: '/',
			selfDestroying: false,
			manifest: {
				name: 'Oh my AI!',
				short_name: 'Ho my AI',
				description: 'Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur.',
				start_url: '/',
				display: 'standalone',
				background_color: '#f6f2ea',
				theme_color: '#0f5c4a',
				orientation: 'portrait-primary',
				categories: ['productivity', 'utilities', 'ai'],
				icons: [
					{
						src: '/icon-72x72.png',
						sizes: '72x72',
						type: 'image/png'
					},
					{
						src: '/icon-96x96.png',
						sizes: '96x96',
						type: 'image/png'
					},
					{
						src: '/icon-128x128.png',
						sizes: '128x128',
						type: 'image/png'
					},
					{
						src: '/icon-144x144.png',
						sizes: '144x144',
						type: 'image/png'
					},
					{
						src: '/icon-152x152.png',
						sizes: '152x152',
						type: 'image/png'
					},
					{
						src: '/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any'
					},
					{
						src: '/icon-384x384.png',
						sizes: '384x384',
						type: 'image/png'
					},
					{
						src: '/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any'
					}
				]
			},
			define: {
				__PWA_VERSION__: JSON.stringify(process.env.npm_package_version)
			},
			// Seule la clé `injectManifest` compte ici : sous
			// `strategies: 'injectManifest'`, la clé `workbox` est entièrement
			// ignorée par le plugin. Elle existait et ne faisait rien.
			// Only the `injectManifest` key matters here: under
			// `strategies: 'injectManifest'`, the `workbox` key is ignored
			// outright by the plugin. It used to exist and do nothing.
			injectManifest: {
				// `mjs` est nécessaire : le worker de pdfjs est émis en .mjs et
				// n'était donc jamais précaché.
				// `mjs` is required: the pdfjs worker is emitted as .mjs and was
				// therefore never precached.
				globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,webp,woff,woff2}'],
				// Les poids des modèles ne passent jamais par le précache : ils
				// sont volumineux et gérés par WebLLM (OPFS / Cache API).
				// Model weights never go through the precache: they are large and
				// managed by WebLLM itself (OPFS / Cache API).
				globIgnores: ['**/*.wasm', '**/*.bin'],
				// Garde-fou explicite. @mlc-ai/web-llm (~6 Mo) reste volontairement
				// hors précache : le charger à l'installation pénaliserait la
				// première visite, alors que le service worker le sert ensuite en
				// StaleWhileRevalidate.
				// Explicit guard rail. @mlc-ai/web-llm (~6 MB) is deliberately kept
				// out of the precache: fetching it at install time would penalize
				// the first visit, while the service worker then serves it with
				// StaleWhileRevalidate.
				maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
				injectionPoint: 'self.__WB_MANIFEST'
			},
			devOptions: {
				// Désactivé en dev : le SW sert des modules Vite périmés après un
				// changement de dépendances (504 Outdated Optimize Dep)
				// Disabled in dev: the SW serves stale Vite modules after a
				// dependency change (504 Outdated Optimize Dep)
				enabled: false,
				suppressWarnings: true,
				type: 'module',
				navigateFallback: '/'
			},
			kit: {
				includeVersionFile: true
			}
		})
	],

	// En-têtes de sécurité requis pour SharedArrayBuffer et WASM
	// Security headers required for SharedArrayBuffer and WASM
	server: {
		port: 4242,
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		}
	},

	// Port pour le preview / Preview port
	preview: {
		port: 4242,
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		}
	},

	build: {
		target: 'esnext'
	},

	// web-llm est chargé dynamiquement (src/lib/engines/webllm.js) ; l'exclure
	// du pré-bundling évite un rechargement coûteux du serveur de dev.
	// web-llm is loaded dynamically (src/lib/engines/webllm.js); excluding it
	// from pre-bundling avoids an expensive dev-server reload.
	optimizeDeps: {
		exclude: ['@mlc-ai/web-llm']
	}
});
