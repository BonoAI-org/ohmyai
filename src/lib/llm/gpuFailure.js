/**
 * Lecture des échecs du GPU pour l'utilisateur.
 * Reading GPU failures for the user.
 *
 * Dawn dit « Allocation size too large » quand le pilote refuse un tampon
 * unique, ce qui pour l'utilisateur ne veut rien dire, et ne dit surtout pas
 * quoi faire. La conséquence est pourtant simple : ce modèle ne tournera pas
 * sur cet appareil, un plus léger peut-être. Ce module reconnaît cette famille
 * d'erreurs et choisit le modèle à proposer à la place.
 * Dawn says "Allocation size too large" when the driver refuses a single
 * buffer, which means nothing to the user and above all does not say what to
 * do. The consequence is simple though: this model will not run on this
 * device, a lighter one might. This module recognises that family of errors
 * and picks the model to offer instead.
 */
import { classifyModel, estimateLargestBufferBytes } from './modelFit.js';

/**
 * Messages de la famille « le GPU n'alloue pas autant ».
 * Messages of the "the GPU will not allocate that much" family.
 */
const ALLOCATION_MESSAGE = /allocation size too large|out of memory|failed to allocate|not enough memory/i;

/**
 * L'échec vient-il d'une allocation refusée par le GPU ?
 * Does the failure come from an allocation the GPU refused?
 *
 * @param {unknown} err - Une `GpuDeviceError` le plus souvent / Usually a `GpuDeviceError`.
 * @returns {boolean}
 */
export function isGpuAllocationFailure(err) {
	const e = /** @type {any} */ (err);
	if (!e || typeof e !== 'object') return false;
	if (e.gpuErrorType === 'out-of-memory') return true;
	return ALLOCATION_MESSAGE.test(String(e.message ?? ''));
}

/**
 * Poids d'un modèle en Go, que le catalogue l'écrive en GB ou en MB.
 * A model's weight in GB, whether the catalog writes it in GB or MB.
 *
 * @param {{ size?: string } | null | undefined} model
 * @returns {number | null}
 */
export function modelWeightGB(model) {
	const match = String(model?.size ?? '').match(/([\d.]+)\s*(GB|MB)/i);
	if (!match) return null;
	const value = parseFloat(match[1]);
	return match[2].toUpperCase() === 'MB' ? value / 1024 : value;
}

/**
 * Choisit le modèle à proposer après un refus d'allocation : le plus lourd
 * des modèles plus légers que celui qui a échoué, pour perdre le moins de
 * qualité possible, parmi ceux que la machine peut charger.
 *
 * L'échec lui-même est une mesure : le pilote a refusé le plus gros tampon du
 * modèle. On en tire un plafond d'allocation, plus strict que la sonde
 * quand celle-ci a été trop optimiste.
 *
 * Picks the model to offer after a refused allocation: the heaviest of the
 * models lighter than the failed one, to lose as little quality as possible,
 * among those the machine can load. The failure itself is a measurement: the
 * driver refused the model's largest buffer. It yields an allocation ceiling,
 * stricter than the probe when the probe was too optimistic.
 *
 * @template {{ id: string, size?: string }} T
 * @param {T} failed
 * @param {T[]} catalog
 * @param {{
 *   hasWebGPU?: boolean | null,
 *   deviceMemoryGB?: number | null,
 *   shaderF16?: boolean | null,
 *   largestAllocatableBytes?: number | null
 * }} [device]
 * @returns {T | null}
 */
export function suggestLighterModel(failed, catalog, device = {}) {
	const failedWeight = modelWeightGB(failed);
	if (failedWeight === null) return null;

	const refusedBytes = estimateLargestBufferBytes(failed);
	const probed = device.largestAllocatableBytes ?? null;
	const ceiling =
		refusedBytes === null
			? probed
			: probed === null
				? refusedBytes - 1
				: Math.min(probed, refusedBytes - 1);
	const constraints = { ...device, largestAllocatableBytes: ceiling, isInstalled: false };

	let best = null;
	let bestWeight = -Infinity;
	for (const model of catalog) {
		if (model.id === failed.id) continue;
		const weight = modelWeightGB(model);
		if (weight === null || weight >= failedWeight) continue;
		if (classifyModel(model, constraints) === 'incompatible') continue;
		if (weight > bestWeight) {
			best = model;
			bestWeight = weight;
		}
	}
	return best;
}
