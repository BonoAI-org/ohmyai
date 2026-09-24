/**
 * Détection des échecs de chargement que Transformers.js ne remonte pas.
 * Detection of loading failures that Transformers.js does not surface.
 *
 * Transformers.js 4.3 télécharge chaque tranche de données externes d'un
 * modèle dans `new Promise(async (resolve, reject) => { … await getModelFile(…) })`.
 * Si ce téléchargement échoue, la fonction asynchrone interne rejette une
 * promesse que personne n'écoute, et la promesse extérieure ne se règle
 * jamais : `from_pretrained` attend indéfiniment. Le navigateur signale
 * seulement une « Uncaught (in promise) », et l'interface restait bloquée sur
 * « Chargement du modèle… ». Observé avec Gemma 4 26B A4B : l'allocation du
 * tampon d'une tranche échouait (RangeError), faute de mémoire dans l'onglet.
 * Transformers.js 4.3 downloads each external data chunk of a model inside
 * `new Promise(async (resolve, reject) => { … await getModelFile(…) })`. If
 * that download fails, the inner async function rejects a promise nobody
 * listens to, and the outer promise never settles: `from_pretrained` waits
 * forever. The browser only reports an "Uncaught (in promise)", and the UI
 * stayed stuck on "Loading model…". Observed with Gemma 4 26B A4B: allocating
 * a chunk's buffer failed (RangeError), for lack of memory in the tab.
 *
 * Seul signal disponible : l'événement `unhandledrejection` de la page. On
 * l'écoute pendant le chargement et on fait échouer celui-ci dès qu'un rejet
 * ressemble à un échec de chargement de fichier ou d'allocation.
 * Only available signal: the page's `unhandledrejection` event. We listen to
 * it while loading and fail the load as soon as a rejection looks like a file
 * loading or allocation failure.
 */

/**
 * Échec de chargement d'un modèle, avec sa nature pour l'affichage.
 * Model loading failure, with its kind for display.
 */
export class ModelLoadError extends Error {
	/**
	 * @param {'browser-memory' | 'file'} kind
	 * @param {string} message
	 * @param {unknown} [cause]
	 */
	constructor(kind, message, cause) {
		super(message, { cause });
		this.name = 'ModelLoadError';
		this.kind = kind;
	}
}

/** Messages des erreurs de fichier de Transformers.js / Transformers.js file error messages. */
const FILE_ERROR = /Could not locate file|occurred while trying to load file|Unable to get model file/i;

/**
 * Indique si un rejet non géré provient du chargement d'un modèle. Volontairement
 * étroit : un rejet sans rapport, pendant le chargement, ne doit pas l'interrompre.
 * Tells whether an unhandled rejection comes from loading a model. Deliberately
 * narrow: an unrelated rejection, during loading, must not interrupt it.
 *
 * @param {unknown} reason
 * @returns {boolean}
 */
export function isModelLoadFailure(reason) {
	if (reason instanceof RangeError) return true;
	if (!(reason instanceof Error)) return false;
	return reason.name === 'ModelFileNotFoundError' || FILE_ERROR.test(reason.message);
}

/**
 * Convertit la raison d'un rejet en `ModelLoadError`.
 * Converts a rejection reason into a `ModelLoadError`.
 *
 * @param {Error} reason
 * @returns {ModelLoadError}
 */
export function toModelLoadError(reason) {
	if (reason instanceof RangeError) {
		return new ModelLoadError('browser-memory', reason.message, reason);
	}
	return new ModelLoadError('file', reason.message, reason);
}

/**
 * Exécute un chargement en le faisant échouer au premier rejet non géré qui
 * relève du chargement de modèle. L'écoute est retirée dans tous les cas.
 * Runs a load, failing it on the first unhandled rejection that belongs to
 * model loading. The listener is removed in every case.
 *
 * @template T
 * @param {() => Promise<T>} load
 * @param {EventTarget | undefined} [target] - `globalThis` par défaut ; injectable pour les tests.
 * @returns {Promise<T>}
 */
export async function failOnUnhandledLoadError(load, target = globalThis) {
	if (!target || typeof target.addEventListener !== 'function') return load();

	/** @type {(event: any) => void} */
	let onRejection = () => {};
	const failure = new Promise((_, reject) => {
		onRejection = (event) => {
			if (!isModelLoadFailure(event?.reason)) return;
			// Le rejet est désormais traité : on évite le message « Uncaught ».
			// The rejection is now handled: avoid the "Uncaught" message.
			event.preventDefault?.();
			reject(toModelLoadError(event.reason));
		};
	});
	target.addEventListener('unhandledrejection', onRejection);
	try {
		return await Promise.race([load(), /** @type {Promise<never>} */ (failure)]);
	} finally {
		target.removeEventListener('unhandledrejection', onRejection);
	}
}
