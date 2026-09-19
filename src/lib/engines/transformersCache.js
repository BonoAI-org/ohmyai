/**
 * Inspection du cache navigateur des modèles Transformers.js.
 * Browser cache inspection for Transformers.js models.
 *
 * Ces helpers n'utilisent que l'API `caches` : ils n'ont aucun besoin de la
 * bibliothèque `@huggingface/transformers`. Ils vivent dans un module séparé
 * pour que le store LLM puisse connaître l'état du cache sans importer
 * statiquement `transformersEngine.js`, ce qui annulerait le découpage en
 * chunk dynamique de ce dernier.
 *
 * These helpers only use the `caches` API: they have no need for the
 * `@huggingface/transformers` library. They live in a separate module so the
 * LLM store can learn the cache state without statically importing
 * `transformersEngine.js`, which would defeat its dynamic chunk split.
 */

// Nom du cache navigateur (Cache API) utilisé par Transformers.js pour stocker
// les fichiers de modèle ONNX. Sert à détecter si un modèle est déjà téléchargé.
// Browser Cache API name used by Transformers.js to store ONNX model files.
// Used to detect whether a model is already downloaded.
export const TRANSFORMERS_CACHE_NAME = 'transformers-cache';

/**
 * Vérifie si un modèle Transformers.js est déjà présent dans le cache navigateur.
 * Checks whether a Transformers.js model is already in the browser cache.
 * @param {string} modelId - Ex : "onnx-community/gemma-4-e2b-it-ONNX".
 * @returns {Promise<boolean>}
 */
export async function isTransformersModelCached(modelId) {
	try {
		if (typeof caches === 'undefined') return false;
		const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
		const requests = await cache.keys();
		return requests.some((req) => req.url.includes(modelId));
	} catch (e) {
		return false;
	}
}

/**
 * Supprime tous les fichiers de modèles Transformers.js du cache navigateur.
 * Deletes all Transformers.js model files from the browser cache.
 * @returns {Promise<void>}
 */
export async function clearTransformersCache() {
	try {
		if (typeof caches === 'undefined') return;
		await caches.delete(TRANSFORMERS_CACHE_NAME);
	} catch (e) {
		console.warn('Impossible de vider le cache Transformers.js:', e);
	}
}
