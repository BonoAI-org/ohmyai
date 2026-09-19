/**
 * Export d'une conversation au format Markdown.
 * Conversation export to Markdown.
 */

/**
 * Rend une conversation en Markdown.
 * Renders a conversation as Markdown.
 *
 * @param {Array<{ role: string, content: string }>} messages
 * @param {Date} [now] - Injectable pour rendre le rendu déterministe en test.
 * @returns {string}
 */
export function renderConversationMarkdown(messages, now = new Date()) {
	let md = `# Oh my AI! - Export de Conversation / Conversation Export\n\n`;
	md += `*Date : ${now.toLocaleString()}*\n\n---\n\n`;

	for (const msg of messages) {
		const role = msg.role === 'user' ? '👤 **Vous / You**' : '🤖 **IA / AI**';
		md += `### ${role}\n\n${msg.content}\n\n---\n\n`;
	}

	return md;
}

/**
 * Nom de fichier horodaté à la minute.
 * Filename stamped to the minute.
 *
 * @param {Date} [now]
 * @returns {string}
 */
export function conversationFilename(now = new Date()) {
	const date = now.toISOString().split('T')[0];
	const [hours, minutes] = now.toTimeString().split(':');
	return `conversation-${date}_${hours}-${minutes}.md`;
}

/**
 * Déclenche le téléchargement de la conversation.
 * Triggers the conversation download.
 *
 * @param {Array<{ role: string, content: string }>} messages
 */
export function downloadConversationMarkdown(messages) {
	if (!messages || messages.length === 0) return;

	const now = new Date();
	const blob = new Blob([renderConversationMarkdown(messages, now)], {
		type: 'text/markdown;charset=utf-8;'
	});
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = conversationFilename(now);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
