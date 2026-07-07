/**
 * Moteur d'inférence basé sur Transformers.js (ONNX Runtime Web + WebGPU).
 * Inference engine based on Transformers.js (ONNX Runtime Web + WebGPU).
 *
 * Utilisé pour les modèles NON supportés par WebLLM/MLC (ex : Gemma 4),
 * dont l'architecture n'est pas encore reconnue par le runtime TVM/MLC.
 * Used for models NOT supported by WebLLM/MLC (e.g. Gemma 4), whose
 * architecture is not yet recognized by the TVM/MLC runtime.
 *
 * Le module `@huggingface/transformers` est importé dynamiquement afin de
 * ne pas alourdir le bundle principal pour les utilisateurs qui n'emploient
 * que WebLLM.
 * The `@huggingface/transformers` module is imported lazily so it does not
 * bloat the main bundle for users who only use WebLLM.
 */

// Nom du cache navigateur (Cache API) utilisé par Transformers.js pour stocker
// les fichiers de modèle ONNX. Sert à détecter si un modèle est déjà téléchargé.
// Browser Cache API name used by Transformers.js to store ONNX model files.
// Used to detect whether a model is already downloaded.
export const TRANSFORMERS_CACHE_NAME = 'transformers-cache';

// Référence mémoïsée vers la librairie chargée dynamiquement.
// Memoized reference to the lazily loaded library.
let _lib = null;

/**
 * Charge (une seule fois) la librairie Transformers.js.
 * Loads the Transformers.js library (once).
 * @returns {Promise<typeof import('@huggingface/transformers')>}
 */
async function loadLibrary() {
	if (!_lib) {
		_lib = await import('@huggingface/transformers');
	}
	return _lib;
}

/**
 * Vérifie si un modèle Transformers.js est déjà présent dans le cache navigateur.
 * Checks whether a Transformers.js model is already in the browser cache.
 * @param {string} modelId - Ex : "onnx-community/gemma-4-e2b-it-ONNX".
 * @returns {Promise<boolean>}
 */
export async function isTransformersModelCached(modelId) {
	try {
		if (typeof caches === 'undefined') return false;
		const cache = await caches.open(TRANSFORMERS_CACHE_NAME);
		const requests = await cache.keys();
		return requests.some((req) => req.url.includes(modelId));
	} catch (e) {
		return false;
	}
}

/**
 * Supprime tous les fichiers de modèles Transformers.js du cache navigateur.
 * Deletes all Transformers.js model files from the browser cache.
 * @returns {Promise<void>}
 */
export async function clearTransformersCache() {
	try {
		if (typeof caches === 'undefined') return;
		await caches.delete(TRANSFORMERS_CACHE_NAME);
	} catch (e) {
		console.warn('Impossible de vider le cache Transformers.js:', e);
	}
}

/**
 * Certains modèles (ex : la famille Gemma) utilisent un template de chat qui
 * n'accepte pas de rôle "system". On fusionne donc tout message système au
 * début du premier tour utilisateur.
 * Some models (e.g. the Gemma family) use a chat template that does not accept
 * a "system" role. We therefore merge any system message into the beginning of
 * the first user turn.
 *
 * On aplatit également le contenu multimodal éventuel en texte, car ce moteur
 * ne gère pour l'instant que le texte.
 * We also flatten any multimodal content to text, since this engine currently
 * handles text only.
 *
 * @param {Array<{role:string, content:any}>} messages
 * @returns {Array<{role:string, content:string}>}
 */
export function normalizeMessagesForChatTemplate(messages) {
	const flatten = (content) => {
		if (typeof content === 'string') return content;
		if (Array.isArray(content)) {
			return content
				.filter((part) => part && part.type === 'text' && part.text)
				.map((part) => part.text)
				.join('\n');
		}
		return '';
	};

	const normalized = [];
	let pendingSystem = '';

	for (const msg of messages) {
		const text = flatten(msg.content);
		if (msg.role === 'system') {
			pendingSystem = pendingSystem ? `${pendingSystem}\n\n${text}` : text;
			continue;
		}
		if (pendingSystem && msg.role === 'user') {
			normalized.push({ role: 'user', content: `${pendingSystem}\n\n${text}`.trim() });
			pendingSystem = '';
			continue;
		}
		normalized.push({ role: msg.role, content: text });
	}

	// S'il restait un message système sans tour utilisateur associé, on le
	// transforme en un tour utilisateur autonome.
	// If a leftover system message has no following user turn, turn it into a
	// standalone user turn.
	if (pendingSystem) {
		normalized.push({ role: 'user', content: pendingSystem.trim() });
	}

	return normalized;
}

/**
 * Prépare des messages multimodaux pour le template de chat Gemma 4 :
 * - fusionne les messages "system" dans le premier tour utilisateur (le
 *   template Gemma n'accepte pas ce rôle),
 * - remplace chaque partie `image_url` par le placeholder `{type:'image'}`
 *   attendu par le processor, et collecte les URLs dans l'ordre d'apparition
 *   (le processor reçoit les images séparément, appariées à ces placeholders).
 * Prepares multimodal messages for the Gemma 4 chat template:
 * - merges "system" messages into the first user turn (the Gemma template
 *   does not accept that role),
 * - replaces each `image_url` part with the `{type:'image'}` placeholder the
 *   processor expects, collecting URLs in order of appearance (the processor
 *   receives images separately, paired with these placeholders).
 *
 * @param {Array<{role:string, content:any}>} messages
 * @returns {{ messages: Array<{role:string, content:Array}>, imageUrls: string[] }}
 */
export function prepareMultimodalMessages(messages) {
	const imageUrls = [];

	const toParts = (content) => {
		if (typeof content === 'string') return content ? [{ type: 'text', text: content }] : [];
		if (!Array.isArray(content)) return [];
		const parts = [];
		for (const part of content) {
			if (!part) continue;
			if (part.type === 'text' && part.text) {
				parts.push({ type: 'text', text: part.text });
			} else if (part.type === 'image_url' && part.image_url?.url) {
				imageUrls.push(part.image_url.url);
				parts.push({ type: 'image' });
			} else if (part.type === 'image') {
				parts.push({ type: 'image' });
			}
		}
		return parts;
	};

	const textOf = (parts) => parts.filter(p => p.type === 'text').map(p => p.text).join('\n');

	const normalized = [];
	let pendingSystem = '';

	for (const msg of messages) {
		if (msg.role === 'system') {
			const text = textOf(toParts(msg.content));
			pendingSystem = pendingSystem ? `${pendingSystem}\n\n${text}` : text;
			continue;
		}
		const parts = toParts(msg.content);
		if (pendingSystem && msg.role === 'user') {
			const textIdx = parts.findIndex(p => p.type === 'text');
			if (textIdx >= 0) {
				parts[textIdx] = { type: 'text', text: `${pendingSystem}\n\n${parts[textIdx].text}`.trim() };
			} else {
				parts.push({ type: 'text', text: pendingSystem });
			}
			pendingSystem = '';
		}
		normalized.push({ role: msg.role, content: parts });
	}

	if (pendingSystem) {
		normalized.push({ role: 'user', content: [{ type: 'text', text: pendingSystem.trim() }] });
	}

	return { messages: normalized, imageUrls };
}

/**
 * Traduit la progression brute de Transformers.js en texte lisible.
 * Translates raw Transformers.js progress into human-readable text.
 * @param {any} p - Événement de progression / progress event.
 * @returns {string}
 */
function formatProgress(p) {
	if (!p || !p.status) return 'Chargement du modèle... / Loading model...';
	switch (p.status) {
		case 'progress': {
			const pct = typeof p.progress === 'number' ? Math.round(p.progress) : 0;
			const file = p.file ? ` ${p.file}` : '';
			return `Téléchargement${file} — ${pct}%`;
		}
		case 'download':
			return `Téléchargement ${p.file || ''}...`;
		case 'done':
			return `Fichier prêt : ${p.file || ''}`;
		case 'ready':
			return 'Modèle chargé avec succès ! / Model loaded successfully!';
		default:
			return 'Chargement du modèle... / Loading model...';
	}
}

/**
 * Adaptateur exposant une interface minimale et stable au store LLM, quelle
 * que soit l'API interne de Transformers.js.
 * Adapter exposing a minimal, stable interface to the LLM store, regardless of
 * the internal Transformers.js API.
 */
export class TransformersEngine {
	/**
	 * @param {any} backend - Pipeline "text-generation" OU { processor, model } multimodal.
	 * @param {typeof import('@huggingface/transformers')} lib
	 * @param {boolean} multimodal
	 */
	constructor(backend, lib, multimodal = false) {
		this.multimodal = multimodal;
		if (multimodal) {
			this.processor = backend.processor;
			this.model = backend.model;
		} else {
			this.pipe = backend;
		}
		this.lib = lib;
		/** @type {any} Critère d'arrêt interruptible pour la génération courante. */
		this._stopping = null;
	}

	/**
	 * Crée un moteur en chargeant le modèle sur WebGPU.
	 * En mode multimodal (texte+image), charge AutoProcessor +
	 * Gemma4ForConditionalGeneration (encodeur vision inclus) ; sinon un
	 * pipeline "text-generation" classique.
	 * Creates an engine by loading the model on WebGPU. In multimodal mode
	 * (text+image), loads AutoProcessor + Gemma4ForConditionalGeneration
	 * (vision encoder included); otherwise a classic "text-generation" pipeline.
	 * @param {string} modelId
	 * @param {Object} [options]
	 * @param {(progress:{text:string}) => void} [options.progressCallback]
	 * @param {string} [options.dtype='q4'] - Quantification (q4, q4f16, q8, fp16, fp32).
	 * @param {string} [options.device='webgpu']
	 * @param {boolean} [options.multimodal=false]
	 * @returns {Promise<TransformersEngine>}
	 */
	static async create(modelId, { progressCallback, dtype = 'q4', device = 'webgpu', multimodal = false } = {}) {
		const lib = await loadLibrary();
		const progress_callback = (p) => {
			if (progressCallback) progressCallback({ text: formatProgress(p), raw: p });
		};

		if (multimodal) {
			const processor = await lib.AutoProcessor.from_pretrained(modelId, { progress_callback });
			const model = await lib.Gemma4ForConditionalGeneration.from_pretrained(modelId, {
				dtype,
				device,
				progress_callback
			});
			return new TransformersEngine({ processor, model }, lib, true);
		}

		const pipe = await lib.pipeline('text-generation', modelId, {
			device,
			dtype,
			progress_callback
		});
		return new TransformersEngine(pipe, lib);
	}

	/**
	 * Génère une réponse en streaming, en poussant chaque fragment de texte via
	 * `onToken` (même mécanisme de batching rAF que le chemin WebLLM du store).
	 * Streams a response, pushing each text chunk via `onToken` (same rAF batching
	 * mechanism as the store's WebLLM path).
	 *
	 * @param {Array<{role:string, content:any}>} messages
	 * @param {Object} [opts]
	 * @param {(delta:string) => void} [opts.onToken]
	 * @param {number} [opts.temperature=0.7]
	 * @param {number} [opts.max_new_tokens=2048]
	 * @returns {Promise<void>}
	 */
	async generate(messages, { onToken, temperature = 0.7, max_new_tokens = 2048 } = {}) {
		const { TextStreamer, InterruptableStoppingCriteria } = this.lib;
		this._stopping = new InterruptableStoppingCriteria();

		if (this.multimodal) {
			return this._generateMultimodal(messages, { onToken, temperature, max_new_tokens });
		}

		const streamer = new TextStreamer(this.pipe.tokenizer, {
			skip_prompt: true,
			skip_special_tokens: true,
			callback_function: (text) => {
				if (text && onToken) onToken(text);
			}
		});

		const chatMessages = normalizeMessagesForChatTemplate(messages);

		await this.pipe(chatMessages, {
			max_new_tokens,
			do_sample: temperature > 0,
			temperature,
			streamer,
			stopping_criteria: this._stopping
		});
	}

	/**
	 * Génération multimodale (texte + images) via le processor Gemma 4.
	 * Les data URLs des images attachées aux messages sont chargées et
	 * appariées aux placeholders `{type:'image'}` du template.
	 * Multimodal generation (text + images) via the Gemma 4 processor. Data
	 * URLs of images attached to messages are loaded and paired with the
	 * template's `{type:'image'}` placeholders.
	 * @private
	 */
	async _generateMultimodal(messages, { onToken, temperature, max_new_tokens }) {
		const { TextStreamer, load_image } = this.lib;

		const { messages: chatMessages, imageUrls } = prepareMultimodalMessages(messages);

		const prompt = this.processor.apply_chat_template(chatMessages, {
			enable_thinking: false,
			add_generation_prompt: true
		});

		const images = await Promise.all(imageUrls.map((url) => load_image(url)));
		const imageArg = images.length === 0 ? null : images.length === 1 ? images[0] : images;

		const inputs = await this.processor(prompt, imageArg, null, {
			add_special_tokens: false
		});

		const streamer = new TextStreamer(this.processor.tokenizer, {
			skip_prompt: true,
			skip_special_tokens: true,
			callback_function: (text) => {
				if (text && onToken) onToken(text);
			}
		});

		await this.model.generate({
			...inputs,
			max_new_tokens,
			do_sample: temperature > 0,
			temperature,
			streamer,
			stopping_criteria: this._stopping
		});
	}

	/**
	 * Interrompt la génération en cours (équivalent de interruptGenerate côté WebLLM).
	 * Interrupts the ongoing generation (equivalent to WebLLM's interruptGenerate).
	 */
	interrupt() {
		if (this._stopping) this._stopping.interrupt();
	}

	/**
	 * Libère les ressources du moteur (sessions ONNX, buffers GPU).
	 * Releases engine resources (ONNX sessions, GPU buffers).
	 * @returns {Promise<void>}
	 */
	async dispose() {
		try {
			await this.pipe?.dispose?.();
			await this.model?.dispose?.();
		} catch (e) {
			// Non bloquant / Non-blocking.
		}
	}
}
