/**
 * Ingestion de fichiers pour la base de connaissances (RAG).
 * File ingestion for the knowledge base (RAG).
 *
 * Extraction de texte (TXT, Markdown, PDF) et découpage en chunks adaptés
 * à la recherche sémantique. PDF.js est importé dynamiquement pour ne pas
 * alourdir le bundle des utilisateurs qui n'importent jamais de PDF.
 * Text extraction (TXT, Markdown, PDF) and chunking suited to semantic
 * search. PDF.js is imported lazily so it does not weigh down the bundle
 * for users who never import a PDF.
 */

/**
 * Découpe un texte en chunks par paragraphes, avec chevauchement.
 * Les embeddings perdent en précision au-delà de quelques centaines de
 * tokens : on vise ~1500 caractères (~350 tokens) par chunk.
 * Splits text into paragraph-based chunks with overlap. Embeddings lose
 * precision past a few hundred tokens: we target ~1500 chars (~350 tokens)
 * per chunk.
 *
 * @param {string} text
 * @param {Object} [opts]
 * @param {number} [opts.maxChars=1500] - Taille cible d'un chunk / Target chunk size
 * @param {number} [opts.overlap=200] - Chevauchement entre chunks / Overlap between chunks
 * @returns {string[]}
 */
export function chunkText(text, { maxChars = 1500, overlap = 200 } = {}) {
	const clean = text.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').trim();
	if (!clean) return [];
	if (clean.length <= maxChars) return [clean];

	// Coupe d'abord par paragraphes, puis par phrases si un paragraphe déborde
	// Split by paragraphs first, then by sentences if a paragraph overflows
	const paragraphs = clean.split(/\n{2,}/);
	const pieces = [];
	for (const p of paragraphs) {
		if (p.length <= maxChars) {
			pieces.push(p);
		} else {
			let rest = p;
			while (rest.length > maxChars) {
				// Cherche une fin de phrase proche de la limite / Look for a sentence end near the limit
				let cut = rest.lastIndexOf('. ', maxChars);
				if (cut < maxChars * 0.5) cut = rest.lastIndexOf(' ', maxChars);
				if (cut < maxChars * 0.5) cut = maxChars;
				pieces.push(rest.slice(0, cut + 1).trim());
				rest = rest.slice(Math.max(0, cut + 1 - overlap)).trim();
			}
			if (rest) pieces.push(rest);
		}
	}

	// Regroupe les morceaux en chunks proches de maxChars / Pack pieces into chunks close to maxChars
	const chunks = [];
	let current = '';
	for (const piece of pieces) {
		if (current && current.length + piece.length + 2 > maxChars) {
			chunks.push(current);
			// Chevauchement : reprend la fin du chunk précédent / Overlap: carry the tail of the previous chunk
			current = current.slice(-overlap).trimStart();
		}
		current = current ? `${current}\n\n${piece}` : piece;
	}
	if (current.trim()) chunks.push(current.trim());

	return chunks.filter(c => c.length > 20);
}

/**
 * Extrait le texte d'un PDF via PDF.js (import dynamique).
 * Extracts text from a PDF via PDF.js (dynamic import).
 * @param {File} file
 * @returns {Promise<string>}
 */
async function extractPdfText(file) {
	const pdfjs = await import('pdfjs-dist');
	const workerUrl = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
	pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

	const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
	const pages = [];
	for (let i = 1; i <= pdf.numPages; i++) {
		const page = await pdf.getPage(i);
		const content = await page.getTextContent();
		pages.push(content.items.map(item => item.str).join(' '));
	}
	return pages.join('\n\n');
}

/**
 * Extrait le texte d'un fichier supporté (.txt, .md, .pdf).
 * Extracts text from a supported file (.txt, .md, .pdf).
 * @param {File} file
 * @returns {Promise<string>}
 * @throws {Error} Si le type de fichier n'est pas supporté / If the file type is unsupported
 */
export async function extractTextFromFile(file) {
	const name = file.name.toLowerCase();
	if (name.endsWith('.pdf') || file.type === 'application/pdf') {
		return extractPdfText(file);
	}
	if (
		name.endsWith('.txt') ||
		name.endsWith('.md') ||
		name.endsWith('.markdown') ||
		file.type.startsWith('text/')
	) {
		return file.text();
	}
	throw new Error(`Type de fichier non supporté / Unsupported file type: ${file.name}`);
}
