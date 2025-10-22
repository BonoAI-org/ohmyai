<script>
	import { onMount } from 'svelte';
	import { llmStore, AVAILABLE_MODELS } from '$lib/stores/llm.svelte.js';
	import ChatMessage from '$lib/components/ChatMessage.svelte';
	import AddCustomModelModal from '$lib/components/AddCustomModelModal.svelte';
	import ConversationHistory from '$lib/components/ConversationHistory.svelte';
	import LanguageSelector from '$lib/components/LanguageSelector.svelte';
	import logo from '$lib/assets/logo.svg';
	import { _ } from 'svelte-i18n';

	// Référence pour l'input du message / Reference for message input
	let messageInput = $state('');
	
	// État du menu de sélection de modèle / Model selection menu state
	let isModelSelectorOpen = $state(false);
	
	// État du modal d'ajout de modèle / Add model modal state
	let isAddModelModalOpen = $state(false);
	
	// État du panneau d'historique / History panel state
	let isHistoryOpen = $state(false);
	
	// Prompt d'installation PWA / PWA install prompt
	let deferredInstallPrompt = $state(null);
	let showInstallButton = $state(false);
	let hasEnoughRAM = $state(true);
	
	// RAM minimum requise en Go / Minimum required RAM in GB
	const MIN_RAM_GB = 4;

	/**
	 * Vérifie si l'appareil a suffisamment de RAM
	 * Check if device has enough RAM
	 */
	function checkRAM() {
		// API Device Memory (Chrome, Edge)
		// Returns RAM en Go / Returns RAM in GB
		if ('deviceMemory' in navigator) {
			const deviceMemory = navigator.deviceMemory;
			console.log(`💾 RAM détectée: ${deviceMemory} GB`);
			
			if (deviceMemory < MIN_RAM_GB) {
				hasEnoughRAM = false;
				console.warn(`⚠️ RAM insuffisante: ${deviceMemory} GB (minimum ${MIN_RAM_GB} GB requis)`);
				return false;
			}
		} else {
			// API non disponible, on assume que c'est OK
			// API not available, assume it's OK
			console.log('ℹ️ Device Memory API non disponible, installation autorisée');
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
		
		// Charge l'historique des conversations / Load conversation history
		llmStore.loadConversationHistory();
		
		// Initialise le moteur / Initialize engine
		llmStore.initEngine();
		
		// Vérifie la RAM disponible / Check available RAM
		checkRAM();
		
		// Écoute l'événement d'installation PWA / Listen for PWA install event
		window.addEventListener('beforeinstallprompt', (event) => {
			event.preventDefault();
			deferredInstallPrompt = event;
			
			// N'affiche le bouton que si la RAM est suffisante
			// Only show button if RAM is sufficient
			if (hasEnoughRAM) {
				showInstallButton = true;
				console.log('📱 PWA installable, bouton activé');
			} else {
				console.log('⚠️ PWA installable mais RAM insuffisante, bouton masqué');
			}
		});
		
		// Cache le bouton si l'app est installée / Hide button if app is installed
		window.addEventListener('appinstalled', () => {
			showInstallButton = false;
			deferredInstallPrompt = null;
			console.log('✅ PWA installée');
		});
	});
	
	/**
	 * Déclenche l'installation de la PWA / Trigger PWA installation
	 */
	async function handleInstallClick() {
		if (!deferredInstallPrompt) {
			console.log('⚠️ Prompt d\'installation non disponible');
			return;
		}
		
		// Affiche le prompt d'installation / Show install prompt
		deferredInstallPrompt.prompt();
		
		// Attend le choix de l'utilisateur / Wait for user choice
		const { outcome } = await deferredInstallPrompt.userChoice;
		console.log('👤 Choix utilisateur:', outcome);
		
		// Reset
		deferredInstallPrompt = null;
		showInstallButton = false;
	}

	/**
	 * Gère l'envoi d'un message / Handle sending a message
	 */
	async function handleSend() {
		if (!messageInput.trim() || llmStore.isGenerating) return;
		
		const message = messageInput.trim();
		messageInput = ''; // Réinitialise l'input / Reset input
		
		await llmStore.sendMessage(message);
		
		// Sauvegarde automatiquement la conversation / Auto-save conversation
		llmStore.saveCurrentConversation();
		
		// Réactive l'auto-scroll quand l'utilisateur envoie un message
		// Reactivate auto-scroll when user sends a message
		isUserScrolling = false;
	}

	/**
	 * Gère l'appui sur Enter pour envoyer / Handle Enter key to send
	 */
	function handleKeydown(event) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSend();
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
				'Changer de modèle effacera la conversation actuelle. Continuer ?\n\n' +
				'Changing model will clear the current conversation. Continue?'
			);
			if (!confirmed) {
				isModelSelectorOpen = false;
				return;
			}
		}
		
		isModelSelectorOpen = false;
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
				behavior: 'smooth'
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
	 * Ferme le sélecteur de modèle quand on clique en dehors
	 * Close model selector when clicking outside
	 */
	function handleClickOutside(event) {
		if (isModelSelectorOpen && !event.target.closest('.model-selector-container')) {
			isModelSelectorOpen = false;
		}
	}

	/**
	 * Récupère le nom du modèle actuellement sélectionné
	 * Get the name of the currently selected model
	 */
	function getSelectedModelName() {
		// Recherche dans les modèles standard / Search in standard models
		const standardModel = AVAILABLE_MODELS.find(m => m.id === llmStore.selectedModel);
		if (standardModel) return standardModel.name;
		
		// Recherche dans les modèles personnalisés / Search in custom models
		const customModel = llmStore.customModels.find(m => m.id === llmStore.selectedModel);
		if (customModel) return customModel.name;
		
		// Par défaut / Default
		return 'Modèle / Model';
	}
</script>

<!-- Gestionnaire de clic global / Global click handler -->
<svelte:window onclick={handleClickOutside} />

<div class="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col overflow-hidden">
	<!-- En-tête / Header - Fixé en haut / Fixed at top -->
	<header class="flex-shrink-0 bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 p-4">
		<div class="container mx-auto">
			<div class="flex items-center justify-between flex-wrap gap-4">
				<div class="flex items-center gap-3">
					<!-- Bouton nouveau mobile / New button mobile -->
					<button
						onclick={() => llmStore.startNewConversation()}
						class="lg:hidden flex items-center justify-center w-10 h-10 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all shadow-lg"
						aria-label="Nouvelle conversation / New conversation"
						title="Démarrer une nouvelle conversation / Start a new conversation"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
					</button>
					<button
						onclick={() => isHistoryOpen = true}
						class="lg:hidden flex items-center justify-center w-10 h-10 bg-slate-700/50 hover:bg-slate-700 text-white rounded-lg transition-colors"
						aria-label="Historique / History"
						title="Historique des conversations / Conversation history"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</button>
					<div class="flex flex-row gap-3">
						<div class="flex flex-col items-center">
							<img src={logo} alt="Oh my AI! Logo" class="h-16 w-auto" />
						</div>
						<div class="flex flex-col mt-4 -ml-2 justify-end">
							<h1 class="text-3xl font-bold text-white flex items-center gap-1">
								h my AI!
							</h1>
							<p class="text-slate-300 -mt-1 -ml-3">
								IA locale dans votre navigateur • Local AI in your browser
							</p>
						</div>
					</div>
				</div>
				
				<!-- Boutons d'action / Action buttons -->
				<div class="flex items-center gap-2">
					<!-- Bouton nouvelle conversation / New conversation button -->
					<button
						onclick={() => llmStore.startNewConversation()}
						class="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-purple-500/50"
						aria-label="Nouvelle conversation / New conversation"
						title="Démarrer une nouvelle conversation / Start a new conversation"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						<span class="text-sm font-medium hidden sm:inline">Nouveau</span>
					</button>
					
					<!-- Bouton historique (desktop) / History button (desktop) -->
					<button
						onclick={() => isHistoryOpen = true}
						class="hidden lg:flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors"
						aria-label="Historique / History"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<span class="text-sm">Historique</span>
						{#if llmStore.conversationHistory.length > 0}
							<span class="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
								{llmStore.conversationHistory.length}
							</span>
						{/if}
					</button>
					
					<!-- Bouton installation PWA / PWA install button -->
					{#if showInstallButton}
						<button
							onclick={handleInstallClick}
							class="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all shadow-lg hover:shadow-green-500/50"
							aria-label="Installer l'app / Install app"
							title="Installer Oh my AI! sur votre appareil / Install Oh my AI! on your device"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
							</svg>
						</button>
					{:else if !hasEnoughRAM && deferredInstallPrompt}
						<!-- Message RAM insuffisante / Insufficient RAM message -->
						<div 
							class="flex items-center justify-center w-10 h-10 bg-orange-600/20 border border-orange-600/50 text-orange-400 rounded-lg"
							title="RAM insuffisante pour l'installation (minimum {MIN_RAM_GB} GB requis) / Insufficient RAM for installation (minimum {MIN_RAM_GB} GB required)"
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
							</svg>
						</div>
					{/if}
					
					<!-- Sélecteur de langue / Language selector -->
					<LanguageSelector />
					
					<!-- Sélecteur de modèle / Model selector -->
					<div class="relative model-selector-container">
					<button
						onclick={() => isModelSelectorOpen = !isModelSelectorOpen}
						disabled={llmStore.isLoading || llmStore.isGenerating}
						class="flex items-center gap-2 bg-slate-700/50 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						aria-label="Sélectionner un modèle / Select a model"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
								d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
						</svg>
						<span class="text-sm">
							{getSelectedModelName()}
						</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					<!-- Menu déroulant / Dropdown menu -->
					{#if isModelSelectorOpen}
						<div class="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
							<div class="p-2">
								<div class="text-xs text-slate-400 px-3 py-2 font-semibold uppercase">
									Choisir un modèle / Choose a model
								</div>
								{#each AVAILABLE_MODELS as model}
									<button
										onclick={() => handleModelChange(model.id)}
										class="w-full text-left px-3 py-3 rounded hover:bg-slate-700/50 transition-colors {
											model.id === llmStore.selectedModel ? 'bg-purple-600/20 border border-purple-500/50' : ''
										}"
									>
										<div class="flex items-start justify-between gap-2">
											<div class="flex-1">
												<div class="flex items-center gap-2">
													<span class="font-semibold text-white">{model.name}</span>
													{#if model.recommended}
														<span class="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
															Recommandé
														</span>
													{/if}
													{#if model.id === llmStore.selectedModel}
														<svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
															<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
														</svg>
													{/if}
												</div>
												<div class="text-xs text-slate-400 mt-1">
													{model.size} • {model.description}
												</div>
											</div>
										</div>
									</button>
								{/each}
								
								<!-- Modèles personnalisés / Custom models -->
								{#if llmStore.customModels.length > 0}
									<div class="border-t border-slate-700 mt-2 pt-2">
										<div class="text-xs text-slate-400 px-3 py-2 font-semibold uppercase flex items-center gap-2">
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
											</svg>
											Modèles Personnalisés / Custom Models
										</div>
										{#each llmStore.customModels as model}
											<div class="relative group">
												<button
													onclick={() => handleModelChange(model.id)}
													class="w-full text-left px-3 py-3 rounded hover:bg-slate-700/50 transition-colors {
														model.id === llmStore.selectedModel ? 'bg-purple-600/20 border border-purple-500/50' : ''
													}"
												>
													<div class="flex items-start justify-between gap-2">
														<div class="flex-1">
															<div class="flex items-center gap-2">
																<span class="font-semibold text-white">{model.name}</span>
																<span class="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
																	Custom
																</span>
																{#if model.id === llmStore.selectedModel}
																	<svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
																		<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
																	</svg>
																{/if}
															</div>
															<div class="text-xs text-slate-400 mt-1">
																{model.size} • {model.description}
															</div>
														</div>
													</div>
												</button>
												<!-- Bouton supprimer / Delete button -->
												<button
													onclick={(e) => {
														e.stopPropagation();
														if (confirm('Supprimer ce modèle personnalisé ? / Delete this custom model?')) {
															llmStore.removeCustomModel(model.id);
														}
													}}
													class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300"
													aria-label="Supprimer / Delete"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{/if}
								
								<!-- Bouton pour ajouter un modèle / Add model button -->
								<div class="border-t border-slate-700 mt-2 pt-2">
									<button
										onclick={() => {
											isModelSelectorOpen = false;
											isAddModelModalOpen = true;
										}}
										class="w-full text-left px-3 py-3 rounded hover:bg-green-500/10 transition-colors flex items-center gap-2 text-green-400 hover:text-green-300"
									>
										<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
										</svg>
										<span class="font-semibold">Ajouter un modèle personnalisé / Add custom model</span>
									</button>
								</div>
							</div>
						</div>
					{/if}
					</div>
				</div>
			</div>
		</div>
	</header>

	<!-- Zone principale / Main area - Scrollable -->
	<main bind:this={mainElement} onscroll={handleScroll} class="flex-1 overflow-y-auto">
		<div class="container mx-auto p-4 max-w-4xl">
			<!-- Avertissement RAM insuffisante / Insufficient RAM warning -->
			{#if !hasEnoughRAM}
				<div class="bg-orange-600/20 border border-orange-600/50 rounded-lg p-4 mb-4 flex items-start gap-3">
					<svg class="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
					</svg>
					<div class="text-orange-200">
						<p class="font-semibold mb-1">⚠️ RAM insuffisante détectée / Insufficient RAM detected</p>
						<p class="text-sm text-orange-300">
							Votre appareil dispose de moins de {MIN_RAM_GB} GB de RAM. Les modèles d'IA peuvent ne pas fonctionner correctement ou être très lents.
						</p>
						<p class="text-sm text-orange-300 mt-1">
							Your device has less than {MIN_RAM_GB} GB of RAM. AI models may not work properly or be very slow.
						</p>
						<p class="text-xs text-orange-400 mt-2">
							💡 Conseil : Utilisez un modèle léger comme Phi-3.5 ou Llama-3.2-1B pour de meilleures performances.
						</p>
					</div>
				</div>
			{/if}
			
			<!-- Statut du chargement / Loading status -->
			{#if llmStore.isLoading}
				<div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 text-center mb-4">
					<div class="flex flex-col items-center gap-4">
						<div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
						<div class="text-white">
							<p class="font-semibold">Chargement du modèle... / Loading model...</p>
							<p class="text-sm text-slate-300 mt-2">{llmStore.loadingProgress}</p>
						</div>
					</div>
				</div>
			{/if}

			<!-- Erreur / Error -->
			{#if llmStore.error}
				<div class="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4">
					<p class="text-red-200">
						<strong>Erreur / Error:</strong> {llmStore.error}
					</p>
				</div>
			{/if}

			<!-- Messages de chat / Chat messages -->
			<div class="space-y-4 pb-4">
			{#if llmStore.messages.length === 0 && !llmStore.isLoading}
				<div class="text-center text-slate-400 py-12">
					<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
					</svg>
					<p class="text-lg">Commencez une conversation / Start a conversation</p>
					<p class="text-sm mt-2">Le modèle s'exécute entièrement dans votre navigateur via WebAssembly</p>
					<p class="text-sm">The model runs entirely in your browser via WebAssembly</p>
				</div>
			{/if}

			{#each llmStore.messages as message, index (index)}
				<ChatMessage {message} />
			{/each}

			{#if llmStore.isGenerating && llmStore.messages[llmStore.messages.length - 1]?.content === ''}
				<div class="flex gap-2 items-center text-slate-400">
					<div class="flex gap-1">
						<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 0ms;"></div>
						<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 150ms;"></div>
						<div class="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style="animation-delay: 300ms;"></div>
					</div>
					<span class="text-sm">Génération en cours... / Generating...</span>
				</div>
			{/if}
			</div>
			
			<!-- Bouton pour revenir en bas / Button to scroll to bottom -->
			{#if isUserScrolling && llmStore.messages.length > 0}
				<div class="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none">
					<button
						onclick={() => {
							isUserScrolling = false;
							scrollToBottom();
						}}
						class="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all animate-bounce"
						aria-label="Retour en bas / Scroll to bottom"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
						</svg>
						<span class="text-sm font-medium">Retour en bas / Scroll to bottom</span>
					</button>
				</div>
			{/if}
		</div>
	</main>

	<!-- Zone d'input / Input area - Fixée en bas / Fixed at bottom -->
	<div class="flex-shrink-0 backdrop-blur-sm">
		<div class="container mx-auto p-4 max-w-4xl">
			<div class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700">
				<div class="flex gap-2">
					<textarea
						bind:value={messageInput}
						onkeydown={handleKeydown}
						disabled={llmStore.isLoading || llmStore.isGenerating}
						placeholder="Tapez votre message... / Type your message..."
						rows="3"
						class="flex-1 bg-slate-700/50 text-white rounded-lg px-4 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
					></textarea>
					<button
						onclick={handleSend}
						disabled={llmStore.isLoading || llmStore.isGenerating || !messageInput.trim()}
						aria-label="Envoyer le message / Send message"
						class="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
								d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
						</svg>
					</button>
				</div>
				
				<!-- Bouton pour effacer la conversation / Button to clear conversation -->
				{#if llmStore.messages.length > 0}
					<button
						onclick={() => llmStore.clearMessages()}
						class="mt-2 text-sm text-slate-400 hover:text-white transition-colors"
					>
						🗑️ Effacer la conversation / Clear conversation
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Modal pour ajouter un modèle personnalisé / Modal to add custom model -->
<AddCustomModelModal bind:isOpen={isAddModelModalOpen} />

<!-- Panneau d'historique des conversations / Conversation history panel -->
<ConversationHistory bind:isOpen={isHistoryOpen} />
