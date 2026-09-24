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

import { readLocal, writeLocal, removeLocal } from '../llm/storage.js';

// Nom du cache navigateur (Cache API) utilisé par Transformers.js pour stocker
// les fichiers de modèle ONNX. Sert à détecter si un modèle est déjà téléchargé.
// Browser Cache API name used by Transformers.js to store ONNX model files.
// Used to detect whether a model is already downloaded.
export const TRANSFORMERS_CACHE_NAME = 'transformers-cache';

/**
 * Clé localStorage des modèles dont le chargement a déjà abouti une fois.
 * localStorage key of the models whose loading has already succeeded once.
 *
 * La présence de fichiers en cache ne suffit pas à dire qu'un modèle est
 * téléchargé : Transformers.js met en cache `config.json` et le tokenizer dès
 * le début, bien avant les poids. Un chargement interrompu laissait donc le
 * modèle passer pour téléchargé ; à la visite suivante, l'application le
 * rechargeait d'office, sans confirmation ni vérification matérielle. C'est
 * ainsi que Gemma 4 26B A4B relançait seul ses 17 Go à chaque ouverture.
 * Having files in cache is not enough to say a model is downloaded:
 * Transformers.js caches `config.json` and the tokenizer at the start, well
 * before the weights. An interrupted load therefore made the model look
 * downloaded; on the next visit, the app reloaded it outright, with no
 * confirmation nor hardware check. This is how Gemma 4 26B A4B restarted its
 * 17 GB on every visit.
 */
export const COMPLETE_MODELS_KEY = 'transformers-complete-models';

/** @returns {string[]} */
function readCompleteModels() {
	const list = readLocal(COMPLETE_MODELS_KEY, { json: true, fallback: [] });
	return Array.isArray(list) ? list : [];
}

/**
 * Retient qu'un modèle s'est chargé en entier, donc que tous ses fichiers
 * sont en cache. À appeler seulement après un chargement réussi.
 * Records that a model loaded in full, hence that all its files are cached.
 * Call only after a successful load.
 * @param {string} modelId
 */
export function markTransformersModelComplete(modelId) {
	const list = readCompleteModels();
	if (!list.includes(modelId)) writeLocal(COMPLETE_MODELS_KEY, [...list, modelId], { json: true });
}

/**
 * Vérifie si un modèle Transformers.js est entièrement téléchargé : chargé
 * en entier au moins une fois, et toujours présent dans le cache navigateur.
 * Checks whether a Transformers.js model is fully downloaded: loaded in full
 * at least once, and still present in the browser cache.
 * @param {string} modelId - Ex : "onnx-community/gemma-4-e2b-it-ONNX".
 * @returns {Promise<boolean>}
 */
export async function isTransformersModelCached(modelId) {
	if (!readCompleteModels().includes(modelId)) return false;
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
	removeLocal(COMPLETE_MODELS_KEY);
	try {
		if (typeof caches === 'undefined') return;
		await caches.delete(TRANSFORMERS_CACHE_NAME);
	} catch (e) {
		console.warn('Impossible de vider le cache Transformers.js:', e);
	}
}
