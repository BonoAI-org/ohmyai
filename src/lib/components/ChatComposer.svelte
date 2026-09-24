<script>
	/**
	 * Composeur : champ de saisie, rangée d'outils nommés (image, base de
	 * connaissances, raisonnement), bouton d'envoi, et ligne d'aide qui dit
	 * ce que fait le clavier et où vont les données.
	 * Composer: input field, named tool row (image, knowledge base, reasoning),
	 * send button, and a help line stating what the keyboard does and where the
	 * data goes.
	 *
	 * Le champ accepte le dépôt de fichiers : images en pièces jointes,
	 * documents dans la base de connaissances.
	 * The field accepts dropped files: images as attachments, documents into
	 * the knowledge base.
	 */
	import { _ } from "svelte-i18n";
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { oramaStore } from "$lib/stores/orama.svelte.js";
	import { chunkText, extractTextFromFile } from "$lib/rag/ingest.js";

	/** @type {{ onsent?: () => void, onknowledgebase?: () => void }} */
	let { onsent, onknowledgebase = () => {} } = $props();

	// Le composeur annonce qu'il accepte un document : il doit donc en accepter
	// un. Les images rejoignent les pièces jointes, le reste la base de
	// connaissances.
	// The composer says it accepts a document, so it must accept one. Images
	// join the attachments, everything else the knowledge base.
	let isDraggingOver = $state(false);
	let ingestError = $state("");

	const documentCount = $derived(oramaStore.documentCount ?? 0);

	onMount(() => {
		oramaStore.countDocuments();
	});

	let messageInput = $state("");

	// Images en attente d'envoi, en data URL / Images pending send, as data URLs
	let selectedImages = $state([]);

	let imageInputEl = $state(null);
	let textareaEl = $state(null);

	/**
	 * Remplit le champ et y place le focus. Utilisé par la page pour réutiliser
	 * un prompt depuis un message existant.
	 * Fills the field and focuses it. Used by the page to reuse a prompt from
	 * an existing message.
	 * @param {string} text
	 */
	export function setDraft(text) {
		messageInput = text;
		if (textareaEl) textareaEl.focus();
	}

	/**
	 * Vide la sélection d'images. Appelé au changement de modèle, puisqu'un
	 * modèle non multimodal ne peut pas les recevoir.
	 * Clears the image selection. Called on model change, since a
	 * non-multimodal model cannot accept them.
	 */
	export function clearImages() {
		selectedImages = [];
	}

	/**
	 * Gère l'envoi d'un message / Handle sending a message
	 */
	async function handleSend() {
		const allowImages = llmStore.isSelectedModelMultimodal();
		const noText = messageInput.trim().length === 0;
		const noImages = selectedImages.length === 0;
		// Autorise l'envoi sans texte uniquement si modèle multimodal + images / Allow no-text only when multimodal + images
		if ((noText && (!allowImages || noImages)) || llmStore.isGenerating)
			return;

		const message = messageInput.trim();
		messageInput = ""; // Réinitialise l'input / Reset input

		// Capture puis vide la sélection d'images avant la génération, pour que
		// l'aperçu disparaisse dès l'envoi et non à la fin de la réponse.
		// Capture then clear the image selection before generating, so the
		// preview disappears on send rather than when the response finishes.
		const images = allowImages ? [...selectedImages] : [];
		selectedImages = [];

		// Envoi du message avec images si modèle multimodal / Send images only when model is multimodal
		await llmStore.sendMessage(message, images);

		// Laisse la page réactiver l'auto-scroll / Let the page re-enable auto-scroll
		onsent?.();

		// Remet le focus dans le textarea après l'envoi / Refocus textarea after sending
		setTimeout(() => {
			if (textareaEl && !llmStore.isGenerating) {
				textareaEl.focus();
			}
		}, 100);
	}

	/**
	 * Gère l'appui sur Enter pour envoyer / Handle Enter key to send
	 */
	function handleKeydown(event) {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			handleSend();
		}
	}

	/**
	 * Gère les fichiers image sélectionnés / Handle selected image files
	 * @param {FileList|File[]} files - Fichiers images / Image files
	 */
	async function handleImageFiles(files) {
		const list = Array.from(files || []);
		for (const f of list) {
			if (!f.type.startsWith("image/")) continue;
			await new Promise((resolve) => {
				const reader = new FileReader();
				reader.onload = () => {
					selectedImages = [...selectedImages, reader.result];
					resolve();
				};
				reader.onerror = () => resolve();
				reader.readAsDataURL(f);
			});
		}
	}

	/**
	 * Réception de la sélection via input[type=file] / Handle input[type=file] change
	 */
	function handleImageSelect(event) {
		const files = event?.target?.files;
		if (files && files.length > 0) {
			handleImageFiles(files);
			// Réinitialise la valeur de l'input pour permettre la même image à nouveau / reset input value
			event.target.value = "";
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
		isDraggingOver = true;
	}

	function handleDragLeave(event) {
		// Ne relâche qu'en quittant le composeur, pas ses enfants.
		// Only release when leaving the composer, not its children.
		if (!event.currentTarget.contains(event.relatedTarget)) {
			isDraggingOver = false;
		}
	}

	/**
	 * Répartit les fichiers déposés : images en pièces jointes si le modèle
	 * les accepte, documents dans la base de connaissances.
	 * Routes dropped files: images as attachments when the model accepts them,
	 * documents into the knowledge base.
	 */
	async function handleDrop(event) {
		event.preventDefault();
		isDraggingOver = false;
		ingestError = "";

		const files = Array.from(event.dataTransfer?.files ?? []);
		if (files.length === 0) return;

		const images = files.filter((f) => f.type.startsWith("image/"));
		const documents = files.filter((f) => !f.type.startsWith("image/"));

		if (images.length > 0 && llmStore.isSelectedModelMultimodal()) {
			await handleImageFiles(images);
		}

		for (const file of documents) {
			try {
				const chunks = chunkText(await extractTextFromFile(file));
				if (chunks.length === 0) {
					ingestError = $_("chat.drop.empty", {
						values: { name: file.name },
					});
					continue;
				}
				await oramaStore.addChunks(chunks, file.name);
			} catch (err) {
				ingestError = $_("chat.drop.failed", {
					values: { name: file.name, reason: err.message },
				});
			}
		}
	}

	/**
	 * Supprime une image de la sélection / Remove an image from selection
	 */
	function removeSelectedImage(index) {
		selectedImages = selectedImages.filter((_, i) => i !== index);
	}
</script>

<div
	class="relative p-3.5 bg-surface border rounded-card-lg shadow-[0_1px_2px_rgba(20,18,13,0.04)] flex flex-col gap-2.5 transition-colors {isDraggingOver
		? 'border-accent bg-accent-soft/40'
		: 'border-border'}"
	ondragover={handleDragOver}
	ondragleave={handleDragLeave}
	ondrop={handleDrop}
	role="group"
	aria-label={$_("chat.composer")}
>
	<label for="composer-input" class="sr-only">{$_("chat.yourMessage")}</label>
	<textarea
		id="composer-input"
		bind:this={textareaEl}
		bind:value={messageInput}
		onkeydown={handleKeydown}
		disabled={llmStore.isLoading || llmStore.isGenerating}
		placeholder={$_("chat.typePlaceholder")}
		rows="2"
		autocomplete="off"
		autocorrect="on"
		autocapitalize="sentences"
		class="w-full border-0 outline-none bg-transparent resize-none p-0.5 text-[15px] text-ink placeholder:text-ink-3 focus:ring-0 disabled:opacity-50 disabled:cursor-not-allowed"
	></textarea>

	{#if ingestError}
		<p class="px-3 py-2 rounded-control bg-danger-soft text-[13px] text-danger">
			{ingestError}
		</p>
	{/if}

	<!-- Aperçu des images en attente / Pending image previews -->
	{#if selectedImages.length > 0}
		<div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
			{#each selectedImages as img, idx}
				<div class="relative group">
					<img
						src={img}
						alt={$_("chat.attachment")}
						class="w-full h-20 object-cover rounded-control border border-border"
					/>
					<button
						onclick={() => removeSelectedImage(idx)}
						class="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center rounded-full bg-danger text-white opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
						aria-label={$_("chat.removeImage")}
					>
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M6 18 18 6" /><path d="m6 6 12 12" /></svg>
					</button>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Rangée d'outils nommés / Named tool row -->
	<div class="flex items-center gap-2 flex-wrap">
		{#if llmStore.isSelectedModelMultimodal()}
			<button
				type="button"
				onclick={() => imageInputEl && imageInputEl.click()}
				disabled={llmStore.isLoading || llmStore.isGenerating}
				class="hit-44 inline-flex items-center gap-[7px] h-8 px-2.5 border border-border rounded-full bg-surface text-[13px] text-ink hover:bg-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
				<svg class="w-3.5 h-3.5 flex-shrink-0 text-ink-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="m5 18 5-5 4 4 2-2 3 3" /></svg>
				{$_("chat.tools.image")}
			</button>
			<input
				type="file"
				accept="image/*"
				multiple
				bind:this={imageInputEl}
				onchange={handleImageSelect}
				class="hidden"
			/>
		{/if}

		<button
			type="button"
			onclick={onknowledgebase}
			class="hit-44 inline-flex items-center gap-[7px] h-8 px-2.5 rounded-full text-[13px] transition-colors {documentCount >
			0
				? 'border border-accent/30 bg-accent-soft text-accent font-semibold'
				: 'border border-border bg-surface text-ink hover:bg-bg'}"
		>
			<svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" /></svg>
			{documentCount > 0
				? $_("chat.tools.knowledgeBaseCount", {
						values: { count: documentCount },
					})
				: $_("chat.tools.knowledgeBase")}
		</button>

		{#if llmStore.isSelectedModelThinkingCapable()}
			<button
				type="button"
				onclick={() => llmStore.toggleThinking()}
				class="hit-44 inline-flex items-center gap-[7px] h-8 px-2.5 rounded-full text-[13px] transition-colors {llmStore.thinkingEnabled
					? 'border border-accent/30 bg-accent-soft text-accent font-semibold'
					: 'border border-border bg-surface text-ink hover:bg-bg'}"
				aria-pressed={llmStore.thinkingEnabled}
			>
				<svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V18h8v-3.3A7 7 0 0 0 12 2z" /></svg>
				{$_("chat.tools.reasoning")}
			</button>
		{/if}

		{#if llmStore.isGenerating}
			<button
				type="button"
				onclick={() => llmStore.stopGeneration()}
				aria-label={$_("chat.stop")}
				class="ml-auto flex items-center justify-center w-touch h-touch flex-shrink-0 rounded-button bg-danger text-white hover:bg-danger/90 transition-colors touch-manipulation"
			>
				<svg class="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
			</button>
		{:else}
			<button
				type="button"
				onclick={handleSend}
				disabled={llmStore.isLoading ||
					(messageInput.trim().length === 0 &&
						(!llmStore.isSelectedModelMultimodal() ||
							selectedImages.length === 0))}
				aria-label={$_("chat.send")}
				class="ml-auto flex items-center justify-center w-touch h-touch flex-shrink-0 rounded-button bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed transition-colors touch-manipulation"
			>
				<svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V5" /><path d="m6 11 6-6 6 6" /></svg>
			</button>
		{/if}
	</div>
</div>

<!-- Ligne d'aide : ce que fait le clavier, et où vont les données -->
<!-- Help line: what the keyboard does, and where the data goes -->
<div
	class="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-3"
>
	<span>{$_("chat.help.shortcuts")}</span>
	<span>{$_("chat.help.onDevice")}</span>
</div>

{#if llmStore.messages.length > 0}
	<div class="mt-2">
		<button
			onclick={() => llmStore.clearMessages()}
			class="text-[13px] text-ink-3 hover:text-ink-2 transition-colors"
		>
			{$_("chat.clear")}
		</button>
	</div>
{/if}
