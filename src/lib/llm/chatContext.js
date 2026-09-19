/**
 * Construction du contexte envoyé au modèle.
 * Building the context sent to the model.
 *
 * `sendMessage` mélangeait six préoccupations dans une seule fonction de
 * 300 lignes : conversion multimodale, prompt système, mode raisonnement,
 * profil utilisateur, base de connaissances, puis streaming et outils. Ce
 * module regroupe les cinq premières, sous forme de fonctions pures : elles
 * reçoivent des données et en renvoient, sans toucher au store ni au réseau,
 * ce qui les rend testables directement.
 *
 * `sendMessage` mixed six concerns in a single 300-line function: multimodal
 * conversion, system prompt, thinking mode, user profile, knowledge base,
 * then streaming and tools. This module gathers the first five as pure
 * functions: they take data and return data, touching neither the store nor
 * the network, which makes them directly testable.
 */

/**
 * Prompt système de repli, volontairement contraignant : les petits modèles
 * qui tournent dans le navigateur partent facilement en boucle.
 * Fallback system prompt, deliberately restrictive: the small models running
 * in the browser easily run away in loops.
 */
export const DEFAULT_SYSTEM_PROMPT =
	'You are a helpful assistant. Keep your answers SHORT: 2-3 sentences max. Never repeat yourself. Never restart your answer. Maximum 3 items in any list. Stop when done.';

/**
 * Convertit les messages du store au format attendu par les API compatibles
 * OpenAI. Un message porteur d'images devient un tableau de parties.
 * Converts store messages to the format expected by OpenAI-compatible APIs.
 * A message carrying images becomes an array of parts.
 *
 * @param {Array<{ role: string, content: string, images?: string[] }>} messages
 * @returns {Array<{ role: string, content: any }>}
 */
export function toOpenAIMessages(messages) {
	return messages.map((msg) => {
		if (msg.images && msg.images.length > 0) {
			const parts = [];
			if (msg.content && msg.content.length > 0) {
				parts.push({ type: 'text', text: msg.content });
			}
			for (const url of msg.images) {
				parts.push({ type: 'image_url', image_url: { url } });
			}
			return { role: msg.role, content: parts };
		}
		return { role: msg.role, content: msg.content };
	});
}

/**
 * Contenu du message système : les règles de l'utilisateur, ou le prompt de
 * repli lorsqu'elles sont vides.
 * System message content: the user's rules, or the fallback prompt when they
 * are empty.
 *
 * @param {string | null | undefined} systemPrompt
 * @returns {string}
 */
export function buildSystemContent(systemPrompt) {
	const trimmed = systemPrompt?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_SYSTEM_PROMPT;
}

/**
 * Bloc décrivant l'utilisateur, ajouté au message système. Renvoie une chaîne
 * vide si le profil n'est pas renseigné.
 * Block describing the user, appended to the system message. Returns an empty
 * string when the profile is not filled in.
 *
 * @param {Record<string, string>} [userProfile]
 * @returns {string}
 */
export function formatUserProfile(userProfile = {}) {
	const labels = [
		['name', 'Name'],
		['role', 'Role'],
		['expertise', 'Expertise'],
		['preferences', 'Preferences'],
		['language', 'Preferred language']
	];
	const parts = [];
	for (const [key, label] of labels) {
		if (userProfile[key]) parts.push(`${label}: ${userProfile[key]}`);
	}
	if (parts.length === 0) return '';
	return `\n\n[User Profile]\n${parts.join('\n')}`;
}

/**
 * Ajoute le marqueur `/no_think` au dernier message utilisateur, en place.
 * Certains modèles l'interprètent comme une demande de réponse directe.
 * Appends the `/no_think` marker to the last user message, in place. Some
 * models read it as a request for a direct answer.
 *
 * @param {Array<{ role: string, content: any }>} chatMessages
 */
export function appendNoThink(chatMessages) {
	const lastUserIdx = chatMessages.findLastIndex((m) => m.role === 'user');
	if (lastUserIdx === -1) return;
	const msg = chatMessages[lastUserIdx];
	if (typeof msg.content === 'string') {
		chatMessages[lastUserIdx] = { ...msg, content: msg.content + ' /no_think' };
	} else if (Array.isArray(msg.content)) {
		const textPart = msg.content.find((p) => p.type === 'text');
		if (textPart) textPart.text += ' /no_think';
	}
}

/**
 * Écarte les résultats nettement moins pertinents que le meilleur : en
 * recherche hybride, un score sous la moitié du top est du bruit.
 * Drops results clearly less relevant than the best one: in hybrid search, a
 * score below half the top score is noise.
 *
 * @param {Array<{ score: number }>} hits
 * @param {number} [ratio]
 * @returns {Array<any>}
 */
export function filterRagHits(hits, ratio = 0.5) {
	if (!Array.isArray(hits) || hits.length <= 1) return hits ?? [];
	const topScore = hits[0].score;
	return hits.filter((h) => h.score >= topScore * ratio);
}

/**
 * Bloc de contexte documentaire ajouté au message système.
 * Document context block appended to the system message.
 *
 * @param {Array<{ content: string }>} hits
 * @returns {string}
 */
export function formatRagContext(hits) {
	if (!hits || hits.length === 0) return '';
	const list = hits.map((h, i) => `${i + 1}. ${h.content}`).join('\n');
	return `\n\n[Knowledge Base]\nUser-provided information relevant to the question. Use it when applicable:\n${list}`;
}

/**
 * Sources dédupliquées, en conservant le meilleur score par source, pour
 * affichage sous la réponse.
 * Deduplicated sources, keeping the best score per source, for display under
 * the answer.
 *
 * @param {Array<{ source: string, score: number }>} hits
 * @returns {Array<{ source: string, score: number }>}
 */
export function dedupeRagSources(hits) {
	const bySource = new Map();
	for (const h of hits ?? []) {
		if (!bySource.has(h.source) || bySource.get(h.source) < h.score) {
			bySource.set(h.source, h.score);
		}
	}
	return [...bySource.entries()].map(([source, score]) => ({ source, score }));
}

/**
 * Assemble le contexte complet.
 * Assembles the full context.
 *
 * L'ordre du message système est significatif et repris tel quel de l'ancien
 * `sendMessage` : règles, puis profil, puis base de connaissances.
 * The system message order is significant and carried over unchanged from the
 * old `sendMessage`: rules, then profile, then knowledge base.
 *
 * @param {Array<{ role: string, content: string, images?: string[] }>} messages
 * @param {{
 *   systemPrompt?: string,
 *   userProfile?: Record<string, string>,
 *   noThink?: boolean,
 *   ragHits?: Array<{ content: string, source: string, score: number }>
 * }} [options]
 * @returns {{ chatMessages: Array<{ role: string, content: any }>, ragSources: Array<{ source: string, score: number }> }}
 */
export function buildChatContext(messages, options = {}) {
	const { systemPrompt, userProfile, noThink = false, ragHits } = options;

	const chatMessages = toOpenAIMessages(messages);
	chatMessages.unshift({ role: 'system', content: buildSystemContent(systemPrompt) });

	if (noThink) appendNoThink(chatMessages);

	const profileContext = formatUserProfile(userProfile);
	if (profileContext) chatMessages[0].content += profileContext;

	let ragSources = [];
	const hits = filterRagHits(ragHits ?? []);
	if (hits.length > 0) {
		chatMessages[0].content += formatRagContext(hits);
		ragSources = dedupeRagSources(hits);
	}

	return { chatMessages, ragSources };
}
