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
 * Plafond de `navigator.deviceMemory` dans Chrome. Une valeur égale au plafond
 * signifie « autant ou plus », donc on ne peut en conclure un manque de RAM.
 * Cap of `navigator.deviceMemory` in Chrome. A value equal to the cap means
 * "that much or more", so it cannot prove a RAM shortage.
 */
const DEVICE_MEMORY_CAP_GB = 8;

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
 * @param {{ vram?: string, size?: string } | null | undefined} modelConfig
 * @param {{ deviceMemory?: number, gpu?: { requestAdapter: () => Promise<any> } } | undefined} [nav]
 * @returns {Promise<{ supported: boolean, requiredGB: number, deviceMemoryGB: number | null, gpuMaxBufferGB: number | null }>}
 */
export async function estimateHardwareSupport(modelConfig, nav = globalThis.navigator) {
	const requiredGB = requiredVramGB(modelConfig);

	const result = {
		supported: true,
		requiredGB: Math.round(requiredGB * 10) / 10,
		deviceMemoryGB: null,
		gpuMaxBufferGB: null
	};

	if (nav?.deviceMemory) {
		result.deviceMemoryGB = nav.deviceMemory;
		if (nav.deviceMemory < DEVICE_MEMORY_CAP_GB && requiredGB > nav.deviceMemory) {
			result.supported = false;
		}
	}

	try {
		const adapter = await nav?.gpu?.requestAdapter();
		if (adapter) {
			const maxBufferGB = adapter.limits.maxBufferSize / 1024 ** 3;
			result.gpuMaxBufferGB = Math.round(maxBufferGB * 10) / 10;
			// Les poids sont répartis sur plusieurs buffers GPU : on exige que le
			// buffer maximal couvre au moins le quart du modèle, sinon
			// l'adaptateur est trop limité pour cette taille.
			// Weights are split across several GPU buffers: the max buffer must
			// cover at least a quarter of the model, otherwise the adapter is too
			// limited for this size.
			if (requiredGB > 0 && maxBufferGB < requiredGB / 4) {
				result.supported = false;
			}
		} else {
			result.supported = false;
		}
	} catch (_) {
		// Requête adaptateur échouée : on reste permissif, le chargement
		// échouera avec un message clair le cas échéant.
		// Adapter query failed: stay permissive, loading will fail with a clear
		// message if needed.
	}

	return result;
}
