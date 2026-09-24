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
		contextWindow: 32768,
		dtype: 'q4',
		multimodal: true,
		experimental: true,
		recommended: true
	},
	{
		// Variante E4B : plus grosse et meilleure que E2B, même architecture.
		// E4B variant: bigger and better than E2B, same architecture.
		id: 'onnx-community/gemma-4-E4B-it-ONNX',
		name: 'Gemma 4 (E4B) — WebGPU',
		size: '~5.5 GB',
		vram: '~8 GB',
		description: 'Google Gemma 4 (variante E4B, texte + images) via Transformers.js. Meilleure qualité que E2B. Expérimental.',
		engine: 'transformers',
		contextWindow: 32768,
		dtype: 'q4f16',
		multimodal: true,
		experimental: true,
		recommended: false
	},
	{
		// Variantes QAT « mobile » publiées par onnx-community. Quantifiées
		// pendant l'entraînement et non après, elles descendent à 2 bits tout en
		// restant utilisables, et pèsent donc moins que les variantes ci-dessus
		// pour la même famille.
		// "Mobile" QAT variants published by onnx-community. Quantized during
		// training rather than after, they go down to 2 bits while staying
		// usable, and therefore weigh less than the variants above for the same
		// family.
		//
		// Leur encodeur vision n'existe qu'en fp16 : le dtype doit donc être un
		// objet par sous-modèle, comme le déclare leur propre config, sinon le
		// moteur chercherait un vision_encoder_q2f16 inexistant.
		// Their vision encoder only exists in fp16: the dtype must therefore be
		// a per-submodel object, as their own config declares, otherwise the
		// engine would look for a nonexistent vision_encoder_q2f16.
		id: 'onnx-community/gemma-4-E2B-it-qat-mobile-ONNX',
		name: 'Gemma 4 (E2B QAT) — WebGPU',
		size: '~2.6 GB',
		vram: '~4 GB',
		description: 'Google Gemma 4 E2B quantifié à l\'entraînement (2 bits, texte + images). Plus léger que E2B pour une qualité proche. Expérimental.',
		engine: 'transformers',
		contextWindow: 32768,
		dtype: {
			decoder_model_merged: 'q2f16',
			embed_tokens: 'q2f16',
			audio_encoder: 'q2f16',
			vision_encoder: 'fp16'
		},
		multimodal: true,
		experimental: true,
		recommended: false
	},
	{
		id: 'onnx-community/gemma-4-E4B-it-qat-mobile-ONNX',
		name: 'Gemma 4 (E4B QAT) — WebGPU',
		size: '~3.6 GB',
		vram: '~5 GB',
		description: 'Google Gemma 4 E4B quantifié à l\'entraînement (2 bits, texte + images). Plus léger que E4B pour une qualité proche. Expérimental.',
		engine: 'transformers',
		contextWindow: 32768,
		dtype: {
			decoder_model_merged: 'q2f16',
			embed_tokens: 'q2f16',
			audio_encoder: 'q2f16',
			vision_encoder: 'fp16'
		},
		multimodal: true,
		experimental: true,
		recommended: false
	},
	{
		// Variante 12B : dense, 12 milliards de paramètres. Aucun port
		// navigateur n'existant, ce dépôt a été produit à partir des poids de
		// Google par scripts/spike-gemma4-onnx/export_transformersjs.py, et
		// validé contre PyTorch (voir docs/MODELES.md, section 7 bis).
		// 12B variant: dense, 12 billion parameters. No browser port existing,
		// this repository was produced from Google's weights by
		// scripts/spike-gemma4-onnx/export_transformersjs.py, and validated
		// against PyTorch (see docs/MODELES.md, section 7 bis).
		//
		// Texte seul : l'export ne comprend pas encore l'encodeur vision.
		// Text only: the export does not include the vision encoder yet.
		id: 'Dramatik999/gemma-4-12B-it-ONNX',
		name: 'Gemma 4 (12B) — WebGPU',
		size: '~8.2 GB',
		// Poids, plus le cache clé/valeur à 8 192 jetons (~2,8 Go : les couches
		// à fenêtre glissante gardent tout leur passé), plus les activations.
		// Weights, plus the key/value cache at 8,192 tokens (~2.8 GB: sliding
		// layers keep their whole past), plus activations.
		vram: '~12 GB',
		description: 'Google Gemma 4 12B (dense, texte seul) via Transformers.js. Port produit pour Oh my AI et validé contre la référence PyTorch. Expérimental.',
		engine: 'transformers',
		// Borné pour contenir le cache clé/valeur, qui croît d'environ 340 Ko
		// par jeton ; le modèle en annonce 262 144.
		// Bounded to contain the key/value cache, which grows by about 340 KB
		// per token; the model advertises 262,144.
		contextWindow: 8192,
		dtype: {
			embed_tokens: 'fp16',
			decoder_model_merged: 'q4f16'
		},
		multimodal: false,
		experimental: true,
		recommended: false
	},
	// Gemma 4 26B A4B a été retiré du catalogue : ses 16 Gio de fichiers
	// dépassent ce qu'un onglet Chrome peut garder en mémoire (voir
	// TRANSFORMERS_MAX_MODEL_GB dans hardware.js). Le chargement restait bloqué
	// sans message sur toutes les machines, 64 Go de RAM comprises.
	// Gemma 4 26B A4B was removed from the catalog: its 16 GiB of files exceed
	// what a Chrome tab can hold in memory (see TRANSFORMERS_MAX_MODEL_GB in
	// hardware.js). Loading got stuck without a message on every machine,
	// 64 GB of RAM included.
	{
		// Familles récemment ajoutées au catalogue préconstruit de web-llm.
		// Tailles et VRAM relevées sur les dépôts mlc-ai et sur
		// prebuiltAppConfig, pas estimées.
		// Families recently added to web-llm's prebuilt catalog. Sizes and VRAM
		// read from the mlc-ai repositories and from prebuiltAppConfig, not
		// estimated.
		id: 'Qwen3.5-9B-q4f16_1-MLC',
		name: 'Qwen 3.5 (9B) - Reasoning',
		size: '~5.1 GB',
		vram: '~6.3 GB',
		description: 'Dernière génération Qwen, la plus capable qui tienne en navigateur.',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Qwen3.5-4B-q4f16_1-MLC',
		name: 'Qwen 3.5 (4B) - Reasoning',
		size: '~2.4 GB',
		vram: '~3.8 GB',
		description: 'Dernière génération Qwen, bon compromis taille et qualité.',
		recommended: true,
		supportsThinking: true
	},
	{
		id: 'Qwen3.5-2B-q4f16_1-MLC',
		name: 'Qwen 3.5 (2B) - Reasoning',
		size: '~1.1 GB',
		vram: '~2.2 GB',
		description: 'Dernière génération Qwen en version légère.',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Phi-4-mini-instruct-q4f16_1-MLC',
		name: 'Phi-4 Mini (Instruct)',
		size: '~2.2 GB',
		vram: '~3.4 GB',
		description: 'Dernier Phi de Microsoft, solide en code et en raisonnement.',
		recommended: false
	},
	{
		id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
		name: 'DeepSeek R1 Distill (Qwen 7B)',
		size: '~4.3 GB',
		vram: '~5 GB',
		description: 'Raisonnement DeepSeek R1 distillé dans Qwen 7B.',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
		name: 'Qwen 2.5 Coder (7B)',
		size: '~4.3 GB',
		vram: '~5 GB',
		description: 'Spécialisé code : génération, complétion et explication.',
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
