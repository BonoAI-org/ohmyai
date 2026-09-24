<script>
	/**
	 * Sélecteur de modèle : bouton déclencheur et menu déroulant listant les
	 * modèles du catalogue puis les modèles personnalisés, avec leur état de
	 * téléchargement.
	 * Model selector: trigger button and dropdown listing catalog models then
	 * custom models, with their download state.
	 *
	 * Le composant gère lui-même sa fermeture au clic extérieur. La classe
	 * `model-selector-container` de sa racine sert à la fois à ce test et aux
	 * tests end-to-end : elle doit rester sur l'élément racine.
	 * The component handles its own close-on-outside-click. The
	 * `model-selector-container` class on its root serves both that test and
	 * the end-to-end tests: it must stay on the root element.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { AVAILABLE_MODELS, getModelDisplayName } from "$lib/llm/models.js";

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

	/**
	 * Ferme le menu puis délègue le changement de modèle à la page, qui porte
	 * la confirmation et le nettoyage du composeur.
	 * Closes the menu then delegates the model change to the page, which owns
	 * the confirmation prompt and the composer cleanup.
	 * @param {string} modelId
	 */
	function selectModel(modelId) {
		isOpen = false;
		showAllModels = false;
		onselect(modelId);
	}

	/**
	 * Referme le menu lorsqu'on clique ailleurs dans la page.
	 * Closes the menu when clicking elsewhere in the page.
	 */
	function handleClickOutside(event) {
		if (isOpen && !event.target.closest(".model-selector-container")) {
			isOpen = false;
			showAllModels = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<!-- Sélecteur de modèle / Model selector -->
<div
	class="relative model-selector-container flex-shrink-0"
>
	<button
		onclick={(e) => {
			e.stopPropagation();
			isOpen = !isOpen;
			if (!isOpen) showAllModels = false;
		}}
		disabled={llmStore.isLoading ||
			llmStore.isGenerating}
		class="flex items-center gap-2 h-[30px] px-2.5 bg-surface border border-border rounded-full text-[13px] text-ink hover:bg-bg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation whitespace-nowrap"
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

	<!-- Menu déroulant / Dropdown menu -->
	{#if isOpen}
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
							selectModel(model.id)}
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
										selectModel(
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
							isOpen = false;
							onmanage();
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
