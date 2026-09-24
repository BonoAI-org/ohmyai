/**
 * Estimation de la durée de téléchargement d'un modèle.
 * Model download duration estimate.
 *
 * L'écran d'accueil annonce une durée avant le clic, pour que le coût du
 * téléchargement soit connu d'avance. Cette durée ne peut qu'être approchée :
 * le navigateur n'expose pas de débit fiable, et `navigator.connection` est
 * absent de Firefox et de Safari.
 *
 * The welcome screen states a duration before the click, so the cost of the
 * download is known up front. That duration can only be approximate: the
 * browser exposes no reliable throughput, and `navigator.connection` is absent
 * from Firefox and Safari.
 */

/**
 * Débit retenu par défaut, en mégaoctets par seconde.
 *
 * Hypothèse : une connexion domestique correcte en Wi-Fi, soit environ
 * 80 Mbit/s utiles, ce qui donne 10 Mo/s. Un chiffre volontairement prudent :
 * mieux vaut une estimation dépassée par la réalité que l'inverse. C'est
 * pourquoi la durée s'affiche toujours précédée de « ≈ ».
 *
 * Assumption: a decent home Wi-Fi connection, about 80 Mbit/s of usable
 * throughput, that is 10 MB/s. Deliberately conservative: better an estimate
 * that reality beats than the opposite. Hence the duration always shows a "≈".
 */
export const ASSUMED_THROUGHPUT_MB_PER_S = 10;

const MB_PER_GB = 1024;

/**
 * Durée estimée d'un téléchargement, en minutes.
 *
 * @param {number | null} sizeGB - Poids du modèle en gigaoctets
 * @param {number} [throughput] - Débit en Mo/s
 * @returns {number | null} minutes, arrondies à l'entier, au moins 1
 */
export function estimateMinutes(sizeGB, throughput = ASSUMED_THROUGHPUT_MB_PER_S) {
	if (!Number.isFinite(sizeGB) || sizeGB <= 0 || throughput <= 0) return null;
	const seconds = (sizeGB * MB_PER_GB) / throughput;
	return Math.max(1, Math.round(seconds / 60));
}
