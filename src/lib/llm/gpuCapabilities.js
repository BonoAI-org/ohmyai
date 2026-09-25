/**
 * Capacités réelles du GPU, mesurées plutôt que déduites.
 * Real GPU capabilities, measured rather than inferred.
 *
 * Deux échecs observés sur une même machine ont montré que les limites
 * annoncées par l'adaptateur ne disent pas ce que le pilote accorde :
 *
 *   - `Allocation size too large` sur une allocation unique de 1,09 Gio,
 *     alors que `maxBufferSize` annonçait bien davantage ;
 *   - `extension 'f16' is not allowed in the current environment`, parce que
 *     le device avait été créé sans `shader-f16`, faute que l'adaptateur
 *     l'expose.
 *
 * On ne se fie donc plus aux chiffres déclarés : on demande une vraie
 * allocation et on regarde si elle passe.
 *
 * Two failures on the same machine showed that the limits an adapter
 * advertises do not say what the driver grants. So we no longer trust the
 * declared numbers: we ask for a real allocation and see whether it goes
 * through.
 */

const GIO = 1024 ** 3;

/**
 * Paliers d'allocation sondés, du plus petit au plus grand. Un modèle dont le
 * plus gros tampon dépasse le dernier palier réussi ne se chargera pas.
 * Probed allocation steps, smallest first. A model whose largest buffer
 * exceeds the last successful step will not load.
 */
export const PROBE_STEPS_BYTES = [
	256 * 1024 * 1024,
	512 * 1024 * 1024,
	1 * GIO,
	2 * GIO
];

/**
 * @typedef {object} GpuCapabilities
 * @property {boolean} hasWebGPU - Un adaptateur a répondu
 * @property {boolean} shaderF16 - La demi-précision est utilisable
 * @property {number | null} maxBufferBytes - Limite annoncée par l'adaptateur
 * @property {number | null} largestAllocatableBytes - Plus grande allocation réellement obtenue
 * @property {string | null} vendor - Fabricant rapporté, s'il l'est
 * @property {string | null} description - Description de l'adaptateur, si fournie
 */

/** @returns {GpuCapabilities} */
function capacitesVides() {
	return {
		hasWebGPU: false,
		shaderF16: false,
		maxBufferBytes: null,
		largestAllocatableBytes: null,
		vendor: null,
		description: null
	};
}

/**
 * Tente une allocation d'une taille donnée et dit si elle a réussi.
 *
 * Une allocation refusée remonte par la portée d'erreur `out-of-memory`, pas
 * par une exception : `createBuffer` rend un tampon invalide, et c'est
 * `popErrorScope` qui le signale.
 * A refused allocation surfaces through the `out-of-memory` error scope, not
 * as an exception: `createBuffer` returns an invalid buffer, and
 * `popErrorScope` is what reports it.
 *
 * @param {GPUDevice} device
 * @param {number} bytes
 * @returns {Promise<boolean>}
 */
async function allocationPasse(device, bytes) {
	device.pushErrorScope('out-of-memory');
	let buffer = null;
	try {
		buffer = device.createBuffer({ size: bytes, usage: 0x80 /* STORAGE */ });
	} catch {
		// Certaines implémentations lèvent au lieu de remplir la portée.
		// Some implementations throw instead of filling the scope.
		await device.popErrorScope();
		return false;
	}
	const erreur = await device.popErrorScope();
	buffer?.destroy?.();
	return erreur === null;
}

/**
 * Mesure ce que le GPU accorde vraiment.
 *
 * @param {{ gpu?: GPU } | undefined} [nav]
 * @returns {Promise<GpuCapabilities>}
 */
export async function probeGpuCapabilities(nav = globalThis.navigator) {
	if (!nav?.gpu?.requestAdapter) return capacitesVides();

	let adapter;
	try {
		adapter = await nav.gpu.requestAdapter();
	} catch {
		return capacitesVides();
	}
	if (!adapter) return capacitesVides();

	const shaderF16 = Boolean(adapter.features?.has?.('shader-f16'));
	const maxBufferBytes = Number.isFinite(adapter.limits?.maxBufferSize)
		? adapter.limits.maxBufferSize
		: null;

	const resultat = {
		hasWebGPU: true,
		shaderF16,
		maxBufferBytes,
		largestAllocatableBytes: null,
		vendor: adapter.info?.vendor ?? null,
		description: adapter.info?.description ?? null
	};

	// Le device est demandé avec la demi-précision quand elle existe, pour que
	// la sonde reflète ce que les moteurs obtiendront.
	// The device is requested with half precision when available, so the probe
	// reflects what the engines will get.
	let device;
	try {
		device = await adapter.requestDevice(
			shaderF16 ? { requiredFeatures: ['shader-f16'] } : {}
		);
	} catch {
		return resultat;
	}
	if (!device) return resultat;

	// Une erreur non capturée pendant la sonde ne doit pas remonter en console
	// comme un défaut de l'application.
	// An uncaptured error during the probe must not surface in the console as
	// an application fault.
	device.onuncapturederror = () => {};

	try {
		for (const taille of PROBE_STEPS_BYTES) {
			if (maxBufferBytes !== null && taille > maxBufferBytes) break;
			if (!(await allocationPasse(device, taille))) break;
			resultat.largestAllocatableBytes = taille;
		}
	} finally {
		device.destroy?.();
	}

	return resultat;
}
