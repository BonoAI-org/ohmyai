/**
 * Hook serveur SvelteKit : ajoute les en-têtes d'isolation cross-origin sur
 * toutes les réponses rendues par le Worker.
 * SvelteKit server hook: adds cross-origin isolation headers on every
 * response rendered by the Worker.
 *
 * Indispensable en production : sur Cloudflare Pages, le fichier `_headers`
 * ne s'applique qu'aux assets statiques, pas aux réponses SSR — or c'est le
 * document HTML qui doit porter COOP/COEP pour que `crossOriginIsolated`
 * soit vrai et que SharedArrayBuffer (requis par WebLLM) soit disponible.
 * Essential in production: on Cloudflare Pages, the `_headers` file only
 * applies to static assets, not SSR responses — and it is the HTML document
 * that must carry COOP/COEP for `crossOriginIsolated` to be true and
 * SharedArrayBuffer (required by WebLLM) to be available.
 */
export async function handle({ event, resolve }) {
	const response = await resolve(event);
	response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
	response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
	return response;
}
