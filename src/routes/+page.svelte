<script>
	import { onMount } from "svelte";
	import { llmStore, AVAILABLE_MODELS } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";
	import ManageModelsModal from "$lib/components/ManageModelsModal.svelte";
	import SettingsModal from "$lib/components/SettingsModal.svelte";
	import KnowledgeBaseModal from "$lib/components/KnowledgeBaseModal.svelte";
	import ConversationHistory from "$lib/components/ConversationHistory.svelte";
	import LanguageSelector from "$lib/components/LanguageSelector.svelte";
  import AppFooter from "$lib/components/AppFooter.svelte";
  import StatusPanels from "$lib/components/StatusPanels.svelte";
  import MessageList from "$lib/components/MessageList.svelte";
  import ScrollToBottomButton from "$lib/components/ScrollToBottomButton.svelte";
	import logo from "$lib/assets/logo.svg";
	import logoDark from "$lib/assets/logo-dark.svg";
	import { _ } from "svelte-i18n";
	import { mcpStore } from "$lib/stores/mcp.svelte.js";
	import { oramaStore } from "$lib/stores/orama.svelte.js";
	import { marked } from "marked";
	import ChatComposer from "$lib/components/ChatComposer.svelte";

	// Référence au composeur, pour y injecter un prompt réutilisé et vider les
	// images au changement de modèle.
	// Composer reference, used to inject a reused prompt and to clear images
	// when the model changes.
	let composerRef = $state(null);

	// Référence au composant LanguageSelector / Reference to LanguageSelector component
	let languageSelectorRef = $state(null);

	// État du menu de sélection de modèle / Model selection menu state
	let isModelSelectorOpen = $state(false);
	let showAllModels = $state(false);
	const VISIBLE_MODEL_COUNT = 3;

	// Tri des modèles : téléchargés en premier / Sort models: downloaded first
	const sortedModels = $derived(
		[...AVAILABLE_MODELS].sort((a, b) => {
			const aLocal = llmStore.downloadedModels[a.id] ? 1 : 0;
			const bLocal = llmStore.downloadedModels[b.id] ? 1 : 0;
			return bLocal - aLocal;
		})
	);

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
		if (modelId === llmStore.selectedModel) {
			isModelSelectorOpen = false;
			return;
		}

		// Confirme le changement de modèle / Confirm model change
		if (llmStore.messages.length > 0) {
			const confirmed = confirm(
				"Changer de modèle effacera la conversation actuelle. Continuer ?\n\n" +
					"Changing model will clear the current conversation. Continue?",
			);
			if (!confirmed) {
				isModelSelectorOpen = false;
				return;
			}
		}

		isModelSelectorOpen = false;
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

	/**
	 * Ferme les menus déroulants quand on clique en dehors
	 * Close dropdown menus when clicking outside
	 */
	function handleClickOutside(event) {
		// Ferme le sélecteur de modèle / Close model selector
		if (
			isModelSelectorOpen &&
			!event.target.closest(".model-selector-container")
		) {
			isModelSelectorOpen = false;
			showAllModels = false;
		}

		// Ferme le sélecteur de langue / Close language selector
		if (
			languageSelectorRef &&
			!event.target.closest(".language-selector")
		) {
			languageSelectorRef.closeMenu?.();
		}
	}

	/**
	 * Récupère le nom du modèle actuellement sélectionné
	 * Get the name of the currently selected model
	 */
	function getSelectedModelName() {
		// Recherche dans les modèles standard / Search in standard models
		const standardModel = AVAILABLE_MODELS.find(
			(m) => m.id === llmStore.selectedModel,
		);
		if (standardModel) return standardModel.name;

		// Recherche dans les modèles personnalisés / Search in custom models
		const customModel = llmStore.customModels.find(
			(m) => m.id === llmStore.selectedModel,
		);
		if (customModel) return customModel.name;

		// Par défaut / Default
		return "Modèle / Model";
	}
</script>

<!-- Gestionnaire de clic global / Global click handler -->
<svelte:window onclick={handleClickOutside} />

<SettingsModal bind:isOpen={isSettingsModalOpen} />
<KnowledgeBaseModal bind:isOpen={isRagTestOpen} />

<div
	class="h-screen bg-gradient-to-br from-slate-100 dark:from-slate-900 via-purple-100 dark:via-purple-900 to-slate-100 dark:to-slate-900 flex flex-col overflow-hidden"
>
	<!-- En-tête / Header - Fixé en haut / Fixed at top -->
	<header
		class="relative z-50 flex-shrink-0 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4"
	>
		<div class="container mx-auto">
			<div class="flex items-center justify-between flex-wrap gap-4">
				<div class="flex items-center gap-3">
					<!-- Bouton nouveau mobile / New button mobile -->
					<button
						onclick={handleNewConversation}
						class="lg:hidden flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white rounded-lg transition-all shadow-lg touch-manipulation"
						aria-label={$_("header.newConversation")}
						title={$_("header.startNewConversation")}
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
					</button>
					<button
						onclick={() => (isHistoryOpen = true)}
						class="lg:hidden flex items-center justify-center w-10 h-10 bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-white rounded-lg transition-colors touch-manipulation"
						aria-label={$_("header.history")}
						title={$_("header.conversationHistory")}
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</button>
					<div class="flex items-center gap-3">
						<a href="/" class="flex items-center gap-2 group">
							<img
								src={!themeStore.isDark ||
								themeStore.colorTheme === "paper"
									? logoDark
									: logo}
								alt="Logo"
								class="w-6 h-6 group-hover:scale-110 transition-transform"
							/>
							<span
								class="text-lg font-bold text-slate-900 dark:text-white"
							>
								Oh my AI!
							</span>
						</a>
						<span
							class="hidden md:inline-block text-sm text-slate-500 dark:text-slate-400 pl-1"
						>
							{$_("app.tagline")}
						</span>
					</div>
				</div>

				<!-- Boutons d'action / Action buttons -->
				<div class="flex items-center gap-2">
					<!-- Bouton nouvelle conversation / New conversation button -->
					<button
						onclick={handleNewConversation}
						class="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 active:from-purple-800 active:to-purple-900 text-white px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50 touch-manipulation"
						aria-label={$_("header.newConversation")}
						title={$_("header.startNewConversation")}
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						<span class="text-sm font-medium hidden sm:inline"
							>{$_("header.new")}</span
						>
					</button>

					<!-- Bouton historique (desktop) / History button (desktop) -->
					<button
						onclick={() => (isHistoryOpen = true)}
						class="hidden lg:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-white px-4 py-2 rounded-lg transition-colors touch-manipulation"
						aria-label={$_("header.history")}
					>
						<svg
							class="w-5 h-5"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span class="text-sm">{$_("header.history")}</span>
						{#if llmStore.conversationHistory.length > 0}
							<span
								class="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full"
							>
								{llmStore.conversationHistory.length}
							</span>
						{/if}
					</button>

					<!-- Bouton Exporter Markdown / Export Markdown button -->
					{#if llmStore.messages && llmStore.messages.length > 0}
						<button
							onclick={handleExportMarkdown}
							class="hidden lg:flex items-center justify-center w-10 h-10 bg-slate-700/50 hover:bg-slate-700 active:bg-slate-600 text-white rounded-lg transition-colors touch-manipulation"
							aria-label="Exporter en Markdown / Export to Markdown"
							title="Exporter la conversation / Export conversation"
						>
							<!-- Icône disquette (sauvegarder) / Floppy disk icon (save) -->
							<svg
								class="w-5 h-5 flex-shrink-0"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"
								/>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M17 21v-8H7v8M7 3v5h8"
								/>
							</svg>
						</button>
					{/if}

					<!-- Bouton installation PWA / PWA install button -->
					{#if showInstallButton}
						<button
							onclick={handleInstallClick}
							class="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 active:from-green-800 active:to-green-900 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50 touch-manipulation"
							aria-label={$_("header.install")}
							title={$_("header.installApp")}
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
						</button>
					{:else if !hasEnoughRAM && deferredInstallPrompt}
						<!-- Message RAM insuffisante / Insufficient RAM message -->
						<div
							class="flex items-center justify-center w-10 h-10 bg-orange-600/20 border border-orange-600/50 text-orange-400 rounded-lg"
							title={$_("ram.insufficientForInstall", {
								values: { min: MIN_RAM_GB },
							})}
						>
							<svg
								class="w-5 h-5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
								/>
							</svg>
						</div>
					{/if}

					<!-- Settings + Language + Model Selector Container aligned to the right -->
					<div
						class="flex flex-wrap items-center gap-3 mt-2 sm:mt-0 ml-auto"
					>
						<!-- Composant de Langue / Language Selector -->
						<div class="flex-shrink-0">
							<LanguageSelector bind:this={languageSelectorRef} />
						</div>

						<!-- Bouton Paramètres / Settings button -->
						<button
							onclick={() => (isSettingsModalOpen = true)}
							class="flex items-center justify-center w-8 h-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors touch-manipulation hover:bg-slate-50 dark:hover:bg-slate-700/80 shadow-sm flex-shrink-0"
							aria-label="Paramètres / Settings"
							title="Paramètres / Settings"
						>
							<svg
								class="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
								></path>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="1.5"
									d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
								></path>
							</svg>
						</button>

						<!-- Sélecteur de modèle / Model selector -->
						<div
							class="relative model-selector-container flex-shrink-0"
						>
							<button
								onclick={(e) => {
									e.stopPropagation();
									isModelSelectorOpen = !isModelSelectorOpen;
									if (!isModelSelectorOpen) showAllModels = false;
								}}
								disabled={llmStore.isLoading ||
									llmStore.isGenerating}
								class="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation focus:outline-none border border-transparent dark:border-slate-600/50 shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-none"
								aria-label={$_("header.selectModel")}
								aria-expanded={isModelSelectorOpen}
							>
								<span
									class="text-sm truncate max-w-[150px] sm:max-w-none font-medium"
								>
									{getSelectedModelName()}
								</span>
								<svg
									class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0 transition-transform {isModelSelectorOpen
										? 'rotate-180'
										: ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>

							<!-- Menu déroulant / Dropdown menu -->
							{#if isModelSelectorOpen}
								<div
									class="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 mx-4 sm:mx-0 sm:w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100] max-h-[70vh] overflow-y-auto"
								>
									<div class="p-2">
										<div
											class="text-xs text-slate-500 dark:text-slate-400 px-3 py-2 font-semibold uppercase"
										>
											{$_("header.chooseModel")}
										</div>
										{#each showAllModels ? sortedModels : sortedModels.slice(0, VISIBLE_MODEL_COUNT) as model}
											<button
												onclick={() =>
													handleModelChange(model.id)}
												class="w-full text-left px-3 py-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors {model.id ===
												llmStore.selectedModel
													? 'bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/50'
													: ''}"
											>
												<div
													class="flex items-start justify-between gap-2"
												>
													<div class="flex-1">
														<div
															class="flex items-center gap-2 flex-wrap gap-y-1"
														>
															<span
																class="font-semibold text-slate-900 dark:text-white break-words"
																>{model.name}</span
															>
															{#if model.recommended}
																<span
																	class="text-[10px] bg-green-500/20 text-green-500 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-500/30"
																>
																	{$_(
																		"model.recommended",
																	)}
																</span>
															{/if}
															{#if model.supportsTools}
																<span
																	class="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30"
																>
																	Tools
																</span>
															{/if}

															<!-- Status Indicator -->
															{#if llmStore.isLoading && llmStore.selectedModel === model.id}
																<span
																	class="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1 truncate"
																>
																	<svg
																		class="w-3 h-3 animate-spin flex-shrink-0"
																		viewBox="0 0 24 24"
																		fill="none"
																		stroke="currentColor"
																		><path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																		/></svg
																	>
																	En cours
																</span>
															{:else if llmStore.downloadedModels[model.id]}
																<span
																	class="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 truncate"
																	title="Modèle téléchargé sur cet appareil"
																>
																	<svg
																		class="w-3 h-3 flex-shrink-0"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																		><path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M5 13l4 4L19 7"
																		/></svg
																	>
																	Local
																</span>
															{:else}
																<span
																	class="text-[10px] bg-slate-500/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 flex items-center gap-1 truncate"
																	title="Nécessite un téléchargement"
																>
																	<svg
																		class="w-3 h-3 flex-shrink-0"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																		><path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
																		/></svg
																	>
																	À télécharger
																</span>
															{/if}

															{#if model.id === llmStore.selectedModel}
																<svg
																	class="w-4 h-4 text-purple-400"
																	fill="currentColor"
																	viewBox="0 0 20 20"
																>
																	<path
																		fill-rule="evenodd"
																		d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																		clip-rule="evenodd"
																	/>
																</svg>
															{/if}
														</div>
														<div
															class="text-xs text-slate-500 dark:text-slate-400 mt-1"
														>
															{model.size} • {model.description}
														</div>
													</div>
												</div>
											</button>
										{/each}

										{#if !showAllModels && sortedModels.length > VISIBLE_MODEL_COUNT}
											<button
												onclick={(e) => { e.stopPropagation(); showAllModels = true; }}
												class="w-full text-center px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors font-medium"
											>
												Voir plus ({sortedModels.length - VISIBLE_MODEL_COUNT} autres)
											</button>
										{:else if showAllModels && sortedModels.length > VISIBLE_MODEL_COUNT}
											<button
												onclick={(e) => { e.stopPropagation(); showAllModels = false; }}
												class="w-full text-center px-3 py-2 text-sm text-purple-600 dark:text-purple-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded transition-colors font-medium"
											>
												Voir moins
											</button>
										{/if}

										<!-- Modèles personnalisés / Custom models -->
										{#if llmStore.customModels.length > 0}
											<div
												class="border-t border-slate-700 mt-2 pt-2"
											>
												<div
													class="text-xs text-slate-400 px-3 py-2 font-semibold uppercase flex items-center gap-2"
												>
													<svg
														class="w-4 h-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
														/>
													</svg>
													{$_("model.customModels")}
												</div>
												{#each llmStore.customModels as model}
													<div class="relative group">
														<button
															onclick={() =>
																handleModelChange(
																	model.id,
																)}
															class="w-full text-left px-3 py-3 rounded hover:bg-slate-700/50 transition-colors {model.id ===
															llmStore.selectedModel
																? 'bg-purple-600/20 border border-purple-500/50'
																: ''}"
														>
															<div
																class="flex items-start justify-between gap-2"
															>
																<div
																	class="flex-1 min-w-0"
																>
																	<div
																		class="flex items-center gap-2 flex-wrap gap-y-1"
																	>
																		<span
																			class="font-semibold text-white break-words"
																			>{model.name}</span
																		>
																		<span
																			class="text-[10px] bg-purple-500/20 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/30"
																		>
																			Custom
																		</span>

																		<!-- Status Indicator -->
																		{#if llmStore.isLoading && llmStore.selectedModel === model.id}
																			<span
																				class="text-[10px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded border border-yellow-500/30 flex items-center gap-1 truncate"
																			>
																				<svg
																					class="w-3 h-3 animate-spin flex-shrink-0"
																					viewBox="0 0 24 24"
																					fill="none"
																					stroke="currentColor"
																					><path
																						stroke-linecap="round"
																						stroke-linejoin="round"
																						stroke-width="2"
																						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
																					/></svg
																				>
																				En
																				cours
																			</span>
																		{:else if llmStore.downloadedModels[model.id]}
																			<span
																				class="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 truncate"
																				title="Modèle téléchargé sur cet appareil"
																			>
																				<svg
																					class="w-3 h-3 flex-shrink-0"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																					><path
																						stroke-linecap="round"
																						stroke-linejoin="round"
																						stroke-width="2"
																						d="M5 13l4 4L19 7"
																					/></svg
																				>
																				Local
																			</span>
																		{:else}
																			<span
																				class="text-[10px] bg-slate-500/10 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-500/20 flex items-center gap-1 truncate"
																				title="Nécessite un téléchargement"
																			>
																				<svg
																					class="w-3 h-3 flex-shrink-0"
																					fill="none"
																					stroke="currentColor"
																					viewBox="0 0 24 24"
																					><path
																						stroke-linecap="round"
																						stroke-linejoin="round"
																						stroke-width="2"
																						d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
																					/></svg
																				>
																				À
																				télécharger
																			</span>
																		{/if}

																		{#if model.id === llmStore.selectedModel}
																			<svg
																				class="w-4 h-4 text-purple-400"
																				fill="currentColor"
																				viewBox="0 0 20 20"
																			>
																				<path
																					fill-rule="evenodd"
																					d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
																					clip-rule="evenodd"
																				/>
																			</svg>
																		{/if}
																	</div>
																	<div
																		class="text-xs text-slate-400 mt-1"
																	>
																		{model.size}
																		• {model.description}
																	</div>
																</div>
															</div>
														</button>
														<!-- Bouton supprimer / Delete button -->
														<button
															onclick={(e) => {
																e.stopPropagation();
																if (
																	confirm(
																		"Supprimer ce modèle personnalisé ? / Delete this custom model?",
																	)
																) {
																	llmStore.removeCustomModel(
																		model.id,
																	);
																}
															}}
															class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
															aria-label="Supprimer / Delete"
														>
															<svg
																class="w-4 h-4"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
																/>
															</svg>
														</button>
													</div>
												{/each}
											</div>
										{/if}

										<!-- Bouton pour gérer les modèles / Manage models button -->
										<div
											class="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2"
										>
											<button
												onclick={() => {
													isModelSelectorOpen = false;
													isAddModelModalOpen = true;
												}}
												class="w-full text-left px-3 py-3 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors flex items-center gap-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
											>
												<svg
													class="w-5 h-5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
													></path>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													></path>
												</svg>
												<span class="font-semibold"
													>Gérer les modèles / Manage
													models</span
												>
											</button>
										</div>
									</div>
								</div>
							{/if}
						</div>

						<!-- Base de connaissances (RAG) / Knowledge base (RAG) -->
						<button
							onclick={() => (isRagTestOpen = !isRagTestOpen)}
							class="flex items-center justify-center w-10 h-10 bg-slate-200/50 hover:bg-slate-200 active:bg-slate-300 dark:bg-slate-700/50 dark:hover:bg-slate-700 dark:active:bg-slate-600 text-slate-900 dark:text-white rounded-lg transition-colors touch-manipulation"
							title="Base de connaissances / Knowledge base"
						>
							<span class="text-xl">🧠</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	</header>

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
