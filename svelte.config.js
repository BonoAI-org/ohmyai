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
		})
	}
};

export default config;
