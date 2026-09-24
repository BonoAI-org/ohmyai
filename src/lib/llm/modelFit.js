/**
 * Classement des modèles par compatibilité avec la machine détectée.
 * Ranking of models by fit with the detected machine.
 *
 * Le sélecteur trie sur ce verdict plutôt que sur l'ordre du catalogue : un
 * modèle que l'appareil ne peut pas charger n'a rien à faire en tête de liste.
 * The selector sorts on this verdict rather than on catalog order: a model the
 * device cannot load has no business at the top of the list.
 */
import { exceedsBrowserLimit, requiredVramGB } from './hardware.js';

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
 *   deviceMemoryGB?: number | null
 * }} [device]
 * @returns {'installed' | 'suitable' | 'slow' | 'incompatible'}
 */
export function classifyModel(model, device = {}) {
	const { isInstalled = false, hasWebGPU = null, deviceMemoryGB = null } = device;

	if (isInstalled) return 'installed';

	// Aucune machine ne passe cette limite : le navigateur refuse avant elle.
	if (exceedsBrowserLimit(model)) return 'incompatible';

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
