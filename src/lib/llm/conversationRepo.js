/**
 * Accès à la base des conversations (IndexedDB via Dexie).
 * Conversation database access (IndexedDB through Dexie).
 *
 * Le store gardait une douzaine de méthodes mêlant requêtes Dexie et
 * affectations d'état réactif. Les requêtes vivent ici ; le store ne garde que
 * les affectations et les mêmes noms de méthodes publiques, consommés par le
 * panneau d'historique.
 *
 * The store held a dozen methods mixing Dexie queries and reactive state
 * assignments. The queries live here; the store keeps only the assignments and
 * the same public method names, consumed by the history panel.
 *
 * Les règles métier sans I/O sont dans `conversationMeta.js`.
 * The I/O-free business rules live in `conversationMeta.js`.
 */
import { db } from '$lib/db/conversationDB.js';

/**
 * Écrit une conversation, en préservant son horodatage de création.
 * Writes a conversation, preserving its creation timestamp.
 *
 * @param {{
 *   id: string,
 *   title: string,
 *   titleIsCustom?: boolean,
 *   messages: Array<any>,
 *   model: string,
 *   existing?: { timestamp?: number } | null
 * }} conversation
 * @returns {Promise<void>}
 */
export async function persistConversation({ id, title, titleIsCustom, messages, model, existing }) {
	await db.saveConversation({
		id,
		title,
		// Marque un titre choisi par l'utilisateur, pour que les sauvegardes
		// automatiques suivantes ne le régénèrent pas.
		// Flags a user-chosen title, so later automatic saves do not
		// regenerate it.
		titleIsCustom: !!titleIsCustom,
		messages,
		model,
		timestamp: existing?.timestamp || Date.now(),
		lastModified: Date.now()
	});
}

/**
 * Lit une conversation.
 * Reads one conversation.
 * @param {string} id
 */
export function fetchConversation(id) {
	return db.getConversation(id);
}

/**
 * Charge l'historique complet, en migrant depuis le localStorage à la
 * première utilisation de la base.
 * Loads the full history, migrating from localStorage on the database's first
 * use.
 *
 * @returns {Promise<Array<any>>}
 */
export async function fetchHistory() {
	const count = await db.count();
	if (count === 0) {
		const migrated = await db.migrateFromLocalStorage();
		if (migrated.conversations > 0) {
			console.log(`✅ Migration réussie: ${migrated.conversations} conversations importées`);
		}
	}
	return db.getAllConversations();
}

/**
 * Supprime une conversation.
 * Deletes a conversation.
 * @param {string} id
 */
export function removeConversation(id) {
	return db.deleteConversation(id);
}

/**
 * Renomme une conversation.
 * Renames a conversation.
 * @param {string} id
 * @param {string} title
 * @returns {Promise<boolean>} faux si la conversation n'existe pas / false when it does not exist
 */
export async function renameInDb(id, title) {
	const conversation = await db.getConversation(id);
	if (!conversation) return false;
	await db.saveConversation({
		...conversation,
		title,
		// Un renommage fixe le titre : les sauvegardes automatiques ne doivent
		// plus le remplacer par un titre déduit du premier message.
		// A rename pins the title: automatic saves must no longer replace it
		// with one derived from the first message.
		titleIsCustom: true,
		lastModified: Date.now()
	});
	return true;
}

/**
 * Exporte tout l'historique, modèles personnalisés inclus.
 * Exports the whole history, custom models included.
 *
 * @param {Array<any>} customModels
 * @returns {Promise<string>}
 */
export async function exportHistoryJson(customModels) {
	const data = await db.exportAll();
	data.customModels = customModels;
	return JSON.stringify(data, null, 2);
}

/**
 * Importe un historique JSON.
 * Imports a JSON history.
 *
 * @param {string} jsonData
 * @param {boolean} merge
 * @returns {Promise<{ imported: any, customModels: Array<any> | undefined }>}
 */
export async function importHistoryJson(jsonData, merge) {
	const data = JSON.parse(jsonData);
	const imported = await db.importData(data, merge);
	return { imported, customModels: data.customModels };
}
