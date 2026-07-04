/**
 * Moteur d'embeddings basé sur Transformers.js (ONNX Runtime Web).
 * Embedding engine based on Transformers.js (ONNX Runtime Web).
 *
 * Transforme du texte en vecteurs pour la recherche sémantique locale (RAG).
 * Modèle multilingue (le contenu de l'app est FR/EN) : multilingual-e5-small,
 * 384 dimensions, ~30 MB en q8, téléchargé une seule fois puis mis en cache
 * par la Cache API du navigateur.
 * Turns text into vectors for local semantic search (RAG). Multilingual model
 * (the app's content is FR/EN): multilingual-e5-small, 384 dimensions, ~30 MB
 * in q8, downloaded once then cached by the browser Cache API.
 *
 * Tourne sur CPU (WASM) : le modèle est petit et cela évite de disputer le
 * GPU au LLM pendant la génération.
 * Runs on CPU (WASM): the model is small and this avoids competing with the
 * LLM for the GPU during generation.
 */

export const EMBEDDING_MODEL = 'Xenova/multilingual-e5-small';
export const EMBEDDING_DIM = 384;

// Pipeline mémoïsé, chargé au premier appel / Memoized pipeline, loaded on first call
let _extractorPromise = null;

async function getExtractor() {
	if (!_extractorPromise) {
		_extractorPromise = import('@huggingface/transformers').then(({ pipeline }) =>
			pipeline('feature-extraction', EMBEDDING_MODEL, { dtype: 'q8' })
		);
	}
	return _extractorPromise;
}

/**
 * Calcule l'embedding normalisé d'un texte.
 * Les modèles E5 exigent un préfixe différent pour les requêtes et les
 * documents — sans lui, la qualité de la recherche chute nettement.
 * Computes the normalized embedding of a text. E5 models require a different
 * prefix for queries vs documents — without it, search quality drops sharply.
 *
 * @param {string} text - Le texte à encoder / Text to encode
 * @param {'query'|'passage'} kind - Requête utilisateur ou document indexé / User query or indexed document
 * @returns {Promise<number[]>} Vecteur normalisé de EMBEDDING_DIM dimensions / Normalized EMBEDDING_DIM-dim vector
 */
export async function embedText(text, kind = 'passage') {
	const extractor = await getExtractor();
	const output = await extractor(`${kind}: ${text}`, { pooling: 'mean', normalize: true });
	return Array.from(output.data);
}
