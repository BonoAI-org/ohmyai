import Dexie from 'dexie';

/**
 * Base de données IndexedDB pour les conversations avec Dexie.js
 * IndexedDB database for conversations using Dexie.js
 */
export class ConversationDB extends Dexie {
	constructor() {
		super('LLMChatDB');
		
		// Définit le schéma de la base de données / Define database schema
		// Version 1: Schema initial / Initial schema
		this.version(1).stores({
			conversations: 'id, title, model, timestamp, lastModified, *tags',
			settings: 'key'
		});
		
		// Références aux tables / Table references
		this.conversations = this.table('conversations');
		this.settings = this.table('settings');
	}
	
	/**
	 * Sauvegarde ou met à jour une conversation / Save or update a conversation
	 * @param {Object} conversation - Objet conversation / Conversation object
	 * @returns {Promise<string>} ID de la conversation / Conversation ID
	 */
	async saveConversation(conversation) {
		return await this.conversations.put(conversation);
	}
	
	/**
	 * Récupère toutes les conversations triées par date / Get all conversations sorted by date
	 * @param {number|null} limit - Nombre max de résultats (null = tous) / Max results (null = all)
	 * @returns {Promise<Array>} Liste des conversations / List of conversations
	 */
	async getAllConversations(limit = null) {
		let query = this.conversations
			.orderBy('lastModified')
			.reverse();
		
		if (limit) {
			query = query.limit(limit);
		}
		
		return await query.toArray();
	}
	
	/**
	 * Charge une conversation par son ID / Load a conversation by ID
	 * @param {string} id - ID de la conversation / Conversation ID
	 * @returns {Promise<Object|undefined>} Conversation ou undefined
	 */
	async getConversation(id) {
		return await this.conversations.get(id);
	}
	
	/**
	 * Supprime une conversation / Delete a conversation
	 * @param {string} id - ID de la conversation / Conversation ID
	 * @returns {Promise<void>}
	 */
	async deleteConversation(id) {
		return await this.conversations.delete(id);
	}
	
	/**
	 * Compte le nombre total de conversations / Count total conversations
	 * @returns {Promise<number>} Nombre de conversations / Number of conversations
	 */
	async count() {
		return await this.conversations.count();
	}
	
	/**
	 * Recherche full-text dans les conversations / Full-text search in conversations
	 * @param {string} query - Texte à rechercher / Text to search
	 * @returns {Promise<Array>} Conversations correspondantes / Matching conversations
	 */
	async searchConversations(query) {
		if (!query || query.trim() === '') {
			return await this.getAllConversations();
		}
		
		const lowerQuery = query.toLowerCase().trim();
		
		return await this.conversations
			.filter(conv => {
				// Recherche dans le titre / Search in title
				const titleMatch = conv.title.toLowerCase().includes(lowerQuery);
				
				// Recherche dans les messages / Search in messages
				const messageMatch = conv.messages.some(msg => 
					msg.content.toLowerCase().includes(lowerQuery)
				);
				
				// Recherche dans les tags si présents / Search in tags if present
				const tagMatch = conv.tags && conv.tags.some(tag =>
					tag.toLowerCase().includes(lowerQuery)
				);
				
				return titleMatch || messageMatch || tagMatch;
			})
			.reverse()
			.sortBy('lastModified');
	}
	
	/**
	 * Filtre les conversations par modèle / Filter conversations by model
	 * @param {string} modelId - ID du modèle / Model ID
	 * @returns {Promise<Array>} Conversations du modèle / Model conversations
	 */
	async getByModel(modelId) {
		return await this.conversations
			.where('model')
			.equals(modelId)
			.reverse()
			.sortBy('lastModified');
	}
	
	/**
	 * Filtre par plage de dates / Filter by date range
	 * @param {number} startDate - Timestamp de début / Start timestamp
	 * @param {number} endDate - Timestamp de fin / End timestamp
	 * @returns {Promise<Array>} Conversations dans la plage / Conversations in range
	 */
	async getByDateRange(startDate, endDate) {
		return await this.conversations
			.where('lastModified')
			.between(startDate, endDate, true, true)
			.reverse()
			.sortBy('lastModified');
	}
	
	/**
	 * Récupère les conversations par tag / Get conversations by tag
	 * @param {string} tag - Tag à filtrer / Tag to filter
	 * @returns {Promise<Array>} Conversations avec le tag / Conversations with tag
	 */
	async getByTag(tag) {
		return await this.conversations
			.where('tags')
			.equals(tag)
			.reverse()
			.sortBy('lastModified');
	}
	
	/**
	 * Pagination des conversations / Paginate conversations
	 * @param {number} page - Numéro de page (commence à 1) / Page number (starts at 1)
	 * @param {number} pageSize - Taille de page / Page size
	 * @returns {Promise<Array>} Conversations de la page / Page conversations
	 */
	async getPage(page = 1, pageSize = 20) {
		return await this.conversations
			.orderBy('lastModified')
			.reverse()
			.offset((page - 1) * pageSize)
			.limit(pageSize)
			.toArray();
	}
	
	/**
	 * Récupère les statistiques de l'historique / Get history statistics
	 * @returns {Promise<Object>} Statistiques / Statistics
	 */
	async getStatistics() {
		const conversations = await this.conversations.toArray();
		
		if (conversations.length === 0) {
			return {
				total: 0,
				totalMessages: 0,
				byModel: {},
				oldestDate: null,
				newestDate: null,
				averageMessagesPerConversation: 0
			};
		}
		
		const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
		
		return {
			total: conversations.length,
			totalMessages,
			byModel: conversations.reduce((acc, c) => {
				acc[c.model] = (acc[c.model] || 0) + 1;
				return acc;
			}, {}),
			oldestDate: Math.min(...conversations.map(c => c.timestamp)),
			newestDate: Math.max(...conversations.map(c => c.lastModified)),
			averageMessagesPerConversation: (totalMessages / conversations.length).toFixed(1)
		};
	}
	
	/**
	 * Exporte toutes les données en JSON / Export all data to JSON
	 * @returns {Promise<Object>} Données complètes / Complete data
	 */
	async exportAll() {
		const conversations = await this.conversations.toArray();
		const settings = await this.settings.toArray();
		
		return {
			conversations,
			settings: settings.reduce((acc, item) => {
				acc[item.key] = item.value;
				return acc;
			}, {}),
			exportDate: new Date().toISOString(),
			version: 1,
			source: 'Ho my AI!'
		};
	}
	
	/**
	 * Importe des données depuis JSON / Import data from JSON
	 * @param {Object} data - Données à importer / Data to import
	 * @param {boolean} merge - Fusionner avec l'existant (true) ou remplacer (false) / Merge with existing (true) or replace (false)
	 * @returns {Promise<Object>} Résumé de l'importation / Import summary
	 */
	async importData(data, merge = true) {
		let imported = { conversations: 0, settings: 0 };
		
		await this.transaction('rw', this.conversations, this.settings, async () => {
			// Efface tout si on ne fusionne pas / Clear all if not merging
			if (!merge) {
				await this.conversations.clear();
				await this.settings.clear();
			}
			
			// Importe les conversations / Import conversations
			if (data.conversations && Array.isArray(data.conversations)) {
				await this.conversations.bulkPut(data.conversations);
				imported.conversations = data.conversations.length;
			}
			
			// Importe les paramètres / Import settings
			if (data.settings) {
				const settingsArray = Object.entries(data.settings).map(([key, value]) => ({
					key,
					value
				}));
				await this.settings.bulkPut(settingsArray);
				imported.settings = settingsArray.length;
			}
		});
		
		return imported;
	}
	
	/**
	 * Nettoie les conversations anciennes / Clean old conversations
	 * @param {number} daysToKeep - Nombre de jours à conserver / Days to keep
	 * @returns {Promise<number>} Nombre de conversations supprimées / Number of deleted conversations
	 */
	async cleanOldConversations(daysToKeep = 90) {
		const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
		
		return await this.conversations
			.where('lastModified')
			.below(cutoffDate)
			.delete();
	}
	
	/**
	 * Vide complètement la base de données / Clear entire database
	 * @returns {Promise<void>}
	 */
	async clearAll() {
		await this.transaction('rw', this.conversations, this.settings, async () => {
			await this.conversations.clear();
			await this.settings.clear();
		});
	}
	
	/**
	 * Sauvegarde un paramètre / Save a setting
	 * @param {string} key - Clé du paramètre / Setting key
	 * @param {any} value - Valeur du paramètre / Setting value
	 * @returns {Promise<string>} Clé sauvegardée / Saved key
	 */
	async saveSetting(key, value) {
		return await this.settings.put({ key, value });
	}
	
	/**
	 * Récupère un paramètre / Get a setting
	 * @param {string} key - Clé du paramètre / Setting key
	 * @returns {Promise<any>} Valeur du paramètre / Setting value
	 */
	async getSetting(key) {
		const setting = await this.settings.get(key);
		return setting ? setting.value : null;
	}
	
	/**
	 * Migre depuis localStorage / Migrate from localStorage
	 * @returns {Promise<Object>} Résumé de la migration / Migration summary
	 */
	async migrateFromLocalStorage() {
		const migrated = { conversations: 0, customModels: 0 };
		
		try {
			// Récupère les conversations de localStorage / Get conversations from localStorage
			const conversationsJson = localStorage.getItem('conversationHistory');
			if (conversationsJson) {
				const conversations = JSON.parse(conversationsJson);
				if (Array.isArray(conversations) && conversations.length > 0) {
					await this.conversations.bulkPut(conversations);
					migrated.conversations = conversations.length;
					console.log(`✅ Migré ${conversations.length} conversations depuis localStorage`);
				}
			}
			
			// Récupère les modèles personnalisés / Get custom models
			const customModelsJson = localStorage.getItem('customModels');
			if (customModelsJson) {
				const customModels = JSON.parse(customModelsJson);
				if (Array.isArray(customModels) && customModels.length > 0) {
					await this.saveSetting('customModels', customModels);
					migrated.customModels = customModels.length;
					console.log(`✅ Migré ${customModels.length} modèles personnalisés depuis localStorage`);
				}
			}
			
			// Ne supprime pas localStorage pour garder une sauvegarde
			// Don't delete localStorage to keep a backup
			
		} catch (err) {
			console.error('❌ Erreur lors de la migration depuis localStorage:', err);
		}
		
		return migrated;
	}
}

// Instance unique partagée / Shared singleton instance
export const db = new ConversationDB();
