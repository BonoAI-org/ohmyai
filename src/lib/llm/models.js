/**
 * Catalogue des modèles et helpers de recherche associés.
 * Model catalog and its lookup helpers.
 *
 * Module sans état ni dépendance : importable depuis un composant comme
 * depuis le store, et testable seul.
 * Stateless, dependency-free module: importable from a component as well as
 * from the store, and testable on its own.
 */

/**
 * Liste des modèles disponibles avec leurs caractéristiques
 * List of available models with their characteristics
 */
export const AVAILABLE_MODELS = [
	{
		// Gemma 4 n'est PAS supporté par WebLLM/MLC (architecture "gemma4" inconnue).
		// On le fait tourner via Transformers.js (ONNX Runtime Web) sur WebGPU.
		// Gemma 4 is NOT supported by WebLLM/MLC (unknown "gemma4" architecture).
		// We run it via Transformers.js (ONNX Runtime Web) on WebGPU.
		id: 'onnx-community/gemma-4-e2b-it-ONNX',
		name: 'Gemma 4 (E2B) — WebGPU',
		size: '~3.2 GB',
		vram: '~5 GB',
		description: 'Google Gemma 4 (variante E2B, texte + images) via Transformers.js. Expérimental.',
		engine: 'transformers',
		dtype: 'q4',
		multimodal: true,
		experimental: true,
		recommended: true
	},
	{
		// Variante E4B : plus grosse et meilleure que E2B, même architecture.
		// Les Gemma 4 26B/31B n'ont pas de port ONNX navigateur — voir docs/MODELES.md.
		// E4B variant: bigger and better than E2B, same architecture.
		// Gemma 4 26B/31B have no browser ONNX port — see docs/MODELES.md.
		id: 'onnx-community/gemma-4-E4B-it-ONNX',
		name: 'Gemma 4 (E4B) — WebGPU',
		size: '~5.5 GB',
		vram: '~8 GB',
		description: 'Google Gemma 4 (variante E4B, texte + images) via Transformers.js. Meilleure qualité que E2B. Expérimental.',
		engine: 'transformers',
		dtype: 'q4f16',
		multimodal: true,
		experimental: true,
		recommended: false
	},
	{
		id: 'Qwen3-4B-q4f16_1-MLC',
		name: 'Qwen 3 (4B) - Reasoning',
		size: '~2.4 GB',
		description: 'Raisonnement avancé avec mode thinking intégré.',
		recommended: true,
		supportsThinking: true
	},
	{
		id: 'Qwen3-8B-q4f16_1-MLC',
		name: 'Qwen 3 (8B) - Reasoning',
		size: '~4.5 GB',
		description: 'Meilleur raisonnement, nécessite ~8 GB de RAM.',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
		name: 'Phi-3 Mini (4k Instruct)',
		size: '~2.2 GB',
		description: 'Excellent pour le code / Excellent for code',
		recommended: false
	},
	{
		id: 'Qwen3-0.6B-q4f16_1-MLC',
		name: 'Qwen 3 (0.6B) - Quantisé',
		size: '~400 MB',
		description: 'Incroyablement léger. Idéal pour être le modèle par défaut ultra-rapide.',
		recommended: true,
		supportsThinking: true
	},
	{
		id: 'Qwen3-0.6B-q0f16-MLC',
		name: 'Qwen 3 (0.6B) - Non Quantisé',
		size: '~2.4 GB',
		description: 'Modèle pur non compressé (plus lourd en RAM).',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
		name: 'Llama 3.2 (1B)',
		size: '~800 MB',
		description: 'Ultra-léger et rapide. Parfait pour les petites configurations.',
		recommended: true
	},
	{
		id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
		name: 'Qwen 2.5 (1.5B)',
		size: '~1 GB',
		description: 'Très performant pour sa taille (code, logique).',
		recommended: true
	},
	{
		id: 'Llama-3-8B-Instruct-q4f16_1-MLC',
		name: 'Llama 3 (8B)',
		vram: '5.2 GB',
		size: '4.4 GB',
		description: 'Modèle Llama populaire et équilibré.',
		recommended: false
	},
	{
		id: 'gemma-2-9b-it-q4f16_1-MLC',
		name: 'Gemma 2 (9B)',
		vram: '6.1 GB',
		size: '5.5 GB',
		description: 'Modèle de Google, nouvelle génération.'
	},
	{
		id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
		name: 'Mistral 7B Instruct v0.3',
		size: '~3.8 GB',
		description: 'Modèle populaire et performant / Popular and powerful model',
		recommended: false
	},
	{
		id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
		name: 'Hermes 2 Pro Llama 3 (8B)',
		size: '~4.3 GB',
		description: 'Supporte les appels d\'outils (function calling) via MCP.',
		recommended: false,
		supportsTools: true
	},
	{
		id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
		name: 'Hermes 3 Llama 3.1 (8B)',
		size: '~4.5 GB',
		description: 'Dernier Hermes avec support outils amélioré.',
		recommended: false,
		supportsTools: true
	},
	{
		id: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Instruct',
		size: '~1.8 GB',
		description: 'Modèle Mistral léger, optimisé pour suivre les instructions.',
		recommended: false
	},
	{
		id: 'Ministral-3-3B-Base-2512-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Base',
		size: '~1.8 GB',
		description: 'Modèle Mistral de base, flexible et polyvalent.',
		recommended: false
	},
	{
		id: 'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Reasoning',
		size: '~1.8 GB',
		description: 'Modèle Mistral spécialisé en raisonnement logique.',
		recommended: false
	},
];

/**
 * Cherche un modèle par identifiant, dans le catalogue puis dans les modèles
 * personnalisés de l'utilisateur.
 * Looks a model up by id, in the catalog then in the user's custom models.
 *
 * @param {string} modelId
 * @param {Array<Record<string, any>>} [customModels]
 * @returns {Record<string, any> | undefined}
 */
export function findModel(modelId, customModels = []) {
	return (
		AVAILABLE_MODELS.find((m) => m.id === modelId) ??
		customModels.find((m) => m.id === modelId)
	);
}

/**
 * Nom affichable d'un modèle, avec repli lorsqu'il est introuvable.
 * Displayable name of a model, with a fallback when it cannot be found.
 *
 * @param {string} modelId
 * @param {Array<Record<string, any>>} [customModels]
 * @param {string} [fallback]
 * @returns {string}
 */
export function getModelDisplayName(modelId, customModels = [], fallback = 'Modèle / Model') {
	return findModel(modelId, customModels)?.name ?? fallback;
}
