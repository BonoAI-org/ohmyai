<script>
	/**
	 * Sélecteur de modèle : une puce qui dit l'état du modèle courant, et un
	 * menu qui trie tous les modèles par compatibilité avec la machine.
	 * Model selector: a chip stating the current model's state, and a menu that
	 * sorts every model by fit with the machine.
	 *
	 * Le catalogue et les modèles personnalisés forment une seule liste : ils
	 * se distinguent par un badge, plus par deux blocs de markup jumeaux.
	 * The catalog and the custom models form a single list: they are told apart
	 * by a badge, no longer by two twin blocks of markup.
	 *
	 * La classe `model-selector-container` de la racine sert aux tests unitaires
	 * et end-to-end : elle doit y rester.
	 * The `model-selector-container` class on the root serves the unit and
	 * end-to-end tests: it must stay there.
	 */
	import { _ } from "svelte-i18n";
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { AVAILABLE_MODELS, getModelDisplayName } from "$lib/llm/models.js";
	import { hasUsableWebGPU } from "$lib/llm/hardware.js";
	import { classifyModel, sortByFit } from "$lib/llm/modelFit.js";

	/**
	 * @type {{
	 *   onselect: (modelId: string) => void,
	 *   onmanage: () => void,
	 *   isModelLocal?: boolean,
	 *   modelSize?: string
	 * }}
	 */
	let { onselect, onmanage, isModelLocal = false, modelSize = "" } = $props();

	let isOpen = $state(false);
	let query = $state("");

	// Au-delà de ce nombre d'entrées, la recherche apparaît.
	// Past this many entries, the search field appears.
	const SEARCH_THRESHOLD = 10;

	// Diagnostic matériel, pour classer les modèles. `null` tant qu'inconnu.
	// Hardware diagnosis, to rank the models. `null` while unknown.
	let hasWebGPU = $state(null);
	const deviceMemoryGB =
		typeof navigator !== "undefined" &&
		typeof navigator.deviceMemory === "number"
			? navigator.deviceMemory
			: null;

	onMount(async () => {
		hasWebGPU = await hasUsableWebGPU();
	});

	/** Tous les modèles, catalogue puis personnalisés, marqués de leur origine. */
	const allModels = $derived([
		...AVAILABLE_MODELS.map((m) => ({ ...m, isCustom: false })),
		...llmStore.customModels.map((m) => ({ ...m, isCustom: true })),
	]);

	/** @param {{ id: string }} model */
	function fitOf(model) {
		return classifyModel(model, {
			isInstalled: Boolean(llmStore.downloadedModels[model.id]),
			hasWebGPU,
			deviceMemoryGB,
		});
	}

	const filtered = $derived(
		query.trim()
			? allModels.filter((m) =>
					`${m.name} ${m.description ?? ""}`
						.toLowerCase()
						.includes(query.trim().toLowerCase())
				)
			: allModels
	);

	const ranked = $derived(sortByFit(filtered, fitOf));

	const showSearch = $derived(allModels.length > SEARCH_THRESHOLD);

	// Classes du badge d'état, une par verdict.
	const FIT_STYLES = {
		installed: "bg-accent-soft text-accent",
		suitable: "bg-surface border border-border text-ink-2",
		slow: "bg-warn-soft text-warn-ink",
		incompatible: "bg-danger-soft text-danger",
	};

	/**
	 * Ferme le menu puis délègue le changement de modèle à la page, qui porte
	 * la confirmation et le nettoyage du composeur.
	 * Closes the menu then delegates the model change to the page, which owns
	 * the confirmation prompt and the composer cleanup.
	 * @param {string} modelId
	 */
	function selectModel(modelId) {
		isOpen = false;
		query = "";
		onselect(modelId);
	}

	/**
	 * Referme le menu lorsqu'on clique ailleurs dans la page.
	 * Closes the menu when clicking elsewhere in the page.
	 */
	function handleClickOutside(event) {
		if (isOpen && !event.target.closest(".model-selector-container")) {
			isOpen = false;
			query = "";
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative model-selector-container flex-shrink-0">
	<button
		onclick={(e) => {
			e.stopPropagation();
			isOpen = !isOpen;
			if (!isOpen) query = "";
		}}
		disabled={llmStore.isLoading || llmStore.isGenerating}
		class="hit-44 flex items-center gap-2 h-[30px] px-2.5 bg-surface border border-border rounded-full text-[13px] text-ink hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation whitespace-nowrap"
		aria-label={$_("header.selectModel")}
		aria-expanded={isOpen}
	>
		<span
			class="w-[7px] h-[7px] flex-shrink-0 rounded-full {isModelLocal
				? 'bg-accent'
				: 'bg-warn'}"
			aria-hidden="true"
		></span>
		<span class="truncate max-w-[150px]">
			{getModelDisplayName(llmStore.selectedModel, llmStore.customModels)}
		</span>
		<span class="font-mono text-xs text-ink-3 whitespace-nowrap">
			{modelSize ? `${modelSize} · ` : ""}{isModelLocal
				? $_("header.modelLocal")
				: $_("header.modelToDownload")}
		</span>
	</button>

	{#if isOpen}
		<div
			class="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 mx-4 sm:mx-0 sm:w-[420px] bg-surface border border-border rounded-card shadow-[0_12px_32px_rgba(20,18,13,0.12)] z-[100] max-h-[70vh] flex flex-col overflow-hidden"
		>
			<div class="flex-shrink-0 p-2.5 border-b border-border-soft">
				<div
					class="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3 px-1 pb-2"
				>
					{$_("header.chooseModel")}
				</div>
				{#if showSearch}
					<label
						class="flex items-center gap-2 h-touch px-2.5 border border-border rounded-control bg-bg-raised focus-within:border-accent transition-colors"
					>
						<svg class="w-[15px] h-[15px] flex-shrink-0 text-ink-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
						<span class="sr-only">{$_("model.searchLabel")}</span>
						<input
							type="search"
							bind:value={query}
							onclick={(e) => e.stopPropagation()}
							placeholder={$_("model.searchPlaceholder")}
							class="flex-grow self-stretch min-w-0 border-0 outline-none bg-transparent p-0 text-sm text-ink placeholder:text-ink-3 focus:ring-0"
						/>
					</label>
				{/if}
			</div>

			<div class="flex-grow min-h-0 overflow-y-auto p-1.5">
				{#if ranked.length === 0}
					<p class="px-3 py-6 text-sm text-ink-3 text-center">
						{$_("model.noResults")}
					</p>
				{/if}

				{#each ranked as model (model.id)}
					{@const fit = fitOf(model)}
					{@const isCurrent = model.id === llmStore.selectedModel}
					{@const isBusy = llmStore.isLoading && isCurrent}
					<button
						onclick={() => selectModel(model.id)}
						class="w-full text-left p-3 rounded-control transition-colors {isCurrent
							? 'bg-accent-soft'
							: 'hover:bg-bg'}"
					>
						<div class="flex items-start justify-between gap-2.5">
							<div class="min-w-0">
								<div class="flex items-center gap-2 flex-wrap">
									<span class="font-semibold text-ink">
										{model.name}
									</span>
									{#if model.isCustom}
										<span
											class="px-2 py-0.5 rounded-full bg-surface border border-border text-[11px] text-ink-2"
										>
											{$_("model.custom")}
										</span>
									{/if}
									{#if model.recommended}
										<span
											class="px-2 py-0.5 rounded-full bg-accent-soft text-accent text-[11px] font-semibold"
										>
											{$_("model.recommended")}
										</span>
									{/if}
								</div>
								{#if model.description}
									<p class="mt-1 text-[13px] leading-[1.4] text-ink-2">
										{model.description}
									</p>
								{/if}
							</div>

							<!-- Poids et état en badges, plus noyés dans la description -->
							<!-- Weight and state as badges, no longer buried in the description -->
							<div class="flex-shrink-0 flex flex-col items-end gap-1">
								<span
									class="px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap {isBusy
										? 'bg-warn-soft text-warn-ink'
										: FIT_STYLES[fit]}"
								>
									{isBusy
										? $_("model.fit.loading")
										: $_(`model.fit.${fit}`)}
								</span>
								{#if model.size}
									<span class="font-mono text-xs text-ink-3 whitespace-nowrap">
										{model.size}
									</span>
								{/if}
							</div>
						</div>
					</button>
				{/each}
			</div>

			<div class="flex-shrink-0 p-1.5 border-t border-border-soft">
				<button
					onclick={(e) => {
						e.stopPropagation();
						isOpen = false;
						onmanage();
					}}
					class="w-full h-touch px-3 rounded-control text-sm font-medium text-ink hover:bg-bg transition-colors"
				>
					{$_("model.manage")}
				</button>
			</div>
		</div>
	{/if}
</div>
