import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Configuration pour supporter WebAssembly et WebLLM
// Configuration to support WebAssembly and WebLLM
export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	
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
