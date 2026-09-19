<script>
	/**
	 * Bandeaux d'état du moteur, affichés au-dessus de la conversation :
	 * RAM insuffisante, chargement en cours, écran de téléchargement avec
	 * vérification matérielle, et erreur.
	 * Engine status banners shown above the conversation: insufficient RAM,
	 * loading in progress, download screen with hardware check, and error.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";

	/** @type {{ hasEnoughRAM: boolean }} */
	let { hasEnoughRAM } = $props();
</script>

<!-- Avertissement RAM insuffisante / Insufficient RAM warning -->
{#if !hasEnoughRAM}
	<div
		class="bg-orange-600/20 border border-orange-600/50 rounded-lg p-4 mb-4 flex items-start gap-3"
	>
		<svg
			class="w-6 h-6 text-orange-400 flex-shrink-0 mt-0.5"
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
		<div class="text-orange-200">
			<p class="font-semibold mb-1">{$_("ram.warning")}</p>
			<p class="text-sm text-orange-300">
				{$_("ram.insufficientMessage", {
					values: { min: MIN_RAM_GB },
				})}
			</p>
			<p class="text-xs text-orange-400 mt-2">
				{$_("ram.tip")}
			</p>
		</div>
	</div>
{/if}

<!-- Statut du chargement / Loading status -->
{#if llmStore.isLoading}
	<div
		class="bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 text-center mb-4"
	>
		<div class="flex flex-col items-center gap-4">
			<div
				class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"
			></div>
			<div class="text-white">
				<p class="font-semibold">
					{$_("loading.loadingModel")}
				</p>
				<p class="text-sm text-slate-300 mt-2">
					{llmStore.loadingProgress}
				</p>
			</div>
			<button
				onclick={() => llmStore.cancelLoading()}
				class="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
			>
				Annuler / Cancel
			</button>
		</div>
	</div>
{:else if llmStore.needsDownload}
	<!-- Demande de téléchargement / Download prompt -->
	<div
		class="bg-white dark:bg-slate-800/50 backdrop-blur-sm rounded-lg p-8 text-center mb-4 border border-purple-500/30"
	>
		<div class="flex flex-col items-center gap-4">
			<svg
				class="w-12 h-12 text-purple-500 dark:text-purple-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
				/>
			</svg>
			<div class="text-slate-900 dark:text-white text-lg">
				<p class="font-semibold mb-2">
					{$_("loading.downloadRequired", {
						default:
							"Téléchargement requis / Download required",
					})}
				</p>
				<p
					class="text-sm text-slate-600 dark:text-slate-300"
				>
					{$_("loading.notOnDevice", {
						default:
							"Le modèle sélectionné n'est pas encore sur cet appareil. / The selected model is not on this device yet.",
					})}
				</p>
				<p
					class="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto"
				>
					{$_("loading.downloadWarning", {
						default:
							"Le téléchargement peut prendre plusieurs minutes et consommer des données. Wi-Fi recommandé. / Download may take several minutes and use data. Wi-Fi recommended.",
					})}
				</p>
			</div>
			{#if llmStore.hardwareCheck && !llmStore.hardwareCheck.supported}
				<!-- Avertissement matériel insuffisant / Insufficient hardware warning -->
				<div
					class="bg-amber-500/15 border border-amber-500/60 rounded-lg p-3 text-sm max-w-md mx-auto"
				>
					<p
						class="font-semibold text-amber-700 dark:text-amber-300"
					>
						⚠️ {$_("loading.hardwareUnsupported", {
							default:
								"Cet appareil ne semble pas assez puissant pour ce modèle. / This device does not seem powerful enough for this model.",
						})}
					</p>
					<p
						class="text-xs mt-1 text-amber-700/90 dark:text-amber-300/90"
					>
						{$_("loading.hardwareRequired", {
							default: "Mémoire requise / Required memory",
						})}: ~{llmStore.hardwareCheck.requiredGB} GB
						{#if llmStore.hardwareCheck.deviceMemoryGB}
							• {$_("loading.hardwareDetected", {
								default: "RAM détectée / Detected RAM",
							})}: {llmStore.hardwareCheck
								.deviceMemoryGB}{llmStore.hardwareCheck
								.deviceMemoryGB >= 8
								? "+"
								: ""} GB
						{/if}
						{#if llmStore.hardwareCheck.gpuMaxBufferGB}
							• {$_("loading.hardwareGpuBuffer", {
								default: "Buffer GPU max / Max GPU buffer",
							})}: {llmStore.hardwareCheck.gpuMaxBufferGB} GB
						{/if}
					</p>
				</div>
			{/if}
			<div class="flex gap-4 mt-4">
				{#if llmStore.hardwareCheck && !llmStore.hardwareCheck.supported}
					<button
						onclick={() => llmStore.initEngine(true)}
						class="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-semibold shadow"
					>
						{$_("loading.downloadAnyway", {
							default:
								"Télécharger quand même / Download anyway",
						})}
					</button>
				{:else}
					<button
						onclick={() => llmStore.initEngine(true)}
						class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold shadow"
					>
						{$_("loading.downloadNow", {
							default:
								"Télécharger maintenant / Download now",
						})}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Erreur / Error -->
{#if llmStore.error}
	<div
		class="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-4"
	>
		<p class="text-red-200">
			<strong>{$_("error.title")}:</strong>
			{llmStore.error}
		</p>
	</div>
{/if}
