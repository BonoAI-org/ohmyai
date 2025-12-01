import { CreateMLCEngine, hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { isOpfsSupported, getModelDirectory, saveFileToOpfs, checkModelInOpfs, getFileFromOpfs, deleteModelDirectory } from '$lib/opfs.js';
import { db } from '$lib/db/conversationDB.js';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';


/**
 * Configuration de l'application avec le modèle Gemma 2 ajouté manuellement
 * App configuration with manually added Gemma 2 model
 */
const appConfig = {
	model_list: [
		...prebuiltAppConfig.model_list,
		{
			"model": "https://huggingface.co/mlc-ai/gemma-2-9b-it-q4f16_1-MLC",
			"model_id": "gemma-2-9b-it-q4f16_1-MLC",
			"model_lib": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0.2.48/Gemma-2-9B-Instruct-q4f16_1-MLC-webgpu.wasm",
			"vram_required_MB": 6103.52,
			"low_resource_required": false,
		},
		{
			"model": "https://huggingface.co/mlc-ai/Phi-3.5-vision-instruct-q4f16_1-MLC",
			"model_id": "Phi-3.5-vision-instruct-q4f16_1-MLC",
			"model_lib": "https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Phi-3.5-vision-instruct-q4f16_1-ctx4k_cs2k-webgpu.wasm",
			"vram_required_MB": 3952.18,
			"low_resource_required": true,
			"overrides": {
				"context_window_size": 4096
			},
			"model_type": 2
		}
	],
	use_web_worker: true
};

/**
 * Liste des modèles disponibles avec leurs caractéristiques
 * List of available models with their characteristics
 */
export const AVAILABLE_MODELS = [
	{
		id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
		name: 'Phi-3 Mini (4k Instruct)',
		size: '~2.2 GB',
		description: 'Excellent pour le code / Excellent for code',
		recommended: true
	},
	{
		id: 'Llama-3-8B-Instruct-q4f16_1-MLC',
		name: 'Llama 3 (8B)',
		vram: '5.2 GB',
		size: '4.4 GB',
		description: 'Modèle Llama populaire et équilibré.',
		recommended: true
	},
	{
		id: 'gemma-2-9b-it-q4f16_1-MLC',
		name: 'Gemma 2 (9B)',
		vram: '6.1 GB',
		size: '5.5 GB',
		description: 'Modèle de Google, nouvelle génération.'
	},
	{
		id: 'Mistral-7B-Instruct-v0.3-q4f16_1-MLC',
		name: 'Mistral 7B Instruct v0.3',
		size: '~3.8 GB',
		description: 'Modèle populaire et performant / Popular and powerful model',
		recommended: false
	},


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
	selectedModel = $state('Phi-3-mini-4k-instruct-q4f16_1-MLC');

	// Liste des modèles personnalisés ajoutés par l'utilisateur
	// List of custom models added by the user
	customModels = $state([]);

	// Historique des conversations sauvegardées / Saved conversation history
	conversationHistory = $state([]);

	// ID de la conversation actuelle / Current conversation ID
	currentConversationId = $state(null);

	// Erreur éventuelle / Potential error
	error = $state(null);
	huggingFaceToken = $state(null);

	/**
	 * Vérifie si WebGPU est disponible / Check if WebGPU is available
	 * @returns {boolean}
	 */
	isWebGPUAvailable() {
		if (typeof navigator === 'undefined') return false;
		return 'gpu' in navigator;
	}

	/**
	 * Indique si le modèle sélectionné est multimodal (texte+image)
	 * Indicates if the selected model is multimodal (text+image)
	 * @returns {boolean}
	 */
	isSelectedModelMultimodal() {
		try {
			const standard = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);
			if (standard) return !!standard.multimodal;
			const custom = this.customModels.find(m => m.id === this.selectedModel);
			return !!(custom && custom.multimodal);
		} catch (_) {
			return false;
		}
	}

	/**
	 * Sauvegarde le modèle sélectionné dans localStorage
	 * Save currently selected model to localStorage
	 */
	saveSelectedModel() {
		try {
			localStorage.setItem('selectedModel', this.selectedModel);
		} catch (err) {
			console.error('Erreur sauvegarde selectedModel / Error saving selectedModel:', err);
		}
	}

	/**
	 * Charge le dernier modèle sélectionné depuis localStorage
	 * Load last selected model from localStorage
	 */
	loadSelectedModel() {
		try {
			const saved = localStorage.getItem('selectedModel');
			const allModels = [...AVAILABLE_MODELS, ...this.customModels];
			const modelExists = allModels.some(m => m.id === saved);

			if (saved && modelExists) {
				this.selectedModel = saved;
			} else {
				if (saved) {
					console.warn(`Modèle sauvegardé "${saved}" non trouvé. Réinitialisation au modèle par défaut.`);
				}
				// Retour au modèle recommandé ou au premier de la liste
				this.selectedModel = AVAILABLE_MODELS.find(m => m.recommended)?.id || AVAILABLE_MODELS[0].id;
				this.saveSelectedModel();
			}
		} catch (err) {
			console.error('Erreur chargement modèle / Error loading model:', err);
		}
	}

	/**
	 * Initialise le moteur LLM avec le modèle sélectionné
	 * Initialize the LLM engine with the selected model
	 */
	async initEngine() {
		if (this.engine) return;

		const selectedModelConfig = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);



		// WebLLM Integration (existing code)
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
				// console.log('Loading progress:', progress.text);
			};

			// console.log('Initializing WebLLM with model:', this.selectedModel);

			// Crée le moteur MLCEngine qui exécute le modèle en WASM + WebGPU
			// Create the MLCEngine which runs the model in WASM + WebGPU

			const useOpfs = isOpfsSupported();
			let opfsSuccess = false;

			if (useOpfs) {
				try {
					const t = get(_);
					this.loadingProgress = t ? t('loading.checkingOpfs') : 'Checking local storage...';

					const ndarrayCacheUrl = `https://huggingface.co/mlc-ai/${this.selectedModel}/resolve/main/ndarray-cache.json`;
					const headers = new Headers();
					if (this.huggingFaceToken) {
						headers.append('Authorization', `Bearer ${this.huggingFaceToken}`);
					}
					const ndarrayCacheResponse = await fetch(ndarrayCacheUrl, { headers });
					if (!ndarrayCacheResponse.ok) throw new Error(`Failed to fetch ndarray-cache for ${this.selectedModel}`);
					const ndarrayCache = await ndarrayCacheResponse.json();
					const fileList = ndarrayCache.records.map(r => r.dataPath);

					const modelInOpfs = await checkModelInOpfs(this.selectedModel, fileList);

					if (modelInOpfs) {
						this.loadingProgress = t ? t('loading.loadingFromOpfs') : 'Loading from local storage...';
						this.engine = await CreateMLCEngine(this.selectedModel, {
							appConfig,
							initProgressCallback: progressCallback,
							logLevel: 'SILENT',
							modelCache: { cacheUrl: `/opfs/${this.selectedModel}/` }
						});
					} else {
						this.engine = await CreateMLCEngine(this.selectedModel, {
							appConfig,
							initProgressCallback: progressCallback,
							logLevel: 'SILENT'
						});

						// Lance la sauvegarde en arrière-plan sans bloquer l'interface
						(async () => {
							console.log('Début de la sauvegarde OPFS en arrière-plan...');
							const modelDir = await getModelDirectory(this.selectedModel);
							for (const fileName of fileList) {
								try {
									const fileUrl = `https://huggingface.co/mlc-ai/${this.selectedModel}/resolve/main/${fileName}`;
									const response = await fetch(fileUrl, { headers });
									if (!response.ok) continue; // Ignore les fichiers qui n'existent pas
									const data = await response.arrayBuffer();
									await saveFileToOpfs(modelDir, fileName, data);
								} catch (e) {
									console.warn(`Échec de la sauvegarde du fichier ${fileName} dans OPFS:`, e);
								}
							}
							console.log('Sauvegarde OPFS en arrière-plan terminée.');
						})();
					}
					opfsSuccess = true;
				} catch (opfsError) {
					console.warn(`OPFS caching failed for ${this.selectedModel}, falling back to standard loading. Error:`, opfsError);
					opfsSuccess = false;
				}
			}

			if (!opfsSuccess) {
				this.engine = await CreateMLCEngine(this.selectedModel, {
					appConfig,
					initProgressCallback: progressCallback,
					logLevel: 'SILENT'
				});
			}

			// Utilise la traduction i18n / Use i18n translation
			const t = get(_);
			this.loadingProgress = t ? t('loading.modelLoaded') : 'Model loaded successfully!';
			console.log('WebLLM engine initialized successfully');
		} catch (err) {
			// Utilise la traduction i18n pour le titre d'erreur / Use i18n translation for error title
			const t = get(_);
			const errorTitle = t ? t('error.title') : 'Error';

			let errorMessage = err.message;
			if (errorMessage === 'ExitStatus' || errorMessage.includes('Cannot find parameter in cache')) {
				errorMessage += ' (Cache mismatch likely. Please clear cache and reload.)';
				// Optionnel : on pourrait appeler this.clearCache() ici, mais attention aux boucles infinies
				// Optional: we could call this.clearCache() here, but beware of infinite loops
			}

			this.error = `❌ ${errorTitle}: ${errorMessage}`;
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
	 * @param {string[]} imageDataUrls - Liste d'URLs d'images / List of image URLs
	 */
	async sendMessage(userMessage, imageDataUrls = []) {
		const selectedModelConfig = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);

		if (!this.engine || this.isGenerating) return;

		// Ajoute le message de l'utilisateur / Add user message
		// Note FR/EN: on attache aussi les images (data URLs) pour le rendu et l’historique
		// We also attach images (data URLs) for rendering and history
		const allowImages = this.isSelectedModelMultimodal();
		const images = allowImages && Array.isArray(imageDataUrls) ? imageDataUrls : [];
		this.messages = [...this.messages, { role: 'user', content: userMessage, images }];

		this.isGenerating = true;
		this.error = null;

		try {
			// Prépare le contexte de conversation / Prepare conversation context
			// FR: Si un message contient des images, on suit le schéma OpenAI: content = [ {type:'text',...}, {type:'image_url',...}, ... ]
			// EN: If a message contains images, follow OpenAI schema: content = [ {type:'text',...}, {type:'image_url',...}, ... ]
			const chatMessages = this.messages.map(msg => {
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

			// Ajoute un message assistant vide pour la réponse
			// Add an empty assistant message for the response
			const assistantMessageIndex = this.messages.length;
			this.messages = [...this.messages, { role: 'assistant', content: '' }];

			// Génère la réponse en streaming / Generate response with streaming
			// Génère la réponse en streaming / Generate response with streaming
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

			// Sauvegarde automatiquement la conversation après chaque échange
			// Automatically save conversation after each exchange
			await this.saveCurrentConversation();
		}
	}

	/**
	 * Réinitialise la conversation / Reset the conversation
	 */
	async clearMessages() {
		// Sauvegarde la conversation actuelle avant d'effacer si elle contient des messages
		// Save current conversation before clearing if it contains messages
		if (this.messages.length > 0) {
			await this.saveCurrentConversation();
		}

		this.messages = [];
		this.currentConversationId = null;
	}

	/**
	 * Change le modèle sélectionné / Change the selected model
	 * @param {string} modelName - Nom du nouveau modèle / New model name
	 */
	async changeModel(modelName) {
		this.selectedModel = modelName;
		this.saveSelectedModel();

		// Reset engines
		this.engine = null;


		await this.clearMessages();
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
	 * Vide le cache de tous les modèles WebLLM.
	 * Clear the cache of all WebLLM models.
	 */
	async clearCache() {
		if (!this.engine) {
			console.warn('Le moteur doit être initialisé pour vider le cache.');
			// Crée une instance temporaire juste pour le nettoyage
			this.engine = await CreateMLCEngine(this.selectedModel, { appConfig, logLevel: 'SILENT' });
		}
		await this.engine.runtime.clear();

		// Supprime aussi le cache OPFS manuel / Also delete manual OPFS cache
		if (isOpfsSupported()) {
			await deleteModelDirectory(this.selectedModel);
		}

		console.log('Cache WebLLM vidé.');
		// Force le rechargement de la page pour repartir sur une base saine
		window.location.reload();
	}

	/**
	 * Annule le chargement en cours du modèle.
	 * Cancel the ongoing model loading.
	 */
	async cancelLoading() {
		console.log('Annulation du chargement demandée. Envoi du message au Service Worker...');

		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'ABORT_DOWNLOADS' });
		}

		// Réinitialise l'état de l'application
		this.isLoading = false;
		this.loadingProgress = '';
		this.error = 'Le chargement a été annulé. Les caches sont en cours de nettoyage. Veuillez recharger la page dans quelques instants.';

		// Un rechargement est toujours une bonne idée pour s'assurer que tout est propre
		setTimeout(() => window.location.reload(), 500);
	}

	/**
	 * Sauvegarde le token Hugging Face dans le store et le localStorage.
	 * Save the Hugging Face token to the store and localStorage.
	 * @param {string} token - Le token d'accès / The access token.
	 */
	setHuggingFaceToken(token) {
		console.log('Setting HF token:', token ? 'Token provided' : 'No token');
		this.huggingFaceToken = token;
		try {
			localStorage.setItem('huggingFaceToken', token);
		} catch (err) {
			console.error('Erreur sauvegarde huggingFaceToken / Error saving huggingFaceToken:', err);
		}
	}

	/**
	 * Charge le token Hugging Face depuis le localStorage.
	 * Load the Hugging Face token from localStorage.
	 */
	loadHuggingFaceToken() {
		try {
			const saved = localStorage.getItem('huggingFaceToken');
			console.log('Loading HF token from storage:', saved ? 'Found' : 'Not found');
			if (saved && typeof saved === 'string' && saved.length > 0) {
				this.huggingFaceToken = saved;
			}
		} catch (err) {
			console.error('Erreur chargement huggingFaceToken / Error loading huggingFaceToken:', err);
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

		// Sérialise les messages pour éviter les erreurs DataCloneError avec les proxies Svelte
		// Serialize messages to avoid DataCloneError with Svelte proxies
		const serializedMessages = $state.snapshot(this.messages);

		const conversation = {
			id: conversationId,
			title: conversationTitle,
			messages: serializedMessages, // Correction: Utilise les messages sérialisés
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

		// Réinitialise complètement l'état / Completely reset state
		this.messages = [];
		this.currentConversationId = null;
		this.error = null;
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
