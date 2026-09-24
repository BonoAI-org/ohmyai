<script>
	/**
	 * En-tête de l'application : une seule rangée de 56 px, trois zones.
	 *   identité  : bouton du panneau, marque
	 *   contexte  : titre de la conversation, puce du modèle, jauge de contexte
	 *   actions   : nouvelle conversation, réglages
	 * Application header: a single 56 px row, three zones: identity, context,
	 * actions.
	 *
	 * La langue et la base de connaissances ont quitté l'en-tête : la première
	 * vit dans les réglages, la seconde dans le panneau latéral.
	 * Language and knowledge base left the header: the former lives in the
	 * settings, the latter in the side panel.
	 *
	 * Les deux boutons mobiles doivent conserver leur classe `lg:hidden` : les
	 * tests end-to-end s'en servent pour vérifier le comportement responsive.
	 * Both mobile buttons must keep their `lg:hidden` class: the end-to-end
	 * tests use it to check responsive behavior.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";
	import ModelSelector from "$lib/components/ModelSelector.svelte";
	import { findModel, getModelDisplayName } from "$lib/llm/models.js";
	import logo from "$lib/assets/logo.svg";
	import logoDark from "$lib/assets/logo-dark.svg";

	/**
	 * @type {{
	 *   onnew: () => void,
	 *   onmodelselect: (modelId: string) => void,
	 *   isHistoryOpen?: boolean,
	 *   isSettingsModalOpen?: boolean,
	 *   isAddModelModalOpen?: boolean
	 * }}
	 */
	let {
		onnew,
		onmodelselect,
		isHistoryOpen = $bindable(false),
		isSettingsModalOpen = $bindable(false),
		isAddModelModalOpen = $bindable(false)
	} = $props();

	// Titre de la conversation en cours, ou le libellé d'une conversation neuve.
	// Current conversation title, or the label of a fresh conversation.
	// Vide tant que la conversation n'a pas de titre : l'en-tête ne répète pas
	// le libellé du bouton d'à côté.
	// Empty until the conversation has a title: the header does not echo the
	// label of the button next to it.
	const conversationTitle = $derived(
		llmStore.conversationHistory.find(
			(c) => c.id === llmStore.currentConversationId
		)?.title ?? ""
	);

	// Le modèle est-il déjà sur l'appareil ?
	// Is the model already on the device?
	const isModelLocal = $derived(
		Boolean(llmStore.downloadedModels[llmStore.selectedModel])
	);

	const modelSize = $derived(
		findModel(llmStore.selectedModel, llmStore.customModels)?.size ?? ""
	);

	// Pourcentage de la fenêtre de contexte consommée, arrondi.
	// Percentage of the context window consumed, rounded.
	const contextPercent = $derived(
		llmStore.contextUsage
			? Math.round(llmStore.contextUsage.ratio * 100)
			: null
	);
</script>

<header
	class="relative z-50 flex-shrink-0 h-14 px-2 lg:px-5 bg-bg-raised border-b border-border-soft flex items-center gap-2 lg:gap-4"
>
	<!-- ==================== Mobile ==================== -->

	<!-- Bouton du panneau / Panel button -->
	<button
		onclick={() => (isHistoryOpen = true)}
		class="lg:hidden flex items-center justify-center w-touch h-touch flex-shrink-0 rounded-button text-ink-2 hover:bg-border-soft transition-colors touch-manipulation"
		aria-label={$_("header.conversationHistory")}
	>
		<svg
			class="w-5 h-5"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="1.9"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" />
		</svg>
	</button>

	<!-- Marque et modèle / Brand and model -->
	<div class="lg:hidden flex-grow min-w-0">
		<div class="text-[15px] font-semibold text-ink truncate">
			{$_("app.title")}
		</div>
		<div class="font-mono text-[11px] text-ink-3 truncate">
			{getModelDisplayName(
				llmStore.selectedModel,
				llmStore.customModels
			)}
			·
			{isModelLocal
				? $_("header.modelOffline")
				: $_("header.modelToDownload")}
		</div>
	</div>

	<!-- Nouvelle conversation / New conversation -->
	<button
		onclick={onnew}
		class="lg:hidden flex items-center justify-center w-touch h-touch flex-shrink-0 rounded-button bg-ink text-bg-raised hover:bg-ink-2 transition-colors touch-manipulation"
		aria-label={$_("header.newConversation")}
		title={$_("header.startNewConversation")}
	>
		<svg
			class="w-[18px] h-[18px]"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 5v14" /><path d="M5 12h14" />
		</svg>
	</button>

	<!-- ==================== Bureau / Desktop ==================== -->

	<!-- Zone identité / Identity zone -->
	<div class="hidden lg:flex items-center gap-2.5 w-[228px] flex-shrink-0">
		<button
			onclick={() => (isHistoryOpen = !isHistoryOpen)}
			class="flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-control text-ink-2 hover:bg-border-soft transition-colors"
			aria-label={isHistoryOpen
				? $_("header.hideHistory")
				: $_("header.showHistory")}
			aria-expanded={isHistoryOpen}
		>
			<svg
				class="w-[18px] h-[18px]"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.9"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<rect x="3" y="4" width="18" height="16" rx="2" />
				<path d="M9 4v16" />
			</svg>
		</button>
		<a href="/" class="flex items-center gap-2 min-w-0 group">
			<img
				src={themeStore.isLight ? logoDark : logo}
				alt=""
				class="w-6 h-6 flex-shrink-0 group-hover:scale-110 transition-transform"
			/>
			<span
				class="font-display font-extrabold text-base text-ink truncate"
			>
				{$_("app.title")}
			</span>
		</a>
	</div>

	<!-- Zone contexte / Context zone -->
	<div class="hidden lg:flex flex-grow items-center gap-3 min-w-0">
		{#if conversationTitle}
			<div class="text-[15px] font-semibold text-ink truncate">
				{conversationTitle}
			</div>
		{/if}

		<div class="flex-shrink-0 max-w-[340px]">
			<ModelSelector
				onselect={onmodelselect}
				onmanage={() => (isAddModelModalOpen = true)}
				{isModelLocal}
				{modelSize}
			/>
		</div>

		{#if contextPercent !== null}
			<div class="flex items-center gap-[7px] flex-shrink-0 whitespace-nowrap">
				<div
					class="w-21 h-1.5 rounded-full bg-border-soft overflow-hidden"
				>
					<div
						class="h-full bg-accent"
						style="width: {contextPercent}%"
					></div>
				</div>
				<span class="font-mono text-xs text-ink-3">
					{$_("header.contextUsed", {
						values: { percent: contextPercent },
					})}
				</span>
			</div>
		{/if}
	</div>

	<!-- Zone actions / Actions zone -->
	<div class="hidden lg:flex items-center gap-1.5 flex-shrink-0">
		<button
			onclick={onnew}
			class="h-9 px-3.5 rounded-control bg-ink text-white text-sm font-semibold hover:bg-ink-2 transition-colors touch-manipulation"
			title={$_("header.startNewConversation")}
		>
			{$_("header.newConversation")}
		</button>
		<button
			onclick={() => (isSettingsModalOpen = true)}
			class="flex items-center justify-center w-9 h-9 rounded-control bg-surface border border-border text-ink-2 hover:bg-bg transition-colors"
			aria-label={$_("settings.title")}
			title={$_("settings.title")}
		>
			<svg
				class="w-4 h-4"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="12" cy="12" r="3" />
				<path d="M4 12h2" /><path d="M18 12h2" />
				<path d="M12 4v2" /><path d="M12 18v2" />
				<path d="m6.3 6.3 1.4 1.4" /><path d="m16.3 16.3 1.4 1.4" />
				<path d="m17.7 6.3-1.4 1.4" /><path d="m7.7 16.3-1.4 1.4" />
			</svg>
		</button>
	</div>
</header>
