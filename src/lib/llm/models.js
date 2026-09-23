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
		// Variante 26B A4B : mélange d'experts, 26 milliards de paramètres dont
		// 4 actifs par jeton. Les experts doivent tous résider en mémoire, donc
		// le poids à charger reste celui des 26 milliards.
		// 26B A4B variant: mixture of experts, 26 billion parameters with 4
		// active per token. All experts must reside in memory, so the weight to
		// load remains that of the full 26 billion.
		//
		// Google ne publie ce modèle qu'en safetensors, et mlc-ai n'en a aucun
		// build : ce port communautaire est le seul au format attendu par
		// Transformers.js. Il est texte seul, sans encodeur vision, contrairement
		// aux variantes E2B et E4B — d'où `multimodal: false`.
		// Google only publishes this model as safetensors, and mlc-ai has no
		// build of it: this community port is the only one in the layout
		// Transformers.js expects. It is text-only, with no vision encoder,
		// unlike the E2B and E4B variants — hence `multimodal: false`.
		//
		// À 17 Go de poids, la vérification matérielle le refuse dès que le
		// navigateur rapporte moins de 20 Go de mémoire, donc sur une machine
		// de 16 Go et moins. Mieux vaut un refus avant téléchargement qu'un
		// échec après.
		// At 17 GB of weights, the hardware check refuses it as soon as the
		// browser reports less than 20 GB of memory, so on a 16 GB machine or
		// below. A refusal before downloading beats a failure after.
		id: 'kibitz-coach/gemma-4-26B-A4B-it-ONNX',
		name: 'Gemma 4 (26B A4B) — WebGPU',
		size: '~17 GB',
		vram: '~20 GB',
		description: 'Google Gemma 4 26B A4B (mélange d\'experts, texte seul) via Transformers.js. Port communautaire, très gourmand : réservé aux machines à forte mémoire graphique. Expérimental.',
		engine: 'transformers',
		// Le modèle annonce 262144 jetons, hors de portée d'un cache clé/valeur
		// en navigateur. On déclare la même valeur prudente que E2B et E4B.
		// The model advertises 262144 tokens, out of reach for a browser
		// key/value cache. We declare the same conservative value as E2B and E4B.
		contextWindow: 32768,
		// Ce port ne publie `embed_tokens` qu'en fp16 : un dtype chaîne ferait
		// demander un embed_tokens_q4f16.onnx inexistant (404 vérifié). Même
		// règle que pour les variantes QAT : un dtype par fichier ONNX.
		// This port only ships `embed_tokens` in fp16: a string dtype would
		// request a nonexistent embed_tokens_q4f16.onnx (404 verified). Same
		// rule as for the QAT variants: one dtype per ONNX file.
		dtype: {
			embed_tokens: 'fp16',
			decoder_model_merged: 'q4f16'
		},
		multimodal: false,
		experimental: true,
		recommended: false
	},
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
