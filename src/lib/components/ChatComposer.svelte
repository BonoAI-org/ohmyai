<script>
	/**
	 * Zone de saisie : textarea, pièces jointes image pour les modèles
	 * multimodaux, boutons envoyer/arrêter, et actions sous le champ
	 * (effacer la conversation, bascule du mode raisonnement).
	 * Input area: textarea, image attachments for multimodal models,
	 * send/stop buttons, and below-field actions (clear conversation,
	 * thinking-mode toggle).
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import Image from "svelte-material-icons/Image.svelte";
	import Send from "svelte-material-icons/Send.svelte";

	/** @type {{ onsent?: () => void }} */
	let { onsent } = $props();

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

	/**
	 * Supprime une image de la sélection / Remove an image from selection
	 */
	function removeSelectedImage(index) {
		selectedImages = selectedImages.filter((_, i) => i !== index);
	}
</script>

<div
	class="bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-300 dark:border-slate-700"
>
	<div class="flex gap-2 items-end">
		<textarea
			bind:this={textareaEl}
			bind:value={messageInput}
			onkeydown={handleKeydown}
			disabled={llmStore.isLoading || llmStore.isGenerating}
			placeholder={$_("chat.typePlaceholder")}
			rows="3"
			autocomplete="off"
			autocorrect="on"
			autocapitalize="sentences"
			class="flex-1 bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-base"
		></textarea>
		<!-- Bouton d'ajout d'images / Add images button -->
		{#if llmStore.isSelectedModelMultimodal()}
			<button
				onclick={() => imageInputEl && imageInputEl.click()}
				disabled={llmStore.isLoading ||
					llmStore.isGenerating}
				aria-label="Ajouter des images / Add images"
				class="px-3 py-2 bg-slate-200 dark:bg-slate-700/60 hover:bg-slate-300 dark:hover:bg-slate-700 active:bg-slate-400 dark:active:bg-slate-600 text-slate-700 dark:text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end touch-manipulation"
			>
				<Image class="w-5 h-5" />
			</button>
		{/if}
		{#if llmStore.isGenerating}
			<button
				type="button"
				onclick={() => llmStore.stopGeneration()}
				aria-label="Stop"
				class="px-4 sm:px-6 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg font-semibold transition-colors self-end touch-manipulation animate-pulse"
			>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<rect x="6" y="6" width="12" height="12" rx="2" />
				</svg>
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
				class="px-4 sm:px-6 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end touch-manipulation"
			>
				<Send class="w-5 h-5" />
			</button>
		{/if}
	</div>
	{#if llmStore.isSelectedModelMultimodal()}
		<!-- Input fichier caché / Hidden file input -->
		<input
			type="file"
			accept="image/*"
			multiple
			bind:this={imageInputEl}
			onchange={handleImageSelect}
			class="hidden"
		/>

		<!-- Aperçu des images sélectionnées / Selected images preview -->
		{#if selectedImages.length > 0}
			<div class="mt-3 grid grid-cols-3 sm:grid-cols-6 gap-2">
				{#each selectedImages as img, idx}
					<div class="relative group">
						<img
							src={img}
							alt="Pièce jointe / Attachment"
							class="w-full h-20 object-cover rounded border border-slate-700"
						/>
						<button
							onclick={() => removeSelectedImage(idx)}
							class="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
							aria-label="Supprimer l'image / Remove image"
						>
							×
						</button>
					</div>
				{/each}
			</div>
		{/if}
	{/if}
	<!-- Actions sous le champ / Actions below input -->
	<div class="mt-2 flex items-center gap-3">
		{#if llmStore.messages.length > 0}
			<button
				onclick={() => llmStore.clearMessages()}
				class="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
			>
				{$_("chat.clearConversation")}
			</button>
		{/if}

		{#if llmStore.isSelectedModelThinkingCapable()}
			<button
				onclick={() => llmStore.toggleThinking()}
				class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors border {llmStore.thinkingEnabled
					? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-500/30'
					: 'bg-slate-100 dark:bg-slate-700/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-600/50'}"
				title={llmStore.thinkingEnabled ? 'Désactiver le raisonnement' : 'Activer le raisonnement'}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				Think {llmStore.thinkingEnabled ? 'ON' : 'OFF'}
			</button>
		{/if}

		<!-- Ratio de contexte utilisé / Used context ratio -->
		{#if llmStore.contextUsage}
			<div
				class="ml-auto flex items-center gap-2"
				title={`${llmStore.contextUsage.used.toLocaleString()} / ${llmStore.contextUsage.max.toLocaleString()} tokens`}
			>
				<div
					class="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden"
					role="progressbar"
					aria-valuenow={Math.round(llmStore.contextUsage.ratio * 100)}
					aria-valuemin="0"
					aria-valuemax="100"
					aria-label={$_("chat.contextUsed")}
				>
					<div
						class="h-full rounded-full transition-all duration-300 {llmStore.contextUsage.ratio > 0.9
							? 'bg-red-500'
							: llmStore.contextUsage.ratio > 0.7
								? 'bg-amber-500'
								: 'bg-emerald-500'}"
						style="width: {Math.max(llmStore.contextUsage.ratio * 100, 2)}%"
					></div>
				</div>
				<span class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
					{$_("chat.contextUsed")}
					{Math.round(llmStore.contextUsage.ratio * 100)}%
				</span>
			</div>
		{/if}
	</div>
</div>
