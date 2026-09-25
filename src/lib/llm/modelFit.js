/**
 * Classement des modèles par compatibilité avec la machine détectée.
 * Ranking of models by fit with the detected machine.
 *
 * Le sélecteur trie sur ce verdict plutôt que sur l'ordre du catalogue : un
 * modèle que l'appareil ne peut pas charger n'a rien à faire en tête de liste.
 * The selector sorts on this verdict rather than on catalog order: a model the
 * device cannot load has no business at the top of the list.
 */
import { exceedsBrowserLimit, parseGigabytes, requiredVramGB } from './hardware.js';

/**
 * Part du poids d'un modèle que peut représenter son plus gros tampon unique.
 *
 * Mesurée sur l'échec observé : Gemma 4 E2B, annoncé à 3,2 Go, a demandé une
 * allocation unique de 1,09 Gio, soit un tiers de son poids. Le plus gros
 * tampon est en général la table d'embeddings ou le bloc de poids du décodeur.
 * Ce n'est qu'une estimation, volontairement basse pour ne pas écarter des
 * modèles à tort.
 *
 * Share of a model's weight its largest single buffer can represent. Measured
 * on the observed failure: Gemma 4 E2B, advertised at 3.2 GB, asked for a
 * single 1.09 GiB allocation, a third of its weight. Deliberately low so as
 * not to wrongly rule models out.
 */
export const LARGEST_BUFFER_SHARE = 1 / 3;

/**
 * Estime le plus gros tampon unique qu'un modèle demandera, en octets.
 *
 * @param {{ size?: string } | null | undefined} model
 * @returns {number | null}
 */
export function estimateLargestBufferBytes(model) {
	const sizeGB = parseGigabytes(model?.size);
	if (sizeGB === null || sizeGB <= 0) return null;
	return sizeGB * 1024 ** 3 * LARGEST_BUFFER_SHARE;
}

/**
 * Un modèle réclame-t-il la demi-précision ?
 *
 * Le nom des variantes la porte : `q4f16`, `q2f16`, `q4f16_1`. Le champ
 * `dtype` peut être une chaîne ou un objet par sous-module.
 * The variant name carries it. The `dtype` field is either a string or an
 * object keyed by submodule.
 *
 * @param {{ id?: string, dtype?: string | Record<string, string> } | null | undefined} model
 * @returns {boolean}
 */
export function requiresShaderF16(model) {
	const dtypes =
		typeof model?.dtype === 'string'
			? [model.dtype]
			: Object.values(model?.dtype ?? {});
	return [...dtypes, model?.id ?? ''].some((v) => /f16/i.test(String(v)));
}

/**
 * Les quatre verdicts, du plus au moins immédiatement utilisable. L'ordre du
 * tableau est l'ordre d'affichage.
 * The four verdicts, from most to least immediately usable. The array order is
 * the display order.
 */
export const FIT_ORDER = ['installed', 'suitable', 'slow', 'incompatible'];

/**
 * Classe un modèle selon ce que la machine peut en faire.
 *
 * - `installed`   : déjà sur l'appareil, rien à télécharger
 * - `suitable`    : la machine a le GPU et la mémoire pour le faire tourner
 * - `slow`        : chargeable, mais sans WebGPU les réponses traîneront
 * - `incompatible`: le navigateur ou la mémoire refuseront de le charger
 *
 * L'absence d'information vaut accord : un navigateur qui ne rapporte pas sa
 * mémoire ne doit pas faire déclarer un modèle incompatible à tort.
 * Missing information counts as a yes: a browser that does not report its
 * memory must not get a model wrongly declared incompatible.
 *
 * @param {{ size?: string, vram?: string, engine?: string } | null | undefined} model
 * @param {{
 *   isInstalled?: boolean,
 *   hasWebGPU?: boolean | null,
 *   deviceMemoryGB?: number | null,
 *   shaderF16?: boolean | null,
 *   largestAllocatableBytes?: number | null
 * }} [device]
 * @returns {'installed' | 'suitable' | 'slow' | 'incompatible'}
 */
export function classifyModel(model, device = {}) {
	const {
		isInstalled = false,
		hasWebGPU = null,
		deviceMemoryGB = null,
		shaderF16 = null,
		largestAllocatableBytes = null
	} = device;

	if (isInstalled) return 'installed';

	// Aucune machine ne passe cette limite : le navigateur refuse avant elle.
	if (exceedsBrowserLimit(model)) return 'incompatible';

	// Sans `shader-f16`, le WGSL d'un modèle en demi-précision ne compile pas :
	// « extension 'f16' is not allowed in the current environment ».
	// Without `shader-f16`, a half-precision model's WGSL does not compile.
	if (shaderF16 === false && requiresShaderF16(model)) return 'incompatible';

	// Le pilote refuse les allocations au-delà de ce qui a été mesuré, quoi
	// qu'annonce `maxBufferSize`.
	// The driver refuses allocations past what was measured, whatever
	// `maxBufferSize` advertises.
	const plusGrosTampon = estimateLargestBufferBytes(model);
	if (
		largestAllocatableBytes !== null &&
		plusGrosTampon !== null &&
		plusGrosTampon > largestAllocatableBytes
	) {
		return 'incompatible';
	}

	const required = requiredVramGB(model);
	if (deviceMemoryGB !== null && required > 0 && required > deviceMemoryGB) {
		return 'incompatible';
	}

	// Sans accélération GPU tout tourne, mais lentement.
	if (hasWebGPU === false) return 'slow';

	return 'suitable';
}

/**
 * Trie une liste de modèles par compatibilité, en gardant l'ordre du catalogue
 * à l'intérieur de chaque groupe.
 * Sorts a model list by fit, keeping catalog order inside each group.
 *
 * @template {{ id: string }} T
 * @param {T[]} models
 * @param {(model: T) => ReturnType<typeof classifyModel>} fitOf
 * @returns {T[]}
 */
export function sortByFit(models, fitOf) {
	return [...models].sort(
		(a, b) => FIT_ORDER.indexOf(fitOf(a)) - FIT_ORDER.indexOf(fitOf(b))
	);
}
