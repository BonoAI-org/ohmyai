<script>
	/**
	 * Page de chat. Elle assemble les composants, amorce les stores au montage,
	 * et ne garde que ce qui lui appartient vraiment : le défilement, puisqu'elle
	 * possède l'élément main, et les quelques actions qui traversent plusieurs
	 * composants.
	 * Chat page. It assembles the components, boots the stores on mount, and
	 * keeps only what genuinely belongs to it: scrolling, since it owns the main
	 * element, and the few actions that cross several components.
	 */
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { mcpStore } from "$lib/stores/mcp.svelte.js";
	import { oramaStore } from "$lib/stores/orama.svelte.js";
	import { installPrompt } from "$lib/stores/installPrompt.svelte.js";
	import { hasMinimumRam } from "$lib/llm/hardware.js";
	import { downloadConversationMarkdown } from "$lib/llm/exportMarkdown.js";
	import { toPlainText } from "$lib/rag/plainText.js";
	import AppHeader from "$lib/components/AppHeader.svelte";
	import StatusPanels from "$lib/components/StatusPanels.svelte";
	import MessageList from "$lib/components/MessageList.svelte";
	import WelcomeScreen from "$lib/components/WelcomeScreen.svelte";
	import ScrollToBottomButton from "$lib/components/ScrollToBottomButton.svelte";
	import ChatComposer from "$lib/components/ChatComposer.svelte";
	import AppFooter from "$lib/components/AppFooter.svelte";
	import ManageModelsModal from "$lib/components/ManageModelsModal.svelte";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import KnowledgeBaseModal from "$lib/components/KnowledgeBaseModal.svelte";
	import ConversationHistory from "$lib/components/ConversationHistory.svelte";

	// Référence au composeur, pour y injecter un prompt réutilisé et vider les
	// images au changement de modèle.
	// Composer reference, used to inject a reused prompt and to clear images
	// when the model changes.
	let composerRef = $state(null);

	// Drapeaux des panneaux et modales, partagés avec l'en-tête.
	// Panel and modal flags, shared with the header.
	let isAddModelModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);
	let isHistoryOpen = $state(false);
	let isRagTestOpen = $state(false);

	// Un appareil sous le minimum de RAM reçoit un avertissement, et l'invite
	// d'installation lui reste masquée.
	// A device below the RAM minimum gets a warning, and the install prompt
	// stays hidden from it.
	const hasEnoughRAM = hasMinimumRam();

	// Un seul écran tant que le modèle n'est pas là : ni liste de messages, ni
	// bandeau « Téléchargement requis » par-dessus.
	// A single screen while the model is not here: no message list, and no
	// "Download required" banner on top of it.
	const showWelcome = $derived(
		llmStore.needsDownload && !llmStore.isLoading
	);

	/**
	 * Amorce les stores et le moteur au montage.
	 * Boots the stores and the engine on mount.
	 */
	onMount(() => {
		// Réglages persistés / Persisted settings
		llmStore.loadCustomModels();
		llmStore.loadSelectedModel();
		llmStore.loadHuggingFaceToken();
		llmStore.loadSystemPrompt();
		llmStore.loadUserProfile();
		llmStore.loadGenerationParams();
		llmStore.loadThinkingEnabled();

		// Charge l'historique des conversations / Load conversation history
		llmStore.loadConversationHistory();

		// Charge les serveurs MCP / Load MCP servers
		mcpStore.loadServers();
		if (mcpStore.servers.some((s) => s.enabled)) {
			mcpStore.discoverTools();
		}

		// Initialise le moteur (inclut la vérification WebGPU)
		// Initialize engine (includes the WebGPU check)
		llmStore.initEngine();

		// Écoute les événements d'installation PWA, et retire les écouteurs au
		// démontage.
		// Listens for PWA install events, and drops the listeners on unmount.
		return installPrompt.listen(() => hasEnoughRAM);
	});

	/**
	 * Déclenche l'installation de la PWA / Trigger PWA installation
	 */
	async function handleInstallClick() {
		await installPrompt.prompt();
	}

	/**
	 * Démarre une nouvelle conversation / Start a new conversation
	 */
	async function handleNewConversation() {
		try {
			await llmStore.startNewConversation();
			isHistoryOpen = false;
		} catch (error) {
			console.error("Erreur nouvelle conversation / New conversation error:", error);
		}
	}

	/**
	 * Exporte la conversation en cours au format Markdown / Export current conversation to Markdown
	 */
	function handleExportMarkdown() {
		downloadConversationMarkdown($state.snapshot(llmStore.messages));
	}

	/**
	 * Réutilise un prompt utilisateur / Reuse a user prompt
	 */
	function handleReusePrompt(content) {
		composerRef?.setDraft(content);
	}

	/**
	 * Indexe un message dans la base de connaissances : il devient cherchable et
	 * le modèle pourra s'en resservir dans les prochaines conversations.
	 * Indexes a message into the knowledge base: it becomes searchable and the
	 * model can reuse it in future conversations.
	 */
	async function handleSaveToMemory(content) {
		try {
			await oramaStore.addDocument(toPlainText(content), "saved-message");
		} catch (err) {
			console.error("Error saving note:", err);
		}
	}

	/**
	 * Change le modèle LLM utilisé / Change the LLM model used
	 * @param {string} modelId - ID du nouveau modèle / New model ID
	 */
	async function handleModelChange(modelId) {
		if (modelId === llmStore.selectedModel) return;

		// Confirme le changement de modèle / Confirm model change
		if (llmStore.messages.length > 0) {
			const confirmed = confirm(
				"Changer de modèle effacera la conversation actuelle. Continuer ?\n\n" +
					"Changing model will clear the current conversation. Continue?",
			);
			if (!confirmed) return;
		}

		// Un modèle non multimodal ne peut pas recevoir les images en attente.
		// A non-multimodal model cannot accept the pending images.
		composerRef?.clearImages();
		await llmStore.changeModel(modelId);
	}

	// Référence pour le main scrollable / Reference for scrollable main
	let mainElement;

	// Vrai quand l'utilisateur a remonté la conversation à la main : l'auto-scroll
	// se met alors en retrait pour ne pas lui reprendre le contrôle.
	// True when the user scrolled up by hand: auto-scroll then stands back so it
	// does not take control away from them.
	let isUserScrolling = $state(false);

	/**
	 * Vérifie si l'utilisateur est en bas de la page
	 * Check if user is at bottom of page
	 */
	function isNearBottom() {
		if (!mainElement) return false;
		const threshold = 150; // Seuil en pixels / Threshold in pixels
		const position = mainElement.scrollTop + mainElement.clientHeight;
		const height = mainElement.scrollHeight;
		return position > height - threshold;
	}

	/**
	 * Scroll vers le bas de manière fluide
	 * Scroll to bottom smoothly
	 */
	function scrollToBottom() {
		if (mainElement) {
			mainElement.scrollTo({
				top: mainElement.scrollHeight,
				behavior: "smooth",
			});
		}
	}

	/**
	 * Gère le scroll manuel de l'utilisateur
	 * Handle user manual scroll
	 */
	function handleScroll() {
		if (mainElement) {
			isUserScrolling = !isNearBottom();
		}
	}

	// Auto-scroll quand de nouveaux messages arrivent / Auto-scroll when new messages arrive
	$effect(() => {
		if (llmStore.messages.length > 0 && mainElement) {
			if (!isUserScrolling) {
				// Court délai, le temps que le DOM reflète le nouveau message.
				// Short delay, so the DOM reflects the new message.
				setTimeout(() => {
					if (mainElement) {
						mainElement.scrollTop = mainElement.scrollHeight;
					}
				}, 10);
			}
		}
	});
</script>

<SettingsModal bind:isOpen={isSettingsModalOpen} />
<KnowledgeBaseModal bind:isOpen={isRagTestOpen} />

<div class="h-screen bg-bg-raised flex flex-col overflow-hidden">
	<!-- En-tête, une rangée de 56 px / Header, a single 56 px row -->
	<AppHeader
		onnew={handleNewConversation}
		onmodelselect={handleModelChange}
		bind:isHistoryOpen
		bind:isSettingsModalOpen
		bind:isAddModelModalOpen
	/>

	<!-- Panneau latéral et conversation côte à côte -->
	<!-- Side panel and conversation, side by side -->
	<div class="flex-1 flex min-h-0">
		<ConversationHistory
			bind:isOpen={isHistoryOpen}
			onknowledgebase={() => (isRagTestOpen = true)}
			onmodels={() => (isAddModelModalOpen = true)}
		/>

		<div class="flex-1 min-w-0 flex flex-col">
			<!-- Zone principale / Main area - Scrollable -->
			<main
				bind:this={mainElement}
				onscroll={handleScroll}
				class="flex-1 overflow-y-auto"
			>
				<div class="container mx-auto p-4 max-w-6xl">
					{#if showWelcome}
						<WelcomeScreen
							onmanage={() => (isAddModelModalOpen = true)}
						/>
					{:else}
						<div class="max-w-4xl mx-auto">
							<StatusPanels {hasEnoughRAM} />

							<MessageList
								onreuse={handleReusePrompt}
								onsave={handleSaveToMemory}
								onexport={handleExportMarkdown}
								onsuggestion={handleReusePrompt}
							/>

							{#if isUserScrolling}
								<ScrollToBottomButton
									onclick={() => {
										isUserScrolling = false;
										scrollToBottom();
									}}
								/>
							{/if}
						</div>
					{/if}
				</div>
			</main>

			<!-- Zone d'input / Input area - Fixée en bas / Fixed at bottom -->
			<div class="flex-shrink-0">
				<div class="container mx-auto p-4 max-w-4xl">
					{#if !showWelcome}
						<ChatComposer
							bind:this={composerRef}
							onsent={() => (isUserScrolling = false)}
							onknowledgebase={() => (isRagTestOpen = true)}
						/>
					{/if}
					<AppFooter
						showInstallButton={installPrompt.available}
						{hasEnoughRAM}
						deferredInstall={installPrompt.captured}
						oninstall={handleInstallClick}
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Modals de configuration / Config modals -->
<ManageModelsModal bind:isOpen={isAddModelModalOpen} />
