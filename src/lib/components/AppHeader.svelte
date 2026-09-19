<script>
	/**
	 * En-tête de l'application : boutons de conversation (versions mobile et
	 * bureau), marque, export markdown, invite d'installation PWA, sélecteurs
	 * de langue et de modèle, accès aux paramètres et à la base de connaissances.
	 * Application header: conversation buttons (mobile and desktop variants),
	 * branding, markdown export, PWA install prompt, language and model
	 * selectors, access to settings and to the knowledge base.
	 *
	 * Les deux boutons mobiles doivent conserver leur classe `lg:hidden` : les
	 * tests end-to-end s'en servent pour vérifier le comportement responsive.
	 * Both mobile buttons must keep their `lg:hidden` class: the end-to-end
	 * tests use it to check responsive behavior.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";
	import LanguageSelector from "$lib/components/LanguageSelector.svelte";
	import ModelSelector from "$lib/components/ModelSelector.svelte";
	import logo from "$lib/assets/logo.svg";
	import logoDark from "$lib/assets/logo-dark.svg";

	/**
	 * @type {{
	 *   showInstallButton: boolean,
	 *   hasEnoughRAM: boolean,
	 *   deferredInstall: boolean,
	 *   onnew: () => void,
	 *   onexport: () => void,
	 *   oninstall: () => void,
	 *   onmodelselect: (modelId: string) => void,
	 *   isHistoryOpen?: boolean,
	 *   isSettingsModalOpen?: boolean,
	 *   isRagTestOpen?: boolean,
	 *   isAddModelModalOpen?: boolean
	 * }}
	 */
	let {
		showInstallButton,
		hasEnoughRAM,
		deferredInstall,
		onnew,
		onexport,
		oninstall,
		onmodelselect,
		isHistoryOpen = $bindable(false),
		isSettingsModalOpen = $bindable(false),
		isRagTestOpen = $bindable(false),
		isAddModelModalOpen = $bindable(false)
	} = $props();
</script>

<header
	class="relative z-50 flex-shrink-0 bg-white/80 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700 p-4"
>
	<div class="container mx-auto">
		<div class="flex items-center justify-between flex-wrap gap-4">
			<div class="flex items-center gap-3">
				<!-- Bouton nouveau mobile / New button mobile -->
				<button
					onclick={onnew}
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
					onclick={onnew}
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
						onclick={onexport}
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
						onclick={oninstall}
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
				{:else if !hasEnoughRAM && deferredInstall}
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
						<LanguageSelector />
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

					<ModelSelector
						onselect={onmodelselect}
						onmanage={() => (isAddModelModalOpen = true)}
					/>

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
