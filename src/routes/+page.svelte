<script>
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import ManageModelsModal from "$lib/components/ManageModelsModal.svelte";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import KnowledgeBaseModal from "$lib/components/KnowledgeBaseModal.svelte";
	import ConversationHistory from "$lib/components/ConversationHistory.svelte";
  import AppFooter from "$lib/components/AppFooter.svelte";
  import StatusPanels from "$lib/components/StatusPanels.svelte";
  import MessageList from "$lib/components/MessageList.svelte";
  import ScrollToBottomButton from "$lib/components/ScrollToBottomButton.svelte";
	import { _ } from "svelte-i18n";
	import { mcpStore } from "$lib/stores/mcp.svelte.js";
	import { oramaStore } from "$lib/stores/orama.svelte.js";
	import { marked } from "marked";
	import ChatComposer from "$lib/components/ChatComposer.svelte";
	import AppHeader from "$lib/components/AppHeader.svelte";

	// Référence au composeur, pour y injecter un prompt réutilisé et vider les
	// images au changement de modèle.
	// Composer reference, used to inject a reused prompt and to clear images
	// when the model changes.
	let composerRef = $state(null);



	// État du modal d'ajout de modèle / Add model modal state
	let isAddModelModalOpen = $state(false);
	let isSettingsModalOpen = $state(false);

	// État du panneau d'historique / History panel state
	let isHistoryOpen = $state(false);
	let isRagTestOpen = $state(false);

	// Prompt d'installation PWA / PWA install prompt
	let deferredInstallPrompt = $state(null);
	let showInstallButton = $state(false);

	// Vérifie la RAM disponible / Check available RAM
	let hasEnoughRAM = $state(true);
	const MIN_RAM_GB = 4;

	/**
	 * Vérifie si l'appareil a suffisamment de RAM
	 * Check if device has enough RAM
	 */
	function checkRAM() {
		if (typeof navigator === "undefined") return true;

		// API Device Memory (Chrome, Edge)
		// Returns RAM en Go / Returns RAM in GB
		if ("deviceMemory" in navigator) {
			const deviceMemory = navigator.deviceMemory;
			console.log(`💾 RAM détectée: ${deviceMemory} GB`);

			if (deviceMemory < MIN_RAM_GB) {
				hasEnoughRAM = false;
				console.warn(
					`⚠️ RAM insuffisante: ${deviceMemory} GB (minimum ${MIN_RAM_GB} GB requis)`,
				);
				return false;
			}
		} else {
			// API non disponible, on assume que c'est OK
			// API not available, assume it's OK
			console.log(
				"ℹ️ Device Memory API non disponible, installation autorisée",
			);
		}

		hasEnoughRAM = true;
		return true;
	}

	/**
	 * Initialise le moteur LLM au montage du composant
	 * Initialize LLM engine when component mounts
	 */
	onMount(() => {
		// Charge les modèles personnalisés sauvegardés / Load saved custom models
		llmStore.loadCustomModels();

		// Charge le dernier modèle sélectionné / Load last selected model
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
		if (mcpStore.servers.some(s => s.enabled)) {
			mcpStore.discoverTools();
		}

		// Vérifie la RAM disponible / Check available RAM
		checkRAM();

		// Initialise le moteur (inclut la vérification WebGPU) / Initialize engine (includes WebGPU check)
		llmStore.initEngine();

		// Écoute l'événement d'installation PWA / Listen for PWA install event
		window.addEventListener("beforeinstallprompt", (event) => {
			event.preventDefault();
			deferredInstallPrompt = event;

			// N'affiche le bouton que si la RAM est suffisante
			// Only show button if RAM is sufficient
			if (hasEnoughRAM) {
				showInstallButton = true;
				console.log("📱 PWA installable, bouton activé");
			} else {
				console.log(
					"⚠️ PWA installable mais RAM insuffisante, bouton masqué",
				);
			}
		});

		// Cache le bouton si l'app est installée / Hide button if app is installed
		window.addEventListener("appinstalled", () => {
			showInstallButton = false;
			deferredInstallPrompt = null;
			console.log("✅ PWA installée");
		});
	});

	/**
	 * Déclenche l'installation de la PWA / Trigger PWA installation
	 */
	async function handleInstallClick() {
		if (!deferredInstallPrompt) {
			console.log("⚠️ Prompt d'installation non disponible");
			return;
		}

		// Affiche le prompt d'installation / Show install prompt
		deferredInstallPrompt.prompt();

		// Attend le choix de l'utilisateur / Wait for user choice
		const { outcome } = await deferredInstallPrompt.userChoice;
		console.log("👤 Choix utilisateur:", outcome);

		// Reset
		deferredInstallPrompt = null;
		showInstallButton = false;
	}

	/**
	 * Démarre une nouvelle conversation / Start a new conversation
	 */
	async function handleNewConversation() {
		console.log("🔵 handleNewConversation - Début");
		try {
			await llmStore.startNewConversation();
			isHistoryOpen = false;
			console.log("✅ handleNewConversation - Succès");
		} catch (error) {
			console.error("❌ handleNewConversation - Erreur:", error);
		}
	}

	/**
	 * Exporte la conversation en cours au format Markdown / Export current conversation to Markdown
	 */
	function handleExportMarkdown() {
		if (!llmStore.messages || llmStore.messages.length === 0) return;

		let mdContent = `# Oh my AI! - Export de Conversation / Conversation Export\n\n`;
		const dateStr = new Date().toLocaleString();
		mdContent += `*Date : ${dateStr}*\n\n---\n\n`;

		llmStore.messages.forEach((msg) => {
			const role =
				msg.role === "user" ? "👤 **Vous / You**" : "🤖 **IA / AI**";
			mdContent += `### ${role}\n\n${msg.content}\n\n---\n\n`;
		});

		const blob = new Blob([mdContent], {
			type: "text/markdown;charset=utf-8;",
		});
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;

		const dateForFilename = new Date().toISOString().split("T")[0];
		const timeForFilename =
			new Date().toTimeString().split(":")[0] +
			"-" +
			new Date().toTimeString().split(":")[1];
		link.download = `conversation-${dateForFilename}_${timeForFilename}.md`;

		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}


	/**
	 * Réutilise un prompt utilisateur / Reuse a user prompt
	 */
	function handleReusePrompt(content) {
		composerRef?.setDraft(content);
	}

	/**
	 * Sauvegarde un message en mémoire locale / Save a message to local memory
	 */
	/**
	 * Convertit un message assistant en texte brut pour l'indexation :
	 * sans bloc de réflexion ni marquage Markdown, qui polluent la note
	 * et les embeddings.
	 * Converts an assistant message to plain text for indexing: without
	 * thinking block or Markdown markup, which pollute the note and the
	 * embeddings.
	 */
	function toPlainText(content) {
		const withoutThinking = content
			.replace(/^<think>[\s\S]*?(<\/think>|$)/, "")
			.replace(/^\[THINK\][\s\S]*?(\[\/THINK\]|$)/, "")
			.trim();
		const html = marked.parse(withoutThinking);
		return new DOMParser()
			.parseFromString(html, "text/html")
			.body.textContent.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	async function handleSaveToMemory(content) {
		try {
			// Indexe le message dans la base de connaissances : il devient
			// cherchable et le modèle pourra s'en resservir dans les
			// prochaines conversations.
			// Indexes the message into the knowledge base: it becomes
			// searchable and the model can reuse it in future conversations.
			await oramaStore.addDocument(toPlainText(content), 'saved-message');
		} catch (err) {
			console.error('Error saving note:', err);
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

		// Réinitialise les images sélectionnées si on change de modèle
		// Reset selected images when changing model
		composerRef?.clearImages();
		await llmStore.changeModel(modelId);
	}

	// Référence pour le main scrollable / Reference for scrollable main
	let mainElement;

	// Variable pour suivre si l'utilisateur a scrollé manuellement
	// Variable to track if user manually scrolled
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
			// Si l'utilisateur scroll et n'est pas en bas, on désactive l'auto-scroll
			// If user scrolls and is not at bottom, disable auto-scroll
			isUserScrolling = !isNearBottom();
		}
	}

	// Auto-scroll quand de nouveaux messages arrivent / Auto-scroll when new messages arrive
	$effect(() => {
		if (llmStore.messages.length > 0 && mainElement) {
			// N'auto-scroll que si l'utilisateur n'a pas scrollé manuellement vers le haut
			// Only auto-scroll if user hasn't manually scrolled up
			if (!isUserScrolling) {
				// Scroll vers le bas avec un délai pour laisser le temps au DOM de se mettre à jour
				// Scroll to bottom with a delay to allow DOM to update
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

<div
	class="h-screen bg-gradient-to-br from-slate-100 dark:from-slate-900 via-purple-100 dark:via-purple-900 to-slate-100 dark:to-slate-900 flex flex-col overflow-hidden"
>
	<!-- En-tête / Header - Fixé en haut / Fixed at top -->
	<AppHeader
		{showInstallButton}
		{hasEnoughRAM}
		deferredInstall={!!deferredInstallPrompt}
		onnew={handleNewConversation}
		onexport={handleExportMarkdown}
		oninstall={handleInstallClick}
		onmodelselect={handleModelChange}
		bind:isHistoryOpen
		bind:isSettingsModalOpen
		bind:isRagTestOpen
		bind:isAddModelModalOpen
	/>

	<!-- Zone principale / Main area - Scrollable -->
	<main
		bind:this={mainElement}
		onscroll={handleScroll}
		class="flex-1 overflow-y-auto"
	>
		<div class="container mx-auto p-4 max-w-4xl">
			<StatusPanels {hasEnoughRAM} />

			<MessageList onreuse={handleReusePrompt} onsave={handleSaveToMemory} />

			{#if isUserScrolling}
				<ScrollToBottomButton
					onclick={() => {
						isUserScrolling = false;
						scrollToBottom();
					}}
				/>
			{/if}
		</div>
	</main>

	<!-- Zone d'input / Input area - Fixée en bas / Fixed at bottom -->
	<div class="flex-shrink-0 backdrop-blur-sm">
		<div class="container mx-auto p-4 max-w-4xl">
			<ChatComposer bind:this={composerRef} onsent={() => (isUserScrolling = false)} />
			<AppFooter />
		</div>
	</div>
</div>

<!-- Modals de configuration / Config modals -->
<ManageModelsModal bind:isOpen={isAddModelModalOpen} />

<!-- Panneau d'historique des conversations / Conversation history panel -->
<ConversationHistory bind:isOpen={isHistoryOpen} />
