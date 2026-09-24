/**
 * Estimation des capacités matérielles, avant de télécharger un modèle.
 * Hardware capability estimation, before downloading a model.
 *
 * Télécharger plusieurs gigaoctets pour découvrir que la machine ne peut pas
 * faire tourner le modèle est le pire scénario. Ces heuristiques sont donc
 * évaluées en amont, et leur résultat sert à afficher un avertissement.
 *
 * Downloading several gigabytes only to discover the machine cannot run the
 * model is the worst outcome. These heuristics therefore run beforehand, and
 * their result drives a warning.
 *
 * Les deux sources d'information sont volontairement injectables, pour que la
 * logique soit testable sans navigateur.
 * Both information sources are deliberately injectable, so the logic is
 * testable without a browser.
 */

/**
 * RAM minimale en deçà de laquelle l'application se déclare inadaptée.
 * Minimum RAM below which the app declares itself unsuitable.
 */
export const MIN_RAM_GB = 4;

/**
 * Taille minimale d'un buffer GPU en deçà de laquelle aucun de nos modèles ne
 * peut tourner. C'est un plancher de bon sens, pas une proportion du modèle :
 * les runtimes répartissent les poids sur de nombreux buffers.
 * Minimum GPU buffer size below which none of our models can run. It is a
 * sanity floor, not a proportion of the model: runtimes spread the weights
 * across many buffers.
 */
export const MIN_GPU_BUFFER_GB = 1;

/**
 * Poids maximal d'un modèle Transformers.js, quelle que soit la machine.
 * Maximum weight of a Transformers.js model, whatever the machine.
 *
 * Transformers.js garde chaque fichier du modèle en entier en mémoire dans
 * l'onglet, sous forme d'ArrayBuffer, avant de le confier à onnxruntime. Or
 * Chrome plafonne le total de ces tampons par page : 15,75 Gio mesurés sur
 * Chrome 154, macOS, avec 64 Go de RAM (huit tampons de 2 Go passent, le
 * neuvième échoue). Au-delà, l'allocation échoue quelle que soit la mémoire
 * de la machine ; c'est ainsi que Gemma 4 26B A4B et ses 16 Gio de fichiers
 * restaient bloqués au chargement. 15 Go laissent une marge pour le
 * tokenizer et les autres tampons de la page.
 * Transformers.js keeps every model file whole in the tab's memory, as an
 * ArrayBuffer, before handing it to onnxruntime. Chrome caps the total of
 * those buffers per page: 15.75 GiB measured on Chrome 154, macOS, 64 GB of
 * RAM (eight 2 GB buffers succeed, the ninth fails). Beyond that, allocation
 * fails regardless of the machine's memory; this is how Gemma 4 26B A4B and
 * its 16 GiB of files got stuck while loading. 15 GB leaves headroom for the
 * tokenizer and the page's other buffers.
 */
export const TRANSFORMERS_MAX_MODEL_GB = 15;

/**
 * Extrait un nombre de gigaoctets d'une chaîne comme « 4.2 GB ».
 * Extracts a gigabyte count from a string such as "4.2 GB".
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseGigabytes(value) {
	const match = String(value ?? '').match(/([\d.]+)\s*GB/i);
	return match ? parseFloat(match[1]) : null;
}

/**
 * Mémoire graphique requise par un modèle. À défaut de valeur déclarée, on
 * part du poids des fichiers majoré d'une marge d'exécution, qui couvre le
 * cache des clés/valeurs et les activations.
 * Graphics memory a model requires. Absent a declared value, we start from the
 * file weights plus a runtime margin, covering the key/value cache and
 * activations.
 *
 * @param {{ vram?: string, size?: string } | null | undefined} modelConfig
 * @returns {number}
 */
export function requiredVramGB(modelConfig) {
	return parseGigabytes(modelConfig?.vram) ?? (parseGigabytes(modelConfig?.size) ?? 0) * 1.25;
}

/**
 * Indique si l'appareil déclare assez de RAM pour faire tourner l'application.
 * Absence d'information vaut accord : mieux vaut laisser essayer que bloquer à
 * tort un appareil capable.
 * Tells whether the device reports enough RAM to run the app. Missing
 * information counts as a yes: better to let the user try than to wrongly
 * block a capable device.
 *
 * @param {number} [minGb]
 * @param {{ deviceMemory?: number } | undefined} [nav]
 * @returns {boolean}
 */
export function hasMinimumRam(minGb = MIN_RAM_GB, nav = globalThis.navigator) {
	if (!nav || typeof nav.deviceMemory !== 'number') return true;
	return nav.deviceMemory >= minGb;
}

/**
 * Estime si la machine peut faire tourner un modèle donné.
 * Estimates whether this machine can run a given model.
 *
 * @param {{ vram?: string, size?: string, engine?: string } | null | undefined} modelConfig
 * @param {{ deviceMemory?: number, gpu?: { requestAdapter: () => Promise<any> } } | undefined} [nav]
 * @returns {Promise<{
 *   supported: boolean,
 *   reason: 'browser-limit' | 'memory' | 'gpu-buffer' | 'no-webgpu' | null,
 *   requiredGB: number,
 *   deviceMemoryGB: number | null,
 *   gpuMaxBufferGB: number | null
 * }>}
 */
export async function estimateHardwareSupport(modelConfig, nav = globalThis.navigator) {
	const requiredGB = requiredVramGB(modelConfig);

	const result = {
		supported: true,
		/** Critère fautif, pour que le message affiché le nomme. */
		reason: null,
		requiredGB: Math.round(requiredGB * 10) / 10,
		deviceMemoryGB: null,
		gpuMaxBufferGB: null
	};

	// Budget mémoire. WebGPU n'expose aucune mémoire graphique totale : aucune
	// limite de l'adaptateur ne la donne. Le seul chiffre disponible est la
	// mémoire système, qui est le bon budget sur les GPU à mémoire unifiée
	// (Apple Silicon, puces intégrées) puisque le GPU y puise. Sur une carte
	// dédiée, elle surestime la mémoire graphique ; le bouton de contournement
	// reste là pour ce cas.
	// Memory budget. WebGPU exposes no total graphics memory: no adapter limit
	// provides it. The only available figure is system memory, which is the
	// right budget on unified-memory GPUs (Apple Silicon, integrated chips)
	// since the GPU draws from it. On a discrete card it overestimates graphics
	// memory; the override button is there for that case.
	//
	// `navigator.deviceMemory` est arrondie et plafonnée par le navigateur pour
	// limiter l'identification : elle sous-estime, jamais l'inverse. Un refus
	// fondé sur elle est donc prudent par construction.
	// `navigator.deviceMemory` is rounded and capped by the browser to limit
	// fingerprinting: it under-reports, never the opposite. A refusal based on
	// it is therefore conservative by construction.
	if (nav?.deviceMemory) {
		result.deviceMemoryGB = nav.deviceMemory;
		if (requiredGB > nav.deviceMemory) {
			result.supported = false;
			result.reason = 'memory';
		}
	}

	try {
		const adapter = await nav?.gpu?.requestAdapter();
		if (adapter) {
			const maxBufferGB = adapter.limits.maxBufferSize / 1024 ** 3;
			result.gpuMaxBufferGB = Math.round(maxBufferGB * 10) / 10;
			if (maxBufferGB < MIN_GPU_BUFFER_GB) {
				result.supported = false;
				result.reason = 'gpu-buffer';
			}
		} else {
			result.supported = false;
			result.reason = 'no-webgpu';
		}
	} catch (_) {
		// Requête adaptateur échouée : on reste permissif, le chargement
		// échouera avec un message clair le cas échéant.
		// Adapter query failed: stay permissive, loading will fail with a clear
		// message if needed.
	}

	// Limite du navigateur, évaluée en dernier pour primer sur les autres
	// critères : aucune machine ne la lève, et aucun contournement ne peut
	// réussir.
	// Browser limit, evaluated last so it overrides the other criteria: no
	// machine lifts it, and no override can succeed.
	if (exceedsBrowserLimit(modelConfig)) {
		result.supported = false;
		result.reason = 'browser-limit';
	}

	return result;
}

/**
 * Indique si un modèle dépasse ce qu'un onglet peut charger, indépendamment
 * de la machine. Seuls les modèles Transformers.js sont concernés : WebLLM
 * charge ses poids par petits fragments.
 * Tells whether a model exceeds what a tab can load, independently of the
 * machine. Only Transformers.js models are concerned: WebLLM loads its
 * weights in small shards.
 *
 * @param {{ size?: string, engine?: string } | null | undefined} modelConfig
 * @returns {boolean}
 */
export function exceedsBrowserLimit(modelConfig) {
	if (modelConfig?.engine !== 'transformers') return false;
	const sizeGB = parseGigabytes(modelConfig.size);
	return sizeGB !== null && sizeGB > TRANSFORMERS_MAX_MODEL_GB;
}

/**
 * Teste si WebGPU est réellement utilisable, en demandant un adaptateur.
 *
 * La présence de `navigator.gpu` ne suffit pas : Chrome expose l'API dans des
 * contextes où aucun adaptateur n'est disponible (machine sans GPU, pilote
 * sur liste noire, exécution sans affichage). L'écran d'accueil annonce un
 * diagnostic, il doit donc poser la vraie question.
 *
 * Tells whether WebGPU is actually usable, by requesting an adapter. The
 * presence of `navigator.gpu` is not enough: Chrome exposes the API in
 * contexts where no adapter is available, so the welcome screen, which states
 * a diagnosis, must ask the real question.
 *
 * @param {{ gpu?: { requestAdapter: () => Promise<unknown> } } | undefined} [nav]
 * @returns {Promise<boolean>}
 */
export async function hasUsableWebGPU(nav = globalThis.navigator) {
	if (!nav?.gpu?.requestAdapter) return false;
	try {
		return Boolean(await nav.gpu.requestAdapter());
	} catch {
		return false;
	}
}
