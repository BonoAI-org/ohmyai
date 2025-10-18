import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Configuration pour supporter WebAssembly et WebLLM
// Configuration to support WebAssembly and WebLLM
export default defineConfig({
	plugins: [
		tailwindcss(), 
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			includeAssets: ['favicon.svg', 'icon-*.png'],
			manifest: {
				name: 'Ho my AI!',
				short_name: 'Ho my AI!',
				description: 'Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly',
				theme_color: '#7c3aed',
				background_color: '#0f172a',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-192x192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512x512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				// Stratégie de cache pour les ressources statiques
				// Cache strategy for static resources
				globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2}'],
				// Ne pas mettre en cache les fichiers WASM (trop gros)
				// Don't cache WASM files (too large)
				globIgnores: ['**/*.wasm'],
				// Cache les requêtes réseau
				// Cache network requests
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
						handler: 'CacheFirst',
						options: {
							cacheName: 'google-fonts-cache',
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365 // 1 an
							},
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module'
			}
		})
	],
	
	// En-têtes de sécurité requis pour SharedArrayBuffer et WASM
	// Security headers required for SharedArrayBuffer and WASM
	server: {
		headers: {
			'Cross-Origin-Embedder-Policy': 'require-corp',
			'Cross-Origin-Opener-Policy': 'same-origin',
		}
	},
	
	// Optimisations pour les gros fichiers WASM
	// Optimizations for large WASM files
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: undefined,
			},
		},
	},
	
	// Augmente la limite de taille pour les warnings
	// Increase size limit for warnings
	optimizeDeps: {
		exclude: ['@mlc-ai/web-llm']
	}
});
