import { CreateMLCEngine } from '@mlc-ai/web-llm';
import { db } from '$lib/db/conversationDB.js';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';

/**
 * Liste des modèles disponibles avec leurs caractéristiques
 * List of available models with their characteristics
 */
export const AVAILABLE_MODELS = [
	{
		id: 'Llama-3.2-1B-Instruct-q4f32_1-MLC',
		name: 'Llama 3.2 1B',
		size: '~650 MB',
		description: 'Rapide et léger / Fast and lightweight',
		recommended: true
	},
	{
		id: 'Llama-3.2-3B-Instruct-q4f32_1-MLC',
		name: 'Llama 3.2 3B',
		size: '~1.9 GB',
		description: 'Équilibré, meilleure qualité / Balanced, better quality',
		recommended: false
	},
	{
		id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
		name: 'Phi 3.5 Mini',
		size: '~2.2 GB',
		description: 'Excellent pour le code / Excellent for code',
		recommended: false
	},
	{
		id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
		name: 'Qwen 2.5 1.5B',
		size: '~950 MB',
		description: 'Multilingue / Multilingual',
		recommended: false
	}
];

/**
 * Store Svelte pour gérer l'état du LLM et les interactions
 * Svelte store to manage LLM state and interactions
 */
class LLMStore {
	// État du moteur LLM / LLM engine state
	engine = $state(null);
	
	// Messages de la conversation / Conversation messages
	messages = $state([]);
	
	// Statut du chargement du modèle / Model loading status
	isLoading = $state(false);
	
	// Statut de la génération de texte / Text generation status
	isGenerating = $state(false);
	
	// Progression du chargement / Loading progress
	loadingProgress = $state('');
	
	// Modèle sélectionné / Selected model
	selectedModel = $state('Llama-3.2-1B-Instruct-q4f32_1-MLC');
	
	// Liste des modèles personnalisés ajoutés par l'utilisateur
	// List of custom models added by the user
	customModels = $state([]);
	
	// Historique des conversations sauvegardées / Saved conversation history
	conversationHistory = $state([]);
	
	// ID de la conversation actuelle / Current conversation ID
	currentConversationId = $state(null);
	
	// Erreur éventuelle / Potential error
	error = $state(null);

	/**
	 * Vérifie si WebGPU est disponible / Check if WebGPU is available
	 * @returns {boolean}
	 */
	isWebGPUAvailable() {
		if (typeof navigator === 'undefined') return false;
		return 'gpu' in navigator;
	}

	/**
	 * Initialise le moteur LLM avec le modèle sélectionné
	 * Initialize the LLM engine with the selected model
	 */
	async initEngine() {
		if (this.engine) return; // Déjà initialisé / Already initialized
		
		// Vérifie WebGPU / Check WebGPU
		if (!this.isWebGPUAvailable()) {
			// Utilise la traduction i18n pour le message d'erreur / Use i18n translation for error message
			const t = get(_);
			this.error = t ? t('error.webgpuNotAvailable') : '❌ WebGPU not available';
			console.error('WebGPU not available');
			return;
		}
		
		this.isLoading = true;
		this.error = null;
		
		try {
			// Callback pour suivre la progression du téléchargement
			// Callback to track download progress
			const progressCallback = (progress) => {
				this.loadingProgress = progress.text;
				console.log('Loading progress:', progress.text);
			};

			console.log('Initializing WebLLM with model:', this.selectedModel);

			// Crée le moteur MLCEngine qui exécute le modèle en WASM + WebGPU
			// Create the MLCEngine which runs the model in WASM + WebGPU
			this.engine = await CreateMLCEngine(this.selectedModel, {
				initProgressCallback: progressCallback,
				logLevel: 'INFO' // Ajouter plus de logs pour debugging / Add more logs for debugging
			});
			
			// Utilise la traduction i18n / Use i18n translation
			const t = get(_);
			this.loadingProgress = t ? t('loading.modelLoaded') : 'Model loaded successfully!';
			console.log('WebLLM engine initialized successfully');
		} catch (err) {
			// Utilise la traduction i18n pour le titre d'erreur / Use i18n translation for error title
			const t = get(_);
			const errorTitle = t ? t('error.title') : 'Error';
			this.error = `❌ ${errorTitle}: ${err.message}`;
			console.error('Erreur lors du chargement du modèle / Error loading model:', err);
			console.error('Stack trace:', err.stack);
		} finally {
			this.isLoading = false;
		}
	}

	/**
	 * Envoie un message et génère une réponse
	 * Send a message and generate a response
	 * @param {string} userMessage - Le message de l'utilisateur / The user's message
	 */
	async sendMessage(userMessage) {
		if (!this.engine || this.isGenerating) return;
		
		// Ajoute le message de l'utilisateur / Add user message
		this.messages = [...this.messages, { role: 'user', content: userMessage }];
		
		this.isGenerating = true;
		this.error = null;
		
		try {
			// Prépare le contexte de conversation / Prepare conversation context
			const chatMessages = this.messages.map(msg => ({
				role: msg.role,
				content: msg.content
			}));

			// Ajoute un message assistant vide pour la réponse
			// Add an empty assistant message for the response
			const assistantMessageIndex = this.messages.length;
			this.messages = [...this.messages, { role: 'assistant', content: '' }];

			// Génère la réponse en streaming / Generate response with streaming
			const asyncChunkGenerator = await this.engine.chat.completions.create({
				messages: chatMessages,
				temperature: 0.7,
				max_tokens: 2048, // Limite de tokens pour la réponse / Token limit for response
				stream: true,
			});

			// Traite chaque chunk de la réponse / Process each response chunk
			for await (const chunk of asyncChunkGenerator) {
				const newContent = chunk.choices[0]?.delta?.content || '';
				
				// Met à jour le message assistant avec le nouveau contenu
				// Update assistant message with new content
				this.messages = this.messages.map((msg, idx) => 
					idx === assistantMessageIndex 
						? { ...msg, content: msg.content + newContent }
						: msg
				);
			}
		} catch (err) {
			this.error = err.message;
			console.error('Erreur lors de la génération / Error during generation:', err);
		} finally {
			this.isGenerating = false;
		}
	}

	/**
	 * Réinitialise la conversation / Reset the conversation
	 */
	clearMessages() {
		this.messages = [];
	}

	/**
	 * Change le modèle sélectionné / Change the selected model
	 * @param {string} modelName - Nom du nouveau modèle / New model name
	 */
	async changeModel(modelName) {
		this.selectedModel = modelName;
		this.engine = null; // Force la réinitialisation / Force reinitialization
		this.clearMessages();
		await this.initEngine();
	}

	/**
	 * Ajoute un modèle personnalisé à la liste
	 * Add a custom model to the list
	 * @param {Object} modelConfig - Configuration du modèle personnalisé / Custom model configuration
	 * @param {string} modelConfig.id - ID unique du modèle / Unique model ID
	 * @param {string} modelConfig.name - Nom d'affichage / Display name
	 * @param {string} modelConfig.url - URL du modèle / Model URL
	 * @param {string} modelConfig.size - Taille estimée / Estimated size
	 */
	addCustomModel(modelConfig) {
		// Vérifie si le modèle existe déjà / Check if model already exists
		const exists = this.customModels.some(m => m.id === modelConfig.id);
		if (exists) {
			throw new Error('Un modèle avec cet ID existe déjà / A model with this ID already exists');
		}

		this.customModels = [...this.customModels, {
			...modelConfig,
			recommended: false,
			custom: true
		}];

		// Sauvegarde dans localStorage / Save to localStorage
		this.saveCustomModels();
	}

	/**
	 * Supprime un modèle personnalisé / Remove a custom model
	 * @param {string} modelId - ID du modèle à supprimer / ID of model to remove
	 */
	removeCustomModel(modelId) {
		this.customModels = this.customModels.filter(m => m.id !== modelId);
		this.saveCustomModels();
	}

	/**
	 * Sauvegarde les modèles personnalisés dans localStorage
	 * Save custom models to localStorage
	 */
	saveCustomModels() {
		try {
			localStorage.setItem('customModels', JSON.stringify(this.customModels));
		} catch (err) {
			console.error('Erreur lors de la sauvegarde / Error saving:', err);
		}
	}

	/**
	 * Charge les modèles personnalisés depuis localStorage
	 * Load custom models from localStorage
	 */
	loadCustomModels() {
		try {
			const saved = localStorage.getItem('customModels');
			if (saved) {
				this.customModels = JSON.parse(saved);
			}
		} catch (err) {
			console.error('Erreur lors du chargement / Error loading:', err);
			this.customModels = [];
		}
	}

	/**
	 * Sauvegarde la conversation actuelle / Save current conversation
	 * @param {string} title - Titre optionnel de la conversation / Optional conversation title
	 */
	async saveCurrentConversation(title = null) {
		if (this.messages.length === 0) return;

		const conversationId = this.currentConversationId || this.generateConversationId();
		
		// Génère un titre automatique si non fourni / Generate auto title if not provided
		const conversationTitle = title || this.generateConversationTitle();

		const conversation = {
			id: conversationId,
			title: conversationTitle,
			messages: [...this.messages],
			model: this.selectedModel,
			timestamp: this.currentConversationId ? (await db.getConversation(conversationId))?.timestamp || Date.now() : Date.now(),
			lastModified: Date.now()
		};

		// Sauvegarde dans Dexie / Save to Dexie
		await db.saveConversation(conversation);
		
		this.currentConversationId = conversationId;
		
		// Recharge l'historique / Reload history
		await this.loadConversationHistory();
	}

	/**
	 * Génère un ID unique pour une conversation / Generate unique ID for conversation
	 */
	generateConversationId() {
		return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Génère un titre automatique basé sur le premier message
	 * Generate automatic title based on first message
	 */
	generateConversationTitle() {
		if (this.messages.length === 0) return 'Nouvelle conversation / New conversation';
		
		const firstUserMessage = this.messages.find(m => m.role === 'user');
		if (firstUserMessage) {
			// Prend les 50 premiers caractères / Take first 50 characters
			const title = firstUserMessage.content.substring(0, 50);
			return title.length < firstUserMessage.content.length ? title + '...' : title;
		}
		
		return 'Nouvelle conversation / New conversation';
	}

	/**
	 * Charge une conversation depuis l'historique / Load conversation from history
	 * @param {string} conversationId - ID de la conversation / Conversation ID
	 */
	async loadConversation(conversationId) {
		const conversation = await db.getConversation(conversationId);
		if (conversation) {
			this.messages = [...conversation.messages];
			this.currentConversationId = conversationId;
			
			// Change le modèle si différent / Change model if different
			if (conversation.model !== this.selectedModel) {
				// Note: Ne change pas automatiquement le modèle pour éviter les rechargements
				// Note: Don't automatically change model to avoid reloads
			}
		}
	}

	/**
	 * Démarre une nouvelle conversation / Start new conversation
	 */
	async startNewConversation() {
		// Sauvegarde la conversation actuelle si elle a des messages
		// Save current conversation if it has messages
		if (this.messages.length > 0) {
			await this.saveCurrentConversation();
		}
		
		this.messages = [];
		this.currentConversationId = null;
	}

	/**
	 * Supprime une conversation de l'historique / Delete conversation from history
	 * @param {string} conversationId - ID de la conversation / Conversation ID
	 */
	async deleteConversation(conversationId) {
		// Supprime de Dexie / Delete from Dexie
		await db.deleteConversation(conversationId);
		
		// Si on supprime la conversation actuelle, la réinitialiser
		// If deleting current conversation, reset it
		if (this.currentConversationId === conversationId) {
			this.messages = [];
			this.currentConversationId = null;
		}
		
		// Recharge l'historique / Reload history
		await this.loadConversationHistory();
	}

	/**
	 * Renomme une conversation / Rename a conversation
	 * @param {string} conversationId - ID de la conversation / Conversation ID
	 * @param {string} newTitle - Nouveau titre / New title
	 */
	async renameConversation(conversationId, newTitle) {
		const conversation = await db.getConversation(conversationId);
		if (conversation) {
			conversation.title = newTitle;
			conversation.lastModified = Date.now();
			await db.saveConversation(conversation);
			
			// Recharge l'historique / Reload history
			await this.loadConversationHistory();
		}
	}

	/**
	 * Sauvegarde l'historique des conversations (n'est plus nécessaire avec Dexie)
	 * Save conversation history (no longer needed with Dexie)
	 * @deprecated Utiliser db.saveConversation() directement / Use db.saveConversation() directly
	 */
	saveConversationHistory() {
		// Migration note: Cette méthode n'est plus utilisée avec Dexie.js
		// Migration note: This method is no longer used with Dexie.js
		// Les conversations sont sauvegardées automatiquement via db.saveConversation()
		// Conversations are automatically saved via db.saveConversation()
	}

	/**
	 * Charge l'historique des conversations depuis Dexie.js
	 * Load conversation history from Dexie.js
	 */
	async loadConversationHistory() {
		try {
			// Vérifie s'il faut migrer depuis localStorage / Check if need to migrate from localStorage
			const count = await db.count();
			if (count === 0) {
				// Première utilisation, migre depuis localStorage / First use, migrate from localStorage
				const migrated = await db.migrateFromLocalStorage();
				if (migrated.conversations > 0) {
					console.log(`✅ Migration réussie: ${migrated.conversations} conversations importées`);
				}
			}
			
			// Charge toutes les conversations depuis Dexie / Load all conversations from Dexie
			this.conversationHistory = await db.getAllConversations();
		} catch (err) {
			console.error('Erreur lors du chargement de l\'historique / Error loading history:', err);
			this.conversationHistory = [];
		}
	}

	/**
	 * Exporte l'historique complet en JSON / Export full history as JSON
	 */
	async exportHistory() {
		const data = await db.exportAll();
		// Ajoute les modèles personnalisés / Add custom models
		data.customModels = this.customModels;
		return JSON.stringify(data, null, 2);
	}

	/**
	 * Importe un historique depuis JSON / Import history from JSON
	 * @param {string} jsonData - Données JSON / JSON data
	 * @param {boolean} merge - Fusionner avec l'existant (true) ou remplacer (false) / Merge with existing (true) or replace (false)
	 */
	async importHistory(jsonData, merge = true) {
		try {
			const data = JSON.parse(jsonData);
			
			// Importe dans Dexie / Import to Dexie
			const imported = await db.importData(data, merge);
			
			// Importe les modèles personnalisés / Import custom models
			if (data.customModels) {
				if (merge) {
					// Fusionne les modèles / Merge models
					const existingIds = new Set(this.customModels.map(m => m.id));
					const newModels = data.customModels.filter(m => !existingIds.has(m.id));
					this.customModels = [...this.customModels, ...newModels];
				} else {
					// Remplace les modèles / Replace models
					this.customModels = data.customModels;
				}
				this.saveCustomModels();
			}
			
			// Recharge l'historique / Reload history
			await this.loadConversationHistory();
			
			return imported;
		} catch (err) {
			console.error('Erreur lors de l\'importation / Error importing:', err);
			throw new Error('Format de fichier invalide / Invalid file format');
		}
	}
}

// Exporte une instance unique du store / Export a single store instance
export const llmStore = new LLMStore();
