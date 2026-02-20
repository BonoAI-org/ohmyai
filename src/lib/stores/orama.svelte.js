import { create, insert, search } from '@orama/orama';
import { pluginEmbeddings } from '@orama/plugin-embeddings';

/**
 * Service pour gérer la base de données vectorielle Orama
 * Service to manage Orama vector database
 */
class OramaStore {
    db = $state(null);
    isReady = $state(false);
    isLoading = $state(false);
    status = $state('Not initialized');

    /**
     * Initialise la base de données avec le plugin d'embeddings
     * Initialize database with embeddings plugin
     */
    async init() {
        if (this.db) return;

        this.isLoading = true;
        this.status = 'Initializing Orama...';

        try {
            // Utilisation du modèle 'onnx-all-MiniLM-L6-v2' (standard, efficace, géré par le plugin)
            this.db = await create({
                schema: {
                    content: 'string', // Le texte à indexer / Text to index
                    category: 'string', // Métadonnée optionnelle / Optional metadata
                },
                plugins: [
                    pluginEmbeddings({
                        model: 'gte-small', // Modèle très léger pour le navigateur
                    }),
                ],
            });

            this.isReady = true;
            this.status = 'Ready';
            console.log('Orama Vector DB initialized locally');
        } catch (err) {
            console.error('Failed to init Orama:', err);
            this.status = 'Error initializing';
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * Ajoute un document à la base vectorielle
     * Add a document to the vector database
     * @param {string} text - Le contenu texte / Content text
     * @param {string} category - Catégorie (ex: 'user-memory', 'doc')
     */
    async addDocument(text, category = 'general') {
        if (!this.db) await this.init();

        this.status = 'Embedding & Indexing...';
        try {
            const id = await insert(this.db, {
                content: text,
                category,
            });
            this.status = 'Ready';
            console.log(`Indexed document [${id}]: "${text.substring(0, 20)}..."`);
            return id;
        } catch (err) {
            console.error('Error adding document:', err);
            this.status = 'Error indexing';
            throw err;
        }
    }

    /**
     * Recherche les documents les plus similaires
     * Search for most similar documents
     * @param {string} query - La requête utilisateur / User query
     * @param {number} limit - Nombre de résultats / Number of results
     */
    async search(query, limit = 3) {
        if (!this.db) {
            console.warn('Orama not initialized. Initializing now...');
            await this.init();
        }

        this.status = 'Searching...';
        try {
            const results = await search(this.db, {
                term: query,
                limit: limit,
                mode: 'vector', // Force la recherche vectorielle / Force vector search
                similarity: 0.7, // Seuil de similarité / Similarity threshold
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
