import { CreateMLCEngine, hasModelInCache, prebuiltAppConfig } from '@mlc-ai/web-llm';
import { isOpfsSupported, getModelDirectory, saveFileToOpfs, checkModelInOpfs, getFileFromOpfs, deleteModelDirectory, isModelFullyInOpfs } from '$lib/opfs.js';
import { isTransformersModelCached, clearTransformersCache } from '$lib/engines/transformersEngine.js';
import { db } from '$lib/db/conversationDB.js';
import { get } from 'svelte/store';
import { _ } from 'svelte-i18n';
import { mcpStore } from '$lib/stores/mcp.svelte.js';
import { oramaStore } from '$lib/stores/orama.svelte.js';


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
		// Gemma 4 n'est PAS supporté par WebLLM/MLC (architecture "gemma4" inconnue).
		// On le fait tourner via Transformers.js (ONNX Runtime Web) sur WebGPU.
		// Gemma 4 is NOT supported by WebLLM/MLC (unknown "gemma4" architecture).
		// We run it via Transformers.js (ONNX Runtime Web) on WebGPU.
		id: 'onnx-community/gemma-4-e2b-it-ONNX',
		name: 'Gemma 4 (E2B) — WebGPU',
		size: '~2.4 GB',
		vram: '~4 GB',
		description: 'Google Gemma 4 (variante E2B, texte) via Transformers.js. Expérimental.',
		engine: 'transformers',
		dtype: 'q4',
		experimental: true,
		recommended: true
	},
	{
		// Variante E4B : plus grosse et meilleure que E2B, même architecture.
		// Les Gemma 4 26B/31B n'ont pas de port ONNX navigateur — voir docs/MODELES.md.
		// E4B variant: bigger and better than E2B, same architecture.
		// Gemma 4 26B/31B have no browser ONNX port — see docs/MODELES.md.
		id: 'onnx-community/gemma-4-E4B-it-ONNX',
		name: 'Gemma 4 (E4B) — WebGPU',
		size: '~5 GB',
		vram: '~8 GB',
		description: 'Google Gemma 4 (variante E4B, texte) via Transformers.js. Meilleure qualité que E2B. Expérimental.',
		engine: 'transformers',
		dtype: 'q4f16',
		experimental: true,
		recommended: false
	},
	{
		id: 'Qwen3-4B-q4f16_1-MLC',
		name: 'Qwen 3 (4B) - Reasoning',
		size: '~2.4 GB',
		description: 'Raisonnement avancé avec mode thinking intégré.',
		recommended: true,
		supportsThinking: true
	},
	{
		id: 'Qwen3-8B-q4f16_1-MLC',
		name: 'Qwen 3 (8B) - Reasoning',
		size: '~4.5 GB',
		description: 'Meilleur raisonnement, nécessite ~8 GB de RAM.',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
		name: 'Phi-3 Mini (4k Instruct)',
		size: '~2.2 GB',
		description: 'Excellent pour le code / Excellent for code',
		recommended: false
	},
	{
		id: 'Qwen3-0.6B-q4f16_1-MLC',
		name: 'Qwen 3 (0.6B) - Quantisé',
		size: '~400 MB',
		description: 'Incroyablement léger. Idéal pour être le modèle par défaut ultra-rapide.',
		recommended: true,
		supportsThinking: true
	},
	{
		id: 'Qwen3-0.6B-q0f16-MLC',
		name: 'Qwen 3 (0.6B) - Non Quantisé',
		size: '~2.4 GB',
		description: 'Modèle pur non compressé (plus lourd en RAM).',
		recommended: false,
		supportsThinking: true
	},
	{
		id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
		name: 'Llama 3.2 (1B)',
		size: '~800 MB',
		description: 'Ultra-léger et rapide. Parfait pour les petites configurations.',
		recommended: true
	},
	{
		id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
		name: 'Qwen 2.5 (1.5B)',
		size: '~1 GB',
		description: 'Très performant pour sa taille (code, logique).',
		recommended: true
	},
	{
		id: 'Llama-3-8B-Instruct-q4f16_1-MLC',
		name: 'Llama 3 (8B)',
		vram: '5.2 GB',
		size: '4.4 GB',
		description: 'Modèle Llama populaire et équilibré.',
		recommended: false
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
	{
		id: 'Hermes-2-Pro-Llama-3-8B-q4f16_1-MLC',
		name: 'Hermes 2 Pro Llama 3 (8B)',
		size: '~4.3 GB',
		description: 'Supporte les appels d\'outils (function calling) via MCP.',
		recommended: false,
		supportsTools: true
	},
	{
		id: 'Hermes-3-Llama-3.1-8B-q4f16_1-MLC',
		name: 'Hermes 3 Llama 3.1 (8B)',
		size: '~4.5 GB',
		description: 'Dernier Hermes avec support outils amélioré.',
		recommended: false,
		supportsTools: true
	},
	{
		id: 'Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Instruct',
		size: '~1.8 GB',
		description: 'Modèle Mistral léger, optimisé pour suivre les instructions.',
		recommended: false
	},
	{
		id: 'Ministral-3-3B-Base-2512-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Base',
		size: '~1.8 GB',
		description: 'Modèle Mistral de base, flexible et polyvalent.',
		recommended: false
	},
	{
		id: 'Ministral-3-3B-Reasoning-2512-q4f16_1-MLC',
		name: 'Ministral 3 (3B) - Reasoning',
		size: '~1.8 GB',
		description: 'Modèle Mistral spécialisé en raisonnement logique.',
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
			const standard = AVAILABLE_MODELS.find(m => m.id === this.selectedModel);
			if (standard) return !!standard.multimodal;
			const custom = this.customModels.find(m => m.id === this.selectedModel);
			return !!(custom && custom.multimodal);
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
			const allModels = [...AVAILABLE_MODELS, ...this.customModels];
			const model = allModels.find(m => m.id === this.selectedModel);
			return !!(model && model.supportsTools);
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
			let saved = localStorage.getItem('selectedModel');

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
						isCached = await hasModelInCache(model.id, appConfig);
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
		try {
			const saved = localStorage.getItem('systemPrompt');
			if (saved) {
				this.systemPrompt = saved;
			}
		} catch (err) {
			console.error('Erreur chargement system prompt:', err);
		}
	}

	/**
	 * Charge le profil utilisateur depuis localStorage
	 * Load user profile from localStorage
	 */
	loadUserProfile() {
		try {
			const saved = localStorage.getItem('userProfile');
			if (saved) {
				this.userProfile = JSON.parse(saved);
			}
		} catch (err) {
			console.error('Error loading user profile:', err);
		}
	}

	/**
	 * Met à jour et sauvegarde le profil utilisateur
	 * Update and save the user profile
	 * @param {Object} profile - Le profil utilisateur / The user profile
	 */
	updateUserProfile(profile) {
		this.userProfile = { ...profile };
		try {
			localStorage.setItem('userProfile', JSON.stringify(this.userProfile));
		} catch (err) {
			console.error('Error saving user profile:', err);
		}
	}

	/**
	 * Charge les paramètres de génération depuis localStorage
	 * Load generation parameters from localStorage
	 */
	loadGenerationParams() {
		try {
			const saved = localStorage.getItem('generationParams');
			if (saved) {
				this.generationParams = { ...this.generationParams, ...JSON.parse(saved) };
			}
		} catch (err) {
			console.error('Error loading generation params:', err);
		}
	}

	/**
	 * Met à jour et sauvegarde les paramètres de génération
	 * Update and save generation parameters
	 */
	updateGenerationParams(params) {
		this.generationParams = { ...this.generationParams, ...params };
		try {
			localStorage.setItem('generationParams', JSON.stringify(this.generationParams));
		} catch (err) {
			console.error('Error saving generation params:', err);
		}
	}

	/**
	 * Charge l'état du thinking depuis localStorage
	 */
	loadThinkingEnabled() {
		try {
			const saved = localStorage.getItem('thinkingEnabled');
			if (saved !== null) {
				this.thinkingEnabled = JSON.parse(saved);
			}
		} catch (err) {
			console.error('Error loading thinking state:', err);
		}
	}

	/**
	 * Active/désactive le mode thinking
	 */
	toggleThinking() {
		this.thinkingEnabled = !this.thinkingEnabled;
		try {
			localStorage.setItem('thinkingEnabled', JSON.stringify(this.thinkingEnabled));
		} catch (err) {
			console.error('Error saving thinking state:', err);
		}
	}

	/**
	 * Sauvegarde le System Prompt
	 * @param {string} newPrompt
	 */
	updateSystemPrompt(newPrompt) {
		this.systemPrompt = newPrompt;
		try {
			localStorage.setItem('systemPrompt', newPrompt);
		} catch (err) {
			console.error('Erreur sauvegarde system prompt:', err);
		}
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
						isCached = await hasModelInCache(this.selectedModel, appConfig);
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
		this._abortController = new AbortController();

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

			// System prompt par défaut pour guider les petits modèles / Default system prompt to guide small models
			const defaultSystemPrompt = 'You are a helpful assistant. Keep your answers SHORT: 2-3 sentences max. Never repeat yourself. Never restart your answer. Maximum 3 items in any list. Stop when done.';

			// Injection des règles (System Prompt) au tout début du contexte
			// Injecting the rules (System Prompt) at the very beginning of the context
			let systemContent = (this.systemPrompt && this.systemPrompt.trim().length > 0)
				? this.systemPrompt.trim()
				: defaultSystemPrompt;

			chatMessages.unshift({ role: 'system', content: systemContent });

			// Ajout de /no_think au dernier message utilisateur si thinking désactivé
			// Append /no_think to last user message if thinking is disabled
			if (this.isSelectedModelThinkingCapable() && !this.thinkingEnabled) {
				const lastUserIdx = chatMessages.findLastIndex(m => m.role === 'user');
				if (lastUserIdx !== -1) {
					const msg = chatMessages[lastUserIdx];
					if (typeof msg.content === 'string') {
						chatMessages[lastUserIdx] = { ...msg, content: msg.content + ' /no_think' };
					} else if (Array.isArray(msg.content)) {
						const textPart = msg.content.find(p => p.type === 'text');
						if (textPart) textPart.text += ' /no_think';
					}
				}
			}

			// Injection du profil utilisateur / Inject user profile
			const profileParts = [];
			if (this.userProfile.name) profileParts.push(`Name: ${this.userProfile.name}`);
			if (this.userProfile.role) profileParts.push(`Role: ${this.userProfile.role}`);
			if (this.userProfile.expertise) profileParts.push(`Expertise: ${this.userProfile.expertise}`);
			if (this.userProfile.preferences) profileParts.push(`Preferences: ${this.userProfile.preferences}`);
			if (this.userProfile.language) profileParts.push(`Preferred language: ${this.userProfile.language}`);
			if (profileParts.length > 0) {
				const profileContext = `\n\n[User Profile]\n${profileParts.join('\n')}`;
				// Append to existing system message or create new one
				if (chatMessages.length > 0 && chatMessages[0].role === 'system') {
					chatMessages[0].content += profileContext;
				} else {
					chatMessages.unshift({ role: 'system', content: profileContext });
				}
			}

			// Injection de la base de connaissances (RAG) : recherche sémantique
			// locale, uniquement si l'utilisateur a indexé des documents.
			// Knowledge base injection (RAG): local semantic search, only if the
			// user has indexed documents.
			try {
				if ((await oramaStore.countDocuments()) > 0) {
					const hits = await oramaStore.search(userMessage, 4);
					if (hits.length > 0) {
						const ragContext = `\n\n[Knowledge Base]\nUser-provided information relevant to the question. Use it when applicable:\n${hits.map((h, i) => `${i + 1}. ${h.content}`).join('\n')}`;
						if (chatMessages.length > 0 && chatMessages[0].role === 'system') {
							chatMessages[0].content += ragContext;
						} else {
							chatMessages.unshift({ role: 'system', content: ragContext });
						}
					}
				}
			} catch (ragErr) {
				// La génération ne doit jamais échouer à cause du RAG
				// Generation must never fail because of RAG
				console.warn('RAG search failed:', ragErr);
			}

			// Détermine si le modèle supporte les outils / Check if model supports tools
			const useTools = this.isSelectedModelToolCapable() && mcpStore.availableTools.length > 0;
			const toolsParam = useTools ? mcpStore.getToolsForLLM() : undefined;

			// Ajoute un message assistant vide pour la réponse
			// Add an empty assistant message for the response
			let assistantMessageIndex = this.messages.length;
			this.messages = [...this.messages, { role: 'assistant', content: '' }];

			// Mécanisme de streaming batché partagé par les deux moteurs.
			// Streaming batching mechanism shared by both engines.
			// On mobile, updating the reactive messages array on every single token
			// causes massive GC pressure and can trigger the browser to reload the tab.
			// We batch updates using requestAnimationFrame to reduce reactivity churn.
			let pendingContent = '';
			let rafScheduled = false;

			const flushContent = () => {
				if (pendingContent) {
					const content = pendingContent;
					pendingContent = '';
					this.messages = this.messages.map((msg, idx) =>
						idx === assistantMessageIndex
							? { ...msg, content: msg.content + content }
							: msg
					);
				}
				rafScheduled = false;
			};

			const pushDelta = (delta) => {
				if (!delta) return;
				pendingContent += delta;
				// Schedule a batched UI update via rAF to avoid per-token reactivity
				if (!rafScheduled) {
					rafScheduled = true;
					requestAnimationFrame(flushContent);
				}
			};

			if (this.engineType === 'transformers') {
				// --- Génération via Transformers.js / Generation via Transformers.js ---
				await this.engine.generate(chatMessages, {
					temperature: this.generationParams.temperature,
					max_new_tokens: this.generationParams.maxTokens,
					onToken: (delta) => {
						if (this._abortController?.signal.aborted) return;
						pushDelta(delta);
					}
				});
			} else {
				// --- Génération WebLLM avec boucle de tool-calling (max 5 rounds) ---
				// --- WebLLM generation with tool-calling loop (max 5 rounds) ---
				let continueLoop = true;
				let maxToolRounds = 5;

				while (continueLoop && maxToolRounds > 0) {
					if (this._abortController?.signal.aborted) break;

					const completionParams = {
						messages: chatMessages,
						temperature: this.generationParams.temperature,
						max_tokens: this.generationParams.maxTokens,
						frequency_penalty: this.generationParams.frequencyPenalty,
						presence_penalty: this.generationParams.presencePenalty,
						stream: true,
					};

					if (toolsParam && toolsParam.length > 0) {
						completionParams.tools = toolsParam;
						completionParams.tool_choice = 'auto';
					}

					const asyncChunkGenerator = await this.engine.chat.completions.create(completionParams);

					let assistantContent = '';
					let toolCalls = [];
					let lastFinishReason = null;

					// Traite chaque chunk de la réponse / Process each response chunk
					for await (const chunk of asyncChunkGenerator) {
						if (this._abortController?.signal.aborted) break;

						const choice = chunk.choices[0];
						if (!choice) continue;

						lastFinishReason = choice.finish_reason || lastFinishReason;
						const delta = choice.delta;

						if (delta?.content) {
							assistantContent += delta.content;
							pushDelta(delta.content);
						}

						// Accumule les tool calls depuis les deltas / Accumulate tool calls from deltas
						if (delta?.tool_calls) {
							for (const tc of delta.tool_calls) {
								const idx = tc.index ?? 0;
								if (!toolCalls[idx]) {
									toolCalls[idx] = { id: tc.id || `call_${idx}`, function: { name: '', arguments: '' } };
								}
								if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
								if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
							}
						}
					}

					// Si le LLM a demandé des tool calls (et pas tronqué par max_tokens)
					// If LLM requested tool calls (and not truncated by max_tokens)
					if (lastFinishReason === 'tool_calls' && toolCalls.length > 0) {
						// Le message assistant est réécrit en entier ci-dessous : on jette le batch en attente
						// The assistant message is fully rewritten below: discard the pending batch
						pendingContent = '';

						// Ajoute le message assistant avec tool_calls au contexte
						chatMessages.push({
							role: 'assistant',
							content: assistantContent || null,
							tool_calls: toolCalls.map((tc, i) => ({
								id: tc.id || `call_${i}`,
								type: 'function',
								function: { name: tc.function.name, arguments: tc.function.arguments }
							}))
						});

						// Met à jour l'UI avec les tool calls en cours
						this.messages = this.messages.map((msg, idx) =>
							idx === assistantMessageIndex
								? { ...msg, content: assistantContent, toolCalls: toolCalls.map(tc => ({ name: tc.function.name, arguments: tc.function.arguments, status: 'pending' })) }
								: msg
						);

						// Exécute chaque tool call / Execute each tool call
						for (let i = 0; i < toolCalls.length; i++) {
							const tc = toolCalls[i];
							let result;
							let hasError = false;

							try {
								const args = JSON.parse(tc.function.arguments || '{}');
								const serverId = mcpStore.getServerIdForTool(tc.function.name);
								if (!serverId) throw new Error(`No server found for tool: ${tc.function.name}`);
								result = await mcpStore.callTool(serverId, tc.function.name, args);
							} catch (err) {
								result = { error: err.message };
								hasError = true;
							}

							const resultStr = typeof result === 'string' ? result : JSON.stringify(result);

							// Ajoute le résultat au contexte / Add result to context
							chatMessages.push({
								role: 'tool',
								tool_call_id: tc.id || `call_${i}`,
								content: resultStr
							});

							// Met à jour le statut du tool call dans l'UI
							this.messages = this.messages.map((msg, idx) => {
								if (idx === assistantMessageIndex && msg.toolCalls) {
									const updatedCalls = [...msg.toolCalls];
									updatedCalls[i] = { ...updatedCalls[i], status: hasError ? 'error' : 'done', result: resultStr };
									return { ...msg, toolCalls: updatedCalls };
								}
								return msg;
							});
						}

						// Ajoute un nouveau message assistant vide pour la suite
						assistantMessageIndex = this.messages.length;
						this.messages = [...this.messages, { role: 'assistant', content: '' }];

						maxToolRounds--;
						// La boucle continue pour que le LLM traite les résultats
					} else {
						continueLoop = false;
					}
				}
			}

			// Flush any remaining content after streaming ends
			flushContent();
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
		try { localStorage.removeItem('currentConversationId'); } catch (e) { }
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
			this.engine = await CreateMLCEngine(this.selectedModel, { appConfig, logLevel: 'SILENT' });
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
		try { localStorage.setItem('currentConversationId', conversationId); } catch (e) { }

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
			try { localStorage.setItem('currentConversationId', conversationId); } catch (e) { }

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
		try { localStorage.removeItem('currentConversationId'); } catch (e) { }
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
			try { localStorage.removeItem('currentConversationId'); } catch (e) { }
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

			// Restaure la conversation active si aucune n'est chargée / Restore active conversation if none loaded
			if (this.messages.length === 0) {
				try {
					const activeId = localStorage.getItem('currentConversationId');
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
