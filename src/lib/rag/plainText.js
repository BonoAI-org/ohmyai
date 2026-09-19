/**
 * Conversion d'une réponse du modèle en texte brut, pour l'indexation.
 * Conversion of a model answer to plain text, for indexing.
 *
 * Le bloc de réflexion et le balisage Markdown polluent à la fois la note
 * lisible et les vecteurs d'embedding, d'où ce nettoyage avant enregistrement
 * dans la base de connaissances.
 * The thinking block and the Markdown markup pollute both the readable note
 * and the embedding vectors, hence this cleanup before saving into the
 * knowledge base.
 */
import { marked } from 'marked';

/**
 * @param {string} content
 * @returns {string}
 */
export function toPlainText(content) {
	const withoutThinking = content
		.replace(/^<think>[\s\S]*?(<\/think>|$)/, '')
		.replace(/^\[THINK\][\s\S]*?(\[\/THINK\]|$)/, '')
		.trim();

	const html = marked.parse(withoutThinking);
	return new DOMParser()
		.parseFromString(html, 'text/html')
		.body.textContent.replace(/\n{3,}/g, '\n\n')
		.trim();
}
