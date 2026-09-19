import { hasWebLLMModelInCache, createWebLLMEngine } from '$lib/engines/webllm.js';
import { isOpfsSupported, getModelDirectory, saveFileToOpfs, checkModelInOpfs, getFileFromOpfs, deleteModelDirectory, isModelFullyInOpfs } from '$lib/opfs.js';
import { isTransformersModelCached, clearTransformersCache } from '$lib/engines/transformersCache.js';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { mcpStore } from '$lib/stores/mcp.svelte.js';
import { oramaStore } from '$lib/stores/orama.svelte.js';
import { AVAILABLE_MODELS, findModel } from '$lib/llm/models.js';
import { readLocal, writeLocal, removeLocal } from '$lib/llm/storage.js';
import { buildChatContext } from '$lib/llm/chatContext.js';
import { createStreamBatcher } from '$lib/llm/streamBatcher.js';
import { runToolLoop } from '$lib/llm/toolLoop.js';
import {
	generateConversationId,
	generateConversationTitle,
	mergeCustomModels
} from '$lib/llm/conversationMeta.js';
import {
	persistConversation,
	fetchConversation,
	fetchHistory,
	removeConversation,
	renameInDb,
	exportHistoryJson,
	importHistoryJson
} from '$lib/llm/conversationRepo.js';

/**
 * Clés de persistance dans le localStorage. Regroupées ici pour qu'une
 * relecture suffise à voir tout ce que l'application conserve côté client.
 * localStorage persistence keys. Grouped here so a single read shows
 * everything the app keeps on the client side.
 */
const KEYS = {
	selectedModel: 'selectedModel',
	systemPrompt: 'systemPrompt',
	userProfile: 'userProfile',
	generationParams: 'generationParams',
	thinkingEnabled: 'thinkingEnabled',
	huggingFaceToken: 'huggingFaceToken',
	customModels: 'customModels',
	currentConversationId: 'currentConversationId'
};


// Réexporté pour que les composants continuent d'importer le catalogue
// depuis le store, comme avant l'extraction.
// Re-exported so components keep importing the catalog from the store,
// as they did before the extraction.
export { AVAILABLE_MODELS } from '$lib/llm/models.js';

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

	// Indique si le modèle nécessite un téléchargement explicite
	needsDownload = $state(false);

	// Résultat de la vérification matérielle avant téléchargement
	// Result of the hardware check before download
	hardwareCheck = $state(null);

	// Progression du chargement / Loading progress
	loadingProgress = $state('');

	// Modèle sélectionné / Selected model
	selectedModel = $state('onnx-community/gemma-4-e2b-it-ONNX');

	// Type de moteur actif ('webllm' | 'transformers') / Active engine type
	engineType = $state('webllm');

	// Liste des modèles personnalisés ajoutés par l'utilisateur
	// List of custom models added by the user
	customModels = $state([]);

	// Historique des conversations sauvegardées / Saved conversation history
	conversationHistory = $state([]);

	// ID de la conversation actuelle / Current conversation ID
	currentConversationId = $state(null);

	// Modèles actuellement en cache / Currently cached models
	downloadedModels = $state({});

	// Contrôleur d'annulation de la génération / Generation abort controller
	_abortController = null;

	// Erreur éventuelle / Potential error
	error = $state(null);
	huggingFaceToken = $state(null);

	// Règles globales de l'IA (System Prompt) / Global AI rules (System Prompt)
	systemPrompt = $state('');

	// Profil utilisateur accessible aux LLMs / User profile accessible to LLMs
	userProfile = $state({
		name: '',
		role: '',
		expertise: '',
		preferences: '',
		language: ''
	});

	// Mode thinking activé / Thinking mode enabled
	thinkingEnabled = $state(true);

	// Paramètres de génération / Generation parameters
	generationParams = $state({
		temperature: 0.65,
		maxTokens: 512,
		frequencyPenalty: 0.5,
		presencePenalty: 0.5,
	});

	/**
	 * Vérifie si le modèle sélectionné supporte le thinking
	 * Check if selected model supports thinking
	 * @returns {boolean}
	 */
	isSelectedModelThinkingCapable() {
		const model = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);
		return model?.supportsThinking || false;
	}

	/**
	 * Vérifie si WebGPU est disponible / Check if WebGPU is available
	 * @returns {boolean}
	 */
	isWebGPUAvailable() {
		if (typeof navigator === 'undefined') return false;
		return 'gpu' in navigator;
	}

	/**
	 * Estime si la machine peut faire tourner un modèle, avant de le télécharger.
	 * Heuristique : RAM rapportée par le navigateur + limites réelles de
	 * l'adaptateur WebGPU, comparées à la VRAM requise par le modèle.
	 * Estimate whether this machine can run a model, before downloading it.
	 * Heuristic: browser-reported RAM + actual WebGPU adapter limits, compared
	 * to the model's required VRAM.
	 * @param {Object} modelConfig - Entrée de AVAILABLE_MODELS / AVAILABLE_MODELS entry
	 * @returns {Promise<Object>} Résultat stocké dans `this.hardwareCheck`
	 */
	async checkHardwareSupport(modelConfig) {
		const parseGB = (s) => {
			const match = String(s ?? '').match(/([\d.]+)\s*GB/i);
			return match ? parseFloat(match[1]) : null;
		};
		// VRAM déclarée, sinon poids des fichiers + marge d'exécution (KV cache, activations)
		// Declared VRAM, otherwise file weights + runtime margin (KV cache, activations)
		const requiredGB = parseGB(modelConfig?.vram) ?? (parseGB(modelConfig?.size) ?? 0) * 1.25;

		const result = {
			supported: true,
			requiredGB: Math.round(requiredGB * 10) / 10,
			deviceMemoryGB: null,
			gpuMaxBufferGB: null,
		};

		if (typeof navigator !== 'undefined' && navigator.deviceMemory) {
			// Chrome plafonne deviceMemory à 8 : une valeur de 8 veut dire "8 GB ou plus",
			// on ne peut donc conclure à un manque de RAM que sous ce plafond.
			// Chrome caps deviceMemory at 8: a value of 8 means "8 GB or more", so we
			// can only conclude RAM is insufficient below that cap.
			result.deviceMemoryGB = navigator.deviceMemory;
			if (navigator.deviceMemory < 8 && requiredGB > navigator.deviceMemory) {
				result.supported = false;
			}
		}

		try {
			const adapter = await navigator.gpu?.requestAdapter();
			if (adapter) {
				const maxBufferGB = adapter.limits.maxBufferSize / 1024 ** 3;
				result.gpuMaxBufferGB = Math.round(maxBufferGB * 10) / 10;
				// Les poids sont répartis sur plusieurs buffers GPU : on exige que le
				// buffer maximal couvre au moins le quart du modèle, sinon l'adaptateur
				// est trop limité pour cette taille.
				// Weights are split across several GPU buffers: the max buffer must
				// cover at least a quarter of the model, otherwise the adapter is too
				// limited for this size.
				if (requiredGB > 0 && maxBufferGB < requiredGB / 4) {
					result.supported = false;
				}
			} else {
				result.supported = false;
			}
		} catch (_) {
			// Requête adaptateur échouée : on reste permissif, le chargement échouera
			// avec un message clair le cas échéant.
			// Adapter query failed: stay permissive, loading will fail with a clear
			// message if needed.
		}

		this.hardwareCheck = result;
		return result;
	}

	/**
	 * Indique si le modèle sélectionné est multimodal (texte+image)
	 * Indicates if the selected model is multimodal (text+image)
	 * @returns {boolean}
	 */
	isSelectedModelMultimodal() {
		try {
			return !!findModel(this.selectedModel, this.customModels)?.multimodal;
		} catch (_) {
			return false;
		}
	}

	/**
	 * Indique si le modèle sélectionné supporte le function calling (outils MCP)
	 * Indicates if the selected model supports function calling (MCP tools)
	 * @returns {boolean}
	 */
	isSelectedModelToolCapable() {
		try {
			return !!findModel(this.selectedModel, this.customModels)?.supportsTools;
		} catch (_) {
			return false;
		}
	}

	/**
	 * Sauvegarde le modèle sélectionné dans localStorage
	 * Save currently selected model to localStorage
	 */
	saveSelectedModel() {
		writeLocal(KEYS.selectedModel, this.selectedModel);
	}

	/**
	 * Charge le dernier modèle sélectionné depuis localStorage
	 * Load last selected model from localStorage
	 */
	loadSelectedModel() {
		try {
			let saved = readLocal(KEYS.selectedModel);

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

			// Met à jour la liste des modèles téléchargés / Update list of downloaded models
			this.updateModelsCacheStatus();
		} catch (err) {
			console.error('Erreur chargement modèle / Error loading model:', err);
		}
	}

	/**
	 * Met à jour le statut de cache de tous les modèles
	 * Updates the cache status of all models
	 */
	async updateModelsCacheStatus() {
		try {
			const allModels = [...AVAILABLE_MODELS, ...this.customModels];
			for (const model of allModels) {
				try {
					let isCached;
					if (model.engine === 'transformers') {
						// Modèle Transformers.js : cache navigateur (Cache API), pas WebLLM/OPFS.
						// Transformers.js model: browser Cache API, not WebLLM/OPFS.
						isCached = await isTransformersModelCached(model.id);
					} else {
						isCached = await hasWebLLMModelInCache(model.id);
						if (!isCached) {
							isCached = await isModelFullyInOpfs(model.id);
						}
					}
					this.downloadedModels[model.id] = isCached;
				} catch (e) {
					this.downloadedModels[model.id] = false;
				}
			}
		} catch (err) {
			console.error("Erreur mise à jour statut cache:", err);
		}
	}

	/**
	 * Charge le System Prompt (AI Rules) depuis localStorage
	 * Load System Prompt (AI Rules) from localStorage
	 */
	loadSystemPrompt() {
		const saved = readLocal(KEYS.systemPrompt);
		if (saved) {
			this.systemPrompt = saved;
		}
	}

	/**
	 * Charge le profil utilisateur depuis localStorage
	 * Load user profile from localStorage
	 */
	loadUserProfile() {
		const saved = readLocal(KEYS.userProfile, { json: true });
		if (saved) {
			this.userProfile = saved;
		}
	}

	/**
	 * Met à jour et sauvegarde le profil utilisateur
	 * Update and save the user profile
	 * @param {Object} profile - Le profil utilisateur / The user profile
	 */
	updateUserProfile(profile) {
		this.userProfile = { ...profile };
		writeLocal(KEYS.userProfile, this.userProfile, { json: true });
	}

	/**
	 * Charge les paramètres de génération depuis localStorage
	 * Load generation parameters from localStorage
	 */
	loadGenerationParams() {
		const saved = readLocal(KEYS.generationParams, { json: true });
		if (saved) {
			this.generationParams = { ...this.generationParams, ...saved };
		}
	}

	/**
	 * Met à jour et sauvegarde les paramètres de génération
	 * Update and save generation parameters
	 */
	updateGenerationParams(params) {
		this.generationParams = { ...this.generationParams, ...params };
		writeLocal(KEYS.generationParams, this.generationParams, { json: true });
	}

	/**
	 * Charge l'état du thinking depuis localStorage
	 */
	loadThinkingEnabled() {
		const saved = readLocal(KEYS.thinkingEnabled, { json: true });
		if (saved !== null) {
			this.thinkingEnabled = saved;
		}
	}

	/**
	 * Active/désactive le mode thinking
	 */
	toggleThinking() {
		this.thinkingEnabled = !this.thinkingEnabled;
		writeLocal(KEYS.thinkingEnabled, this.thinkingEnabled, { json: true });
	}

	/**
	 * Sauvegarde le System Prompt
	 * @param {string} newPrompt
	 */
	updateSystemPrompt(newPrompt) {
		this.systemPrompt = newPrompt;
		writeLocal(KEYS.systemPrompt, newPrompt);
	}

	/**
	 * Initialise le moteur LLM avec le modèle sélectionné
	 * Initialize the LLM engine with the selected model
	 * @param {boolean} forceDownload - Force le téléchargement si non mis en cache / Force download if not cached
	 */
	async initEngine(forceDownload = false) {
		if (this.engine) return;

		const selectedModelConfig = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);



		// Vérifie WebGPU (requis pour les deux moteurs) / Check WebGPU (required by both engines)
		if (!this.isWebGPUAvailable()) {
			// Utilise la traduction i18n pour le message d'erreur / Use i18n translation for error message
			const t = get(_);
			this.error = t ? t('error.webgpuNotAvailable') : '❌ WebGPU not available';
			console.error('WebGPU not available');
			return;
		}

		// Aiguillage vers le bon moteur / Route to the appropriate engine.
		// Les modèles sans champ `engine` (dont les modèles personnalisés) utilisent WebLLM.
		// Models without an `engine` field (including custom models) use WebLLM.
		const engineKind = selectedModelConfig?.engine || 'webllm';
		if (engineKind === 'transformers') {
			await this._initTransformersEngine(selectedModelConfig, forceDownload);
			return;
		}

		// --- Chemin WebLLM / MLC (inchangé) / WebLLM / MLC path (unchanged) ---
		this.isLoading = true;
		this.error = null;
		this.needsDownload = false;

		try {
			const useOpfs = isOpfsSupported();
			let opfsSuccess = false;
			let modelInOpfs = false;
			let isCached = false;
			let fileList = [];
			const headers = new Headers();
			if (this.huggingFaceToken) {
				headers.append('Authorization', `Bearer ${this.huggingFaceToken}`);
			}

			// 1. Vérification du cache
			if (!forceDownload) {
				const t = get(_);
				this.loadingProgress = t ? t('loading.checkingOpfs') : 'Checking cache...';

				if (useOpfs) {
					try {
						modelInOpfs = await isModelFullyInOpfs(this.selectedModel);
						isCached = modelInOpfs;
					} catch (e) {
						console.warn('Erreur vérification OPFS:', e);
					}
				}

				// Vérifie le Cache API standard de WebLLM
				if (!isCached) {
					try {
						isCached = await hasWebLLMModelInCache(this.selectedModel);
					} catch (e) {
						console.warn('Erreur vérification Cache API:', e);
					}
				}

				// Demande l'approbation de l'utilisateur
				if (!isCached) {
					await this.checkHardwareSupport(
						selectedModelConfig || this.customModels.find(m => m.id === this.selectedModel)
					);
					this.isLoading = false;
					this.needsDownload = true;
					return;
				}
			}

			// Callback pour suivre la progression du téléchargement
			const progressCallback = (progress) => {
				this.loadingProgress = progress.text;
			};

			if (useOpfs) {
				try {
					const t = get(_);

					// Vérifie d'abord si le modèle est déjà complet dans OPFS
					if (forceDownload) {
						modelInOpfs = await isModelFullyInOpfs(this.selectedModel);
					}

					// Si on force le téléchargement et qu'il n'est pas dans OPFS, on a besoin de fileList
					if (forceDownload && !modelInOpfs && fileList.length === 0) {
						const ndarrayCacheUrl = `https://huggingface.co/mlc-ai/${this.selectedModel}/resolve/main/ndarray-cache.json`;
						const response = await fetch(ndarrayCacheUrl, { headers });
						if (response.ok) {
							const ndarrayCache = await response.json();
							fileList = ndarrayCache.records.map(r => r.dataPath);
							modelInOpfs = await checkModelInOpfs(this.selectedModel, fileList);
						}
					}

					if (modelInOpfs) {
						this.loadingProgress = t ? t('loading.loadingFromOpfs') : 'Loading from local storage...';
						this.engine = await createWebLLMEngine(this.selectedModel, {
							initProgressCallback: progressCallback,
							modelCache: { cacheUrl: `/opfs/${this.selectedModel}/` }
						});
					} else {
						this.engine = await createWebLLMEngine(this.selectedModel, {
							initProgressCallback: progressCallback
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
									if (e.name !== 'AbortError') {
										console.warn(`Échec de la sauvegarde du fichier ${fileName} dans OPFS:`, e);
									}
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
			} else {
				// Fallback si OPFS non supporté
				const t = get(_); // Define t here for this block
				this.loadingProgress = t ? t('loading.loadingStandard') : 'Loading model...';
				this.engine = await createWebLLMEngine(this.selectedModel, {
					initProgressCallback: progressCallback
				});
			}

			// Utilise la traduction i18n / Use i18n translation
			const t = get(_);
			this.loadingProgress = t ? t('loading.modelLoaded') : 'Model loaded successfully!';
			console.log('WebLLM engine initialized successfully');

			this.engineType = 'webllm';
			this.isLoading = false;
			this.loadingProgress = '';
			this.needsDownload = false;

			// Le modèle vient d'être chargé/téléchargé, on met à jour le statut
			this.updateModelsCacheStatus(); // Called: updateModelsCacheStatus

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
	 * Initialise le moteur Transformers.js (ONNX Runtime Web) sur WebGPU.
	 * Initialize the Transformers.js engine (ONNX Runtime Web) on WebGPU.
	 *
	 * Le téléchargement des fichiers ONNX est géré par la librairie via la
	 * Cache API du navigateur. On conserve la même UX de confirmation que WebLLM :
	 * si le modèle n'est pas déjà en cache et qu'on ne force pas, on demande
	 * d'abord l'approbation de l'utilisateur (`needsDownload`).
	 * The download of the ONNX files is handled by the library via the browser
	 * Cache API. We keep the same confirmation UX as WebLLM: if the model is not
	 * already cached and download is not forced, we first ask for user approval
	 * (`needsDownload`).
	 *
	 * @param {Object} modelConfig - Configuration du modèle sélectionné / Selected model config.
	 * @param {boolean} forceDownload - Force le téléchargement / Force the download.
	 */
	async _initTransformersEngine(modelConfig, forceDownload = false) {
		this.isLoading = true;
		this.error = null;
		this.needsDownload = false;

		try {
			// 1. Vérification du cache et approbation utilisateur / Cache check and user approval.
			if (!forceDownload) {
				const cached = await isTransformersModelCached(this.selectedModel);
				this.downloadedModels[this.selectedModel] = cached;
				if (!cached) {
					await this.checkHardwareSupport(modelConfig);
					this.isLoading = false;
					this.needsDownload = true;
					return;
				}
			}

			// 2. Import dynamique du moteur (garde le bundle principal léger).
			//    Dynamic import of the engine (keeps the main bundle light).
			const { TransformersEngine } = await import('$lib/engines/transformersEngine.js');

			const t = get(_);
			this.loadingProgress = t ? t('loading.loadingModel') : 'Loading model...';

			this.engine = await TransformersEngine.create(this.selectedModel, {
				dtype: modelConfig?.dtype || 'q4',
				device: 'webgpu',
				multimodal: !!modelConfig?.multimodal,
				progressCallback: (progress) => {
					this.loadingProgress = progress.text;
				}
			});
			this.engineType = 'transformers';

			this.loadingProgress = t ? t('loading.modelLoaded') : 'Model loaded successfully!';
			console.log('Transformers.js engine initialized successfully');

			this.isLoading = false;
			this.loadingProgress = '';
			this.needsDownload = false;
			this.downloadedModels[this.selectedModel] = true;
			this.updateModelsCacheStatus();
		} catch (err) {
			const t = get(_);
			const errorTitle = t ? t('error.title') : 'Error';
			this.error = `❌ ${errorTitle}: ${err.message}`;
			console.error('Erreur chargement Transformers.js / Transformers.js loading error:', err);
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
		if (!this.engine || this.isGenerating) return;

		// Ajoute le message de l'utilisateur / Add user message
		// Note FR/EN: on attache aussi les images (data URLs) pour le rendu et l’historique
		// We also attach images (data URLs) for rendering and history
		const allowImages = this.isSelectedModelMultimodal();
		const images = allowImages && Array.isArray(imageDataUrls) ? imageDataUrls : [];
		this.messages = [...this.messages, { role: 'user', content: userMessage, images }];

		this.isGenerating = true;
		this.error = null;
		this._abortController = new AbortController();

		try {
			// Recherche documentaire locale (RAG), uniquement si l'utilisateur a
			// indexé des documents. La génération ne doit jamais échouer à cause
			// du RAG, d'où le try/catch dédié.
			// Local document search (RAG), only if the user has indexed documents.
			// Generation must never fail because of RAG, hence the dedicated
			// try/catch.
			let ragHits = [];
			try {
				if ((await oramaStore.countDocuments()) > 0) {
					ragHits = await oramaStore.search(userMessage, 4);
				}
			} catch (ragErr) {
				console.warn('RAG search failed:', ragErr);
			}

			// Assemblage du contexte : conversion multimodale, prompt système,
			// mode raisonnement, profil utilisateur, base de connaissances.
			// Context assembly: multimodal conversion, system prompt, thinking
			// mode, user profile, knowledge base.
			const { chatMessages, ragSources } = buildChatContext($state.snapshot(this.messages), {
				systemPrompt: this.systemPrompt,
				userProfile: this.userProfile,
				noThink: this.isSelectedModelThinkingCapable() && !this.thinkingEnabled,
				ragHits
			});

			// Détermine si le modèle supporte les outils / Check if model supports tools
			const useTools = this.isSelectedModelToolCapable() && mcpStore.availableTools.length > 0;
			const toolsParam = useTools ? mcpStore.getToolsForLLM() : undefined;

			// Ajoute un message assistant vide pour la réponse
			// Add an empty assistant message for the response
			let assistantMessageIndex = this.messages.length;
			this.messages = [
				...this.messages,
				{ role: 'assistant', content: '', ...(ragSources.length > 0 ? { sources: ragSources } : {}) }
			];

			// Regroupement des jetons pour ne pas réécrire le tableau réactif à
			// chaque token, ce qui asphyxie le ramasse-miettes en mobile.
			// Token batching so the reactive array is not rewritten on every
			// token, which starves the garbage collector on mobile.
			const batcher = createStreamBatcher((content) => {
				this.messages = this.messages.map((msg, idx) =>
					idx === assistantMessageIndex
						? { ...msg, content: msg.content + content }
						: msg
				);
			});

			if (this.engineType === 'transformers') {
				// --- Génération via Transformers.js / Generation via Transformers.js ---
				await this.engine.generate(chatMessages, {
					temperature: this.generationParams.temperature,
					max_new_tokens: this.generationParams.maxTokens,
					onToken: (delta) => {
						if (this._abortController?.signal.aborted) return;
						batcher.push(delta);
					}
				});
			} else {
				// --- Génération WebLLM, avec allers-retours d'appels d'outils ---
				// --- WebLLM generation, with tool-calling round-trips ---
				await runToolLoop(this.engine, chatMessages, {
					params: {
						temperature: this.generationParams.temperature,
						max_tokens: this.generationParams.maxTokens,
						frequency_penalty: this.generationParams.frequencyPenalty,
						presence_penalty: this.generationParams.presencePenalty
					},
					tools: toolsParam,
					signal: this._abortController?.signal,
					callTool: async (name, args) => {
						const serverId = mcpStore.getServerIdForTool(name);
						if (!serverId) throw new Error(`No server found for tool: ${name}`);
						return mcpStore.callTool(serverId, name, args);
					},
					onDelta: (delta) => batcher.push(delta),
					onToolCalls: (assistantContent, toolCalls) => {
						// Le message assistant est réécrit en entier : on jette le
						// texte partiel encore en attente de poussée.
						// The assistant message is fully rewritten: drop the partial
						// text still waiting to be pushed.
						batcher.discard();
						this.messages = this.messages.map((msg, idx) =>
							idx === assistantMessageIndex
								? {
									...msg,
									content: assistantContent,
									toolCalls: toolCalls.map(tc => ({
										name: tc.function.name,
										arguments: tc.function.arguments,
										status: 'pending'
									}))
								}
								: msg
						);
					},
					onToolResult: (i, { resultStr, hasError }) => {
						this.messages = this.messages.map((msg, idx) => {
							if (idx === assistantMessageIndex && msg.toolCalls) {
								const updatedCalls = [...msg.toolCalls];
								updatedCalls[i] = {
									...updatedCalls[i],
									status: hasError ? 'error' : 'done',
									result: resultStr
								};
								return { ...msg, toolCalls: updatedCalls };
							}
							return msg;
						});
					},
					onRoundEnd: () => {
						// Nouveau message assistant vide : le modèle va commenter
						// les résultats des outils au tour suivant.
						// New empty assistant message: the model will comment on the
						// tool results in the next round.
						assistantMessageIndex = this.messages.length;
						this.messages = [...this.messages, { role: 'assistant', content: '' }];
					}
				});
			}

			// Pousse ce qui reste en attente une fois le flux terminé.
			// Push whatever remains pending once the stream is over.
			batcher.flush();
		} catch (err) {
			if (err.name !== 'AbortError') {
				this.error = err.message;
				console.error('Erreur lors de la génération / Error during generation:', err);
			}
		} finally {
			this.isGenerating = false;
			this._abortController = null;

			// Sauvegarde automatiquement la conversation après chaque échange
			// Automatically save conversation after each exchange
			await this.saveCurrentConversation();
		}
	}

	/**
	 * Arrête la génération en cours / Stop the ongoing generation
	 */
	stopGeneration() {
		if (this._abortController) {
			this._abortController.abort();
		}
		if (!this.engine) return;
		if (this.engineType === 'transformers') {
			this.engine.interrupt?.();
		} else {
			this.engine.interruptGenerate();
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
		removeLocal(KEYS.currentConversationId);
	}

	/**
	 * Change le modèle sélectionné / Change the selected model
	 * @param {string} modelName - Nom du nouveau modèle / New model name
	 */
	async changeModel(modelName) {
		this.selectedModel = modelName;
		this.saveSelectedModel();

		// Libère l'ancien moteur (surtout les ressources GPU de Transformers.js)
		// Release the previous engine (especially Transformers.js GPU resources)
		if (this.engineType === 'transformers' && this.engine?.dispose) {
			try { await this.engine.dispose(); } catch (e) { /* non bloquant */ }
		}

		// Reset engines
		this.engine = null;
		this.engineType = 'webllm';


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
			writeLocal(KEYS.customModels, this.customModels, { json: true });
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
			const saved = readLocal(KEYS.customModels);
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
		const modelConfig = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);

		// Modèle Transformers.js : on vide le cache navigateur dédié, pas WebLLM.
		// Transformers.js model: clear the dedicated browser cache, not WebLLM.
		if (modelConfig?.engine === 'transformers') {
			await clearTransformersCache();
			if (isOpfsSupported()) {
				try { await deleteModelDirectory(this.selectedModel); } catch (e) { /* non bloquant */ }
			}
			console.log('Cache Transformers.js vidé.');
			window.location.reload();
			return;
		}

		if (!this.engine || this.engineType === 'transformers') {
			console.warn('Le moteur doit être initialisé pour vider le cache.');
			// Crée une instance temporaire juste pour le nettoyage
			this.engine = await createWebLLMEngine(this.selectedModel);
			this.engineType = 'webllm';
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
			writeLocal(KEYS.huggingFaceToken, token);
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
			const saved = readLocal(KEYS.huggingFaceToken);
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

		const isExisting = !!this.currentConversationId;
		const conversationId = this.currentConversationId || generateConversationId();

		await persistConversation({
			id: conversationId,
			title: title || this.generateConversationTitle(),
			// Instantané des messages : un proxy réactif ne passe pas dans
			// IndexedDB (DataCloneError).
			// Snapshot of the messages: a reactive proxy cannot cross into
			// IndexedDB (DataCloneError).
			messages: $state.snapshot(this.messages),
			model: this.selectedModel,
			isExisting
		});

		this.currentConversationId = conversationId;
		writeLocal(KEYS.currentConversationId, conversationId);

		// Recharge l'historique / Reload history
		await this.loadConversationHistory();
	}

	/**
	 * Génère un ID unique pour une conversation / Generate unique ID for conversation
	 */
	generateConversationId() {
		return generateConversationId();
	}

	/**
	 * Génère un titre automatique basé sur le premier message
	 * Generate automatic title based on first message
	 */
	generateConversationTitle() {
		return generateConversationTitle(this.messages);
	}

	/**
	 * Charge une conversation depuis l'historique / Load conversation from history
	 * @param {string} conversationId - ID de la conversation / Conversation ID
	 */
	async loadConversation(conversationId) {
		const conversation = await fetchConversation(conversationId);
		if (conversation) {
			this.messages = [...conversation.messages];
			this.currentConversationId = conversationId;
			writeLocal(KEYS.currentConversationId, conversationId);

			// Restaure le modèle utilisé dans la conversation / Restore the model used in the conversation
			if (conversation.model && conversation.model !== this.selectedModel) {
				const allModels = [...AVAILABLE_MODELS, ...this.customModels];
				const modelExists = allModels.some(m => m.id === conversation.model);
				if (modelExists) {
					this.selectedModel = conversation.model;
					this.saveSelectedModel();
					// Réinitialise le moteur pour charger le bon modèle / Reset engine to load the correct model
					this.engine = null;
					await this.initEngine();
				}
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
		removeLocal(KEYS.currentConversationId);
	}

	/**
	 * Supprime une conversation de l'historique / Delete conversation from history
	 * @param {string} conversationId - ID de la conversation / Conversation ID
	 */
	async deleteConversation(conversationId) {
		await removeConversation(conversationId);

		// Si on supprime la conversation actuelle, la réinitialiser
		// If deleting current conversation, reset it
		if (this.currentConversationId === conversationId) {
			this.messages = [];
			this.currentConversationId = null;
			removeLocal(KEYS.currentConversationId);
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
		if (await renameInDb(conversationId, newTitle)) {
			// Recharge l'historique / Reload history
			await this.loadConversationHistory();
		}
	}

	/**
	 * Charge l'historique des conversations depuis Dexie.js
	 * Load conversation history from Dexie.js
	 */
	async loadConversationHistory() {
		try {
			this.conversationHistory = await fetchHistory();

			// Restaure la conversation active si aucune n'est chargée / Restore active conversation if none loaded
			if (this.messages.length === 0) {
				try {
					const activeId = readLocal(KEYS.currentConversationId);
					if (activeId && this.conversationHistory.some(c => c.id === activeId)) {
						await this.loadConversation(activeId);
					}
				} catch (e) { }
			}
		} catch (err) {
			console.error('Erreur lors du chargement de l\'historique / Error loading history:', err);
			this.conversationHistory = [];
		}
	}

	/**
	 * Exporte l'historique complet en JSON / Export full history as JSON
	 */
	async exportHistory() {
		return exportHistoryJson($state.snapshot(this.customModels));
	}

	/**
	 * Importe un historique depuis JSON / Import history from JSON
	 * @param {string} jsonData - Données JSON / JSON data
	 * @param {boolean} merge - Fusionner avec l'existant (true) ou remplacer (false) / Merge with existing (true) or replace (false)
	 */
	async importHistory(jsonData, merge = true) {
		try {
			const { imported, customModels } = await importHistoryJson(jsonData, merge);

			if (customModels) {
				this.customModels = mergeCustomModels(this.customModels, customModels, merge);
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
