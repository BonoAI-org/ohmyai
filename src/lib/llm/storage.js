/**
 * Accès tolérant au localStorage.
 * Forgiving localStorage access.
 *
 * Le store répétait le même try/catch autour de chaque lecture et écriture :
 * le localStorage jette en navigation privée, quand le quota est atteint, ou
 * quand l'utilisateur a bloqué le stockage du site. Un réglage qui ne peut
 * pas être persisté ne doit jamais casser l'application.
 *
 * The store repeated the same try/catch around every read and write:
 * localStorage throws in private browsing, when the quota is reached, or when
 * the user has blocked the site's storage. A setting that cannot be persisted
 * must never break the app.
 */

/**
 * Lit une valeur. Renvoie `fallback` si la clé est absente, si le stockage est
 * inaccessible, ou si le JSON attendu est corrompu.
 * Reads a value. Returns `fallback` if the key is missing, if storage is
 * unreachable, or if the expected JSON is malformed.
 *
 * @template T
 * @param {string} key
 * @param {{ json?: boolean, fallback?: T }} [options]
 * @returns {T | string | null}
 */
export function readLocal(key, { json = false, fallback = null } = {}) {
	try {
		if (typeof localStorage === 'undefined') return fallback;
		const raw = localStorage.getItem(key);
		if (raw === null) return fallback;
		return json ? JSON.parse(raw) : raw;
	} catch (e) {
		console.error(`Lecture de "${key}" impossible / Cannot read "${key}":`, e);
		return fallback;
	}
}

/**
 * Écrit une valeur. Échoue silencieusement, en journalisant.
 * Writes a value. Fails silently, with a log.
 *
 * @param {string} key
 * @param {any} value
 * @param {{ json?: boolean }} [options]
 * @returns {boolean} vrai si l'écriture a abouti / true when the write landed
 */
export function writeLocal(key, value, { json = false } = {}) {
	try {
		if (typeof localStorage === 'undefined') return false;
		localStorage.setItem(key, json ? JSON.stringify(value) : String(value));
		return true;
	} catch (e) {
		console.error(`Écriture de "${key}" impossible / Cannot write "${key}":`, e);
		return false;
	}
}

/**
 * Supprime une clé. Échoue silencieusement.
 * Removes a key. Fails silently.
 *
 * @param {string} key
 */
export function removeLocal(key) {
	try {
		if (typeof localStorage === 'undefined') return;
		localStorage.removeItem(key);
	} catch (e) {
		console.error(`Suppression de "${key}" impossible / Cannot remove "${key}":`, e);
	}
}
