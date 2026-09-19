/**
 * Chargement différé de @mlc-ai/web-llm.
 * Lazy loading of @mlc-ai/web-llm.
 *
 * La bibliothèque pèse environ 6,4 Mo. Importée statiquement, elle était
 * inlinée dans le chunk de la route `/`, qui dépassait alors la limite de
 * précache du service worker : la page entière devenait impossible à
 * précacher. Ce module est le SEUL endroit du projet autorisé à importer
 * web-llm, et il le fait dynamiquement, pour que Rollup en fasse un chunk
 * séparé chargé au premier usage réel du moteur.
 *
 * The library weighs roughly 6.4 MB. Statically imported, it was inlined
 * into the `/` route chunk, which then exceeded the service worker's
 * precache size limit, making the whole page impossible to precache. This
 * module is the ONLY place allowed to import web-llm, and it does so
 * dynamically so Rollup emits a separate chunk loaded on first real use.
 */

/**
 * Modèles absents du catalogue préconstruit de web-llm, ajoutés à la main.
 * Models missing from web-llm's prebuilt catalog, added by hand.
 */
const EXTRA_MODEL_LIST = [
	{
		"model": "https://huggingface.co/mlc-ai/gemma-2-9b-it-q4f16_1-MLC",
		"model_id": "gemma-2-9b-it-q4f16_1-MLC",
		"model_lib": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0.2.48/Gemma-2-9B-Instruct-q4f16_1-MLC-webgpu.wasm",
		"vram_required_MB": 6103.52,
		"low_resource_required": false,
	},
	{
		"model": "https://huggingface.co/mlc-ai/Phi-3.5-vision-instruct-q4f16_1-MLC",
		"model_id": "Phi-3.5-vision-instruct-q4f16_1-MLC",
		"model_lib": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Phi-3.5-vision-instruct-q4f16_1-ctx4k_cs2k-webgpu.wasm",
		"vram_required_MB": 3952.18,
		"low_resource_required": true,
		"overrides": {
			"context_window_size": 4096
		},
		"model_type": 2
	}
];

/** @type {Promise<typeof import('@mlc-ai/web-llm')> | null} */
let _libPromise = null;

/**
 * Charge la bibliothèque web-llm, une seule fois.
 * Loads the web-llm library, once.
 *
 * On mémoïse la promesse et non le module : au démarrage, la vérification
 * du cache des modèles et l'initialisation du moteur partent en parallèle,
 * et doivent partager un seul import. En cas d'échec on réarme, pour qu'une
 * erreur réseau passagère reste réessayable.
 *
 * We memoize the promise rather than the module: at boot, the model cache
 * check and the engine init start in parallel and must share a single
 * import. On failure we reset, so a transient network error stays retryable.
 */
export function loadWebLLM() {
	if (!_libPromise) {
		_libPromise = import('@mlc-ai/web-llm').catch((error) => {
			_libPromise = null;
			throw error;
		});
	}
	return _libPromise;
}

/** @type {{ model_list: any[], use_web_worker: boolean } | null} */
let _appConfig = null;

/**
 * Construit la configuration web-llm à la demande.
 * Builds the web-llm configuration on demand.
 */
export async function getAppConfig() {
	if (!_appConfig) {
		const { prebuiltAppConfig } = await loadWebLLM();
		_appConfig = {
			model_list: [...prebuiltAppConfig.model_list, ...EXTRA_MODEL_LIST],
			use_web_worker: true
		};
	}
	return _appConfig;
}

/**
 * Indique si les poids du modèle sont déjà dans le Cache API de web-llm.
 * Tells whether the model weights are already in web-llm's Cache API.
 *
 * @param {string} modelId
 * @returns {Promise<boolean>}
 */
export async function hasWebLLMModelInCache(modelId) {
	const [{ hasModelInCache }, appConfig] = await Promise.all([loadWebLLM(), getAppConfig()]);
	return hasModelInCache(modelId, appConfig);
}

/**
 * Taille de la fenêtre de contexte déclarée par le catalogue MLC, ou null.
 * Context window size declared by the MLC catalog, or null.
 *
 * Ne déclenche PAS le chargement de la bibliothèque : consulter une taille de
 * contexte ne justifie pas de télécharger 6 Mo, en particulier pour un modèle
 * servi par l'autre moteur. On répond donc null tant que web-llm n'a pas déjà
 * été chargé pour une vraie raison.
 * Does NOT trigger loading the library: looking up a context size does not
 * justify fetching 6 MB, especially for a model served by the other engine. So
 * we answer null as long as web-llm has not already been loaded for a real
 * reason.
 *
 * @param {string} modelId
 * @returns {Promise<number | null>}
 */
export async function getModelContextWindow(modelId) {
	if (!_libPromise) return null;
	const appConfig = await getAppConfig();
	const entry = appConfig.model_list.find((m) => m.model_id === modelId);
	return entry?.overrides?.context_window_size ?? null;
}

/**
 * Crée un moteur web-llm.
 * Creates a web-llm engine.
 *
 * Les options sont étalées après les valeurs par défaut, pour que l'appelant
 * puisse fournir `initProgressCallback`, `modelCache`, etc.
 * Options are spread after the defaults so the caller can supply
 * `initProgressCallback`, `modelCache`, and so on.
 *
 * @param {string} modelId
 * @param {Record<string, any>} [options]
 */
export async function createWebLLMEngine(modelId, options = {}) {
	const [{ CreateMLCEngine }, appConfig] = await Promise.all([loadWebLLM(), getAppConfig()]);
	return CreateMLCEngine(modelId, { appConfig, logLevel: 'SILENT', ...options });
}
