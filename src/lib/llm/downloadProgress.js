/**
 * Suivi de la progression d'un téléchargement de modèle.
 * Model download progress tracking.
 *
 * Transformers.js rapporte la progression **par fichier** : le pourcentage
 * retombe à zéro à chaque nouveau fichier, et un modèle en compte plusieurs.
 * Une barre alimentée directement par ces événements reculerait sans cesse.
 * Ce suivi additionne les octets de tous les fichiers vus pour n'exposer
 * qu'un seul pourcentage, qui ne recule jamais.
 *
 * Transformers.js reports progress **per file**: the percentage drops back to
 * zero on each new file, and a model has several. A bar fed directly from
 * those events would keep going backwards. This tracker sums the bytes of
 * every file seen so as to expose a single percentage, which never goes back.
 *
 * Le dénominateur grandit quand un fichier inconnu apparaît : le pourcentage
 * peut alors reculer un peu. C'est assumé. Un cliquet qui l'en empêcherait
 * ferait bien pire : un premier fichier terminé figerait la barre à 100 %
 * pendant que les gigaoctets suivants arrivent encore. Le pourcentage est
 * donc plafonné à 99 tant que le chargement dure, et jamais annoncé complet
 * par ce suivi.
 * The denominator grows when an unknown file shows up, so the percentage can
 * dip. That is deliberate. A ratchet preventing it would do far worse: one
 * finished file would freeze the bar at 100 % while the remaining gigabytes
 * are still arriving. The percentage is therefore capped at 99 while loading
 * lasts, and never announced complete by this tracker.
 */

/**
 * @typedef {object} DownloadSnapshot
 * @property {number | null} percent - 0 à 100, ou null si indéterminé
 * @property {string} file - Fichier en cours, chaîne vide si inconnu
 * @property {number} loadedBytes
 * @property {number} totalBytes
 */

/**
 * Crée un suivi de téléchargement.
 * Creates a download tracker.
 */
export function createDownloadTracker() {
	/** @type {Map<string, { loaded: number, total: number }>} */
	const files = new Map();
	let currentFile = '';
	let highestPercent = 0;

	return {
		/**
		 * Consomme un événement brut de Transformers.js et rend l'état global.
		 * Consumes a raw Transformers.js event and returns the global state.
		 *
		 * @param {{ status?: string, file?: string, loaded?: number, total?: number, progress?: number } | null | undefined} raw
		 * @returns {DownloadSnapshot}
		 */
		update(raw) {
			if (raw?.file) currentFile = raw.file;

			// Un fichier n'est compté que lorsqu'on connaît sa taille, sans quoi
			// il fausserait le dénominateur.
			// A file only counts once its size is known, otherwise it would skew
			// the denominator.
			if (raw?.file && Number.isFinite(raw.total) && raw.total > 0) {
				const loaded = Number.isFinite(raw.loaded)
					? Math.min(raw.loaded, raw.total)
					: 0;
				const connu = files.get(raw.file);
				files.set(raw.file, {
					total: raw.total,
					// `done` n'apporte pas toujours `loaded` : le fichier est alors
					// complet par définition.
					loaded: raw.status === 'done' ? raw.total : Math.max(loaded, connu?.loaded ?? 0)
				});
			} else if (raw?.status === 'done' && raw?.file && files.has(raw.file)) {
				const connu = files.get(raw.file);
				files.set(raw.file, { total: connu.total, loaded: connu.total });
			}

			return this.snapshot();
		},

		/** @returns {DownloadSnapshot} */
		snapshot() {
			let loadedBytes = 0;
			let totalBytes = 0;
			for (const { loaded, total } of files.values()) {
				loadedBytes += loaded;
				totalBytes += total;
			}

			if (totalBytes === 0) {
				return { percent: null, file: currentFile, loadedBytes: 0, totalBytes: 0 };
			}

			// Plafonné à 99 : d'autres fichiers peuvent encore s'annoncer, et
			// une barre pleine devant un téléchargement qui continue est un
			// mensonge. C'est au store de poser l'état final.
			// Capped at 99: more files may still announce themselves, and a full
			// bar in front of an ongoing download is a lie. Posting the final
			// state is the store's job.
			const brut = Math.round((loadedBytes / totalBytes) * 100);
			return {
				percent: Math.min(brut, 99),
				file: currentFile,
				loadedBytes,
				totalBytes
			};
		},

		reset() {
			files.clear();
			currentFile = '';
			highestPercent = 0;
		}
	};
}

/**
 * Met un nombre d'octets en forme lisible, en unités binaires.
 * Formats a byte count for reading, in binary units.
 *
 * @param {number} bytes
 * @returns {string}
 */
export function formatBytes(bytes) {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 o';
	const unites = ['o', 'Ko', 'Mo', 'Go'];
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), unites.length - 1);
	const valeur = bytes / 1024 ** i;
	return `${valeur >= 10 || i === 0 ? Math.round(valeur) : valeur.toFixed(1)} ${unites[i]}`;
}
