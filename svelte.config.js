import adapter from '@sveltejs/adapter-cloudflare';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// Adapter pour Cloudflare Pages / Adapter for Cloudflare Pages
		// Documentation: https://svelte.dev/docs/kit/adapter-cloudflare
		adapter: adapter({
			// Options pour Cloudflare / Cloudflare options
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		// SvelteKit enregistre src/service-worker.js de lui-même, en type
		// classique. src/lib/pwa.js l'enregistrait aussi, en type module : à
		// chaque chargement, Chrome voyait un changement de type et installait
		// un nouveau service worker, resté en attente. Un seul enregistrement,
		// celui de pwa.js, qui porte la logique de mise à jour.
		// SvelteKit registers src/service-worker.js by itself, as a classic
		// script. src/lib/pwa.js registered it too, as a module: on every load,
		// Chrome saw a type change and installed a new service worker, left
		// waiting. A single registration, pwa.js's, which carries the update logic.
		serviceWorker: {
			register: false
		}
	}
};

export default config;
