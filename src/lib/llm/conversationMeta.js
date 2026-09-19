/**
 * Règles métier des conversations, sans accès à la base.
 * Conversation business rules, with no database access.
 *
 * Séparées de `conversationRepo.js` pour rester testables sans Dexie ni
 * IndexedDB, donc sans navigateur.
 * Kept apart from `conversationRepo.js` so they stay testable without Dexie
 * or IndexedDB, hence without a browser.
 */

/** Titre de repli, avant qu'un message utilisateur n'existe. */
export const UNTITLED_CONVERSATION = 'Nouvelle conversation / New conversation';

/**
 * Identifiant unique d'une conversation.
 * Unique identifier for a conversation.
 * @returns {string}
 */
export function generateConversationId() {
	return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Titre déduit du premier message utilisateur, tronqué à 50 caractères.
 * Title derived from the first user message, truncated at 50 characters.
 *
 * @param {Array<{ role: string, content: any }>} messages
 * @returns {string}
 */
export function generateConversationTitle(messages) {
	if (!messages || messages.length === 0) return UNTITLED_CONVERSATION;

	const firstUserMessage = messages.find((m) => m.role === 'user');
	if (!firstUserMessage || typeof firstUserMessage.content !== 'string') {
		return UNTITLED_CONVERSATION;
	}

	const title = firstUserMessage.content.substring(0, 50);
	return title.length < firstUserMessage.content.length ? title + '...' : title;
}

/**
 * Fusionne ou remplace les modèles personnalisés lors d'un import.
 * En fusion, les modèles déjà présents sont conservés : un import ne doit pas
 * écraser silencieusement la configuration locale.
 * Merges or replaces custom models on import. When merging, models already
 * present are kept: an import must not silently overwrite the local
 * configuration.
 *
 * @param {Array<{ id: string }>} existing
 * @param {Array<{ id: string }> | undefined} incoming
 * @param {boolean} merge
 * @returns {Array<{ id: string }>}
 */
export function mergeCustomModels(existing, incoming, merge) {
	if (!incoming) return existing;
	if (!merge) return incoming;
	const existingIds = new Set(existing.map((m) => m.id));
	return [...existing, ...incoming.filter((m) => !existingIds.has(m.id))];
}
