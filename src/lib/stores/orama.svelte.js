import { create, insert, search } from '@orama/orama';
import { db } from '$lib/db/conversationDB.js';
import { embedText, EMBEDDING_DIM } from '$lib/engines/embeddingEngine.js';

/**
 * Base de connaissances vectorielle locale (RAG).
 * Local vector knowledge base (RAG).
 *
 * Les embeddings sont calculés par embeddingEngine.js (Transformers.js) et
 * insérés dans un index Orama en mémoire. Chaque document est persisté dans
 * IndexedDB (table `ragDocuments` de Dexie) AVEC son vecteur : au démarrage,
 * l'index est reconstruit depuis IndexedDB sans ré-embedder.
 * Embeddings are computed by embeddingEngine.js (Transformers.js) and
 * inserted into an in-memory Orama index. Each document is persisted to
 * IndexedDB (Dexie `ragDocuments` table) WITH its vector: on startup, the
 * index is rebuilt from IndexedDB without re-embedding.
 *
 * NB : l'ancien @orama/plugin-embeddings a été retiré — sa config ne
 * correspondait pas à son API réelle (basée sur TensorFlow.js USE) et le
 * schéma n'avait pas de champ vecteur, la recherche ne fonctionnait pas.
 * NB: the old @orama/plugin-embeddings was removed — its config did not match
 * its actual API (based on TensorFlow.js USE) and the schema had no vector
 * field, so search never worked.
 */
class OramaStore {
	// Instance Orama volontairement NON réactive : un $state l'envelopperait
	// dans un proxy profond de Svelte qui casse ses structures internes
	// (l'index radix mute des objets dont l'identité doit être stable).
	// Orama instance deliberately NOT reactive: $state would wrap it in a deep
	// Svelte proxy that breaks its internals (the radix index mutates objects
	// whose identity must remain stable).
	_index = null;

	isReady = $state(false);
	isLoading = $state(false);
	status = $state('Not initialized');

	// Nombre de documents indexés (null = pas encore compté)
	// Number of indexed documents (null = not counted yet)
	documentCount = $state(null);

	/**
	 * Compte les documents persistés sans charger le modèle d'embedding.
	 * Permet au chat de savoir si une recherche vaut la peine.
	 * Counts persisted documents without loading the embedding model.
	 * Lets the chat know whether a search is worth doing.
	 * @returns {Promise<number>}
	 */
	async countDocuments() {
		if (this.documentCount === null) {
			try {
				this.documentCount = await db.ragDocuments.count();
			} catch (err) {
				console.error('Erreur comptage documents RAG / RAG document count error:', err);
				this.documentCount = 0;
			}
		}
		return this.documentCount;
	}

	/**
	 * Initialise l'index vectoriel et le reconstruit depuis IndexedDB.
	 * Initialize the vector index and rebuild it from IndexedDB.
	 */
	async init() {
		if (this._index) return;

		this.isLoading = true;
		this.status = 'Initializing...';

		try {
			this._index = await create({
				schema: {
					content: 'string',
					category: 'string',
					embedding: `vector[${EMBEDDING_DIM}]`,
				},
			});

			// Reconstruction depuis les documents persistés (vecteurs déjà calculés)
			// Rebuild from persisted documents (vectors already computed)
			const saved = await db.ragDocuments.toArray();
			for (const doc of saved) {
				await insert(this._index, {
					content: doc.content,
					category: doc.category,
					embedding: doc.embedding,
				});
			}
			this.documentCount = saved.length;

			this.isReady = true;
			this.status = 'Ready';
			console.log(`Orama Vector DB initialized (${saved.length} documents restored)`);
		} catch (err) {
			console.error('Failed to init Orama:', err);
			this.status = 'Error initializing';
			throw err;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Ajoute un document : embedding, indexation, persistance.
	 * Add a document: embedding, indexing, persistence.
	 * @param {string} text - Le contenu texte / Content text
	 * @param {string} category - Catégorie (ex: 'user-memory', 'doc')
	 * @returns {Promise<string>} ID persistant du document / Persistent document ID
	 */
	async addDocument(text, category = 'general') {
		if (!this._index) await this.init();

		this.status = 'Embedding & Indexing...';
		this.isLoading = true;
		try {
			const embedding = await embedText(text, 'passage');

			await insert(this._index, { content: text, category, embedding });

			const id = crypto.randomUUID();
			await db.ragDocuments.put({
				id,
				content: text,
				category,
				embedding,
				createdAt: Date.now(),
			});
			this.documentCount = (this.documentCount ?? 0) + 1;

			this.status = 'Ready';
			console.log(`Indexed document [${id}]: "${text.substring(0, 20)}..."`);
			return id;
		} catch (err) {
			console.error('Error adding document:', err);
			this.status = 'Error indexing';
			throw err;
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Supprime un document persisté puis reconstruit l'index en mémoire.
	 * Delete a persisted document then rebuild the in-memory index.
	 * @param {string} id - ID persistant / Persistent ID
	 */
	async deleteDocument(id) {
		await db.ragDocuments.delete(id);
		this.documentCount = Math.max(0, (this.documentCount ?? 1) - 1);
		// L'index Orama en mémoire ne permet pas de retrouver ce document par
		// notre ID : on le reconstruit depuis IndexedDB (rapide, vecteurs déjà là).
		// The in-memory Orama index can't look this document up by our ID:
		// rebuild it from IndexedDB (fast, vectors already there).
		this._index = null;
		this.isReady = false;
		await this.init();
	}

	/**
	 * Liste les documents persistés (sans les vecteurs).
	 * List persisted documents (without vectors).
	 */
	async listDocuments() {
		const docs = await db.ragDocuments.orderBy('createdAt').reverse().toArray();
		return docs.map(({ id, content, category, createdAt }) => ({ id, content, category, createdAt }));
	}

	/**
	 * Recherche sémantique dans la base de connaissances.
	 * Semantic search in the knowledge base.
	 * @param {string} query - La requête utilisateur / User query
	 * @param {number} limit - Nombre de résultats / Number of results
	 * @param {number} similarity - Seuil de similarité cosinus / Cosine similarity threshold
	 */
	async search(query, limit = 4, similarity = 0.75) {
		if ((await this.countDocuments()) === 0) return [];
		if (!this._index) await this.init();

		this.status = 'Searching...';
		try {
			const vector = await embedText(query, 'query');
			const results = await search(this._index, {
				mode: 'vector',
				vector: { property: 'embedding', value: vector },
				similarity,
				limit,
			});

			this.status = 'Ready';
			return results.hits.map(hit => ({
				id: hit.id,
				score: hit.score,
				content: hit.document.content,
				category: hit.document.category
			}));
		} catch (err) {
			console.error('Search error:', err);
			this.status = 'Error searching';
			return [];
		}
	}
}

export const oramaStore = new OramaStore();
