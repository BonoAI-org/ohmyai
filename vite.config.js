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
				name: 'Ho my AI!',
				short_name: 'Ho my AI',
				description: 'Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur.',
				start_url: '/',
				display: 'standalone',
				background_color: '#0f172a',
				theme_color: '#7c3aed',
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
			injectManifest: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}']
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
				// Ne pas mettre en cache les fichiers WASM (trop gros)
				// Don't cache WASM files (too large)
				globIgnores: ['**/*.wasm', '**/*.bin']
			},
			devOptions: {
				enabled: true,
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
