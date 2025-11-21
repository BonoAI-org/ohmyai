/**
 * Gestionnaire de cache pour les modèles LLM utilisant l'OPFS (Origin Private File System).
 * Cache manager for LLM models using OPFS (Origin Private File System).
 */

/**
 * Vérifie si l'API OPFS est disponible.
 * Check if the OPFS API is available.
 * @returns {boolean} - True si l'OPFS est supporté / True if OPFS is supported.
 */
export function isOpfsSupported() {
	return 'storage' in navigator && 'getDirectory' in navigator.storage;
}

/**
 * Récupère le répertoire racine de l'OPFS.
 * Get the root directory of OPFS.
 * @returns {Promise<FileSystemDirectoryHandle>} - Le handle du répertoire / The directory handle.
 */
async function getOpfsRoot() {
	if (!isOpfsSupported()) {
		throw new Error('OPFS n\'est pas supporté sur ce navigateur. / OPFS is not supported on this browser.');
	}
	return await navigator.storage.getDirectory();
}

/**
 * Récupère ou crée le répertoire pour un modèle spécifique.
 * Get or create the directory for a specific model.
 * @param {string} modelId - L'ID du modèle / The model ID.
 * @returns {Promise<FileSystemDirectoryHandle>} - Le handle du répertoire du modèle / The model directory handle.
 */
export async function getModelDirectory(modelId) {
	const root = await getOpfsRoot();
	return await root.getDirectoryHandle(modelId, { create: true });
}

/**
 * Sauvegarde un fichier dans un répertoire de l'OPFS.
 * Save a file to a directory in OPFS.
 * @param {FileSystemDirectoryHandle} directoryHandle - Le répertoire où sauvegarder / The directory to save to.
 * @param {string} fileName - Le nom du fichier / The file name.
 * @param {ArrayBuffer} data - Les données du fichier / The file data.
 */
export async function saveFileToOpfs(directoryHandle, fileName, data) {
	const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
	const writable = await fileHandle.createWritable();
	await writable.write(data);
	await writable.close();
}

/**
 * Récupère un fichier depuis un répertoire de l'OPFS.
 * Get a file from a directory in OPFS.
 * @param {FileSystemDirectoryHandle} directoryHandle - Le répertoire où chercher / The directory to search in.
 * @param {string} fileName - Le nom du fichier / The file name.
 * @returns {Promise<File|null>} - Le fichier, ou null s'il n'existe pas / The file, or null if it doesn't exist.
 */
export async function getFileFromOpfs(directoryHandle, fileName) {
	try {
		const fileHandle = await directoryHandle.getFileHandle(fileName);
		return await fileHandle.getFile();
	} catch (e) {
		if (e.name === 'NotFoundError') {
			return null;
		}
		throw e;
	}
}

/**
 * Vérifie si tous les fichiers d'un modèle sont présents dans l'OPFS.
 * Check if all files for a model are present in OPFS.
 * @param {string} modelId - L'ID du modèle / The model ID.
 * @param {string[]} fileList - La liste des fichiers attendus / The list of expected files.
 * @returns {Promise<boolean>} - True si tous les fichiers sont présents / True if all files are present.
 */
export async function checkModelInOpfs(modelId, fileList) {
	try {
		const modelDir = await getModelDirectory(modelId);
		for (const fileName of fileList) {
			const file = await getFileFromOpfs(modelDir, fileName);
			if (!file) {
				return false;
			}
		}
		return true;
	} catch (e) {
		return false;
	}
}
