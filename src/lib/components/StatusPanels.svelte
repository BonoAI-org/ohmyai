<script>
	/**
	 * Bandeaux d'état du moteur affichés au-dessus de la conversation :
	 * mémoire insuffisante, chargement en cours, erreur.
	 * Engine status banners shown above the conversation: insufficient memory,
	 * loading in progress, error.
	 *
	 * L'écran de téléchargement n'est plus ici : tant qu'aucun modèle n'est
	 * installé, `WelcomeScreen` occupe seul la page.
	 * The download screen is no longer here: while no model is installed,
	 * `WelcomeScreen` owns the page on its own.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { MIN_RAM_GB } from "$lib/llm/hardware.js";
	import { formatBytes } from "$lib/llm/downloadProgress.js";

	/** @type {{ hasEnoughRAM: boolean }} */
	let { hasEnoughRAM } = $props();
</script>

<!-- Avertissement mémoire insuffisante / Insufficient memory warning -->
{#if !hasEnoughRAM}
	<div
		class="mb-4 p-4 rounded-card bg-warn-soft border border-warn-border flex items-start gap-3"
	>
		<svg
			class="w-5 h-5 flex-shrink-0 mt-0.5 text-warn-ink"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M12 9v4" /><path d="M12 17h.01" />
			<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
		</svg>
		<div>
			<p class="font-semibold text-ink">{$_("ram.warning")}</p>
			<p class="mt-1 text-sm text-warn-ink">
				{$_("ram.insufficientMessage", { values: { min: MIN_RAM_GB } })}
			</p>
			<p class="mt-2 text-xs text-warn-ink">{$_("ram.tip")}</p>
		</div>
	</div>
{/if}

<!-- Chargement du modèle / Model loading -->
{#if llmStore.isLoading}
	{@const pct = llmStore.loadingPercent}
	<div class="mb-4 p-6 rounded-card bg-surface border border-border flex flex-col gap-4">
		<div class="flex items-baseline justify-between gap-4">
			<p class="font-semibold text-ink">{$_("loading.loadingModel")}</p>
			{#if pct !== null}
				<span class="font-mono text-sm text-ink-2 tabular-nums">{pct} %</span>
			{/if}
		</div>

		<!-- Barre de progression. Sans pourcentage mesurable, elle reste
		     indéterminée : une barre à zéro laisserait croire à un blocage. -->
		<!-- Progress bar. With no measurable percentage it stays indeterminate:
		     a bar at zero would suggest a stall. -->
		<div
			class="h-2 rounded-full bg-border-soft overflow-hidden"
			role="progressbar"
			aria-valuemin="0"
			aria-valuemax="100"
			aria-valuenow={pct ?? undefined}
			aria-label={$_("loading.loadingModel")}
		>
			{#if pct === null}
				<div class="h-full w-2/5 rounded-full bg-accent animate-progress-indeterminate"></div>
			{:else}
				<div
					class="h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
					style="width: {Math.max(pct, 2)}%"
				></div>
			{/if}
		</div>

		<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
			<p class="font-mono text-xs text-ink-3 truncate max-w-full">
				{llmStore.loadingFile || llmStore.loadingProgress}
			</p>
			{#if llmStore.loadingBytes}
				<p class="font-mono text-xs text-ink-3 whitespace-nowrap tabular-nums">
					{formatBytes(llmStore.loadingBytes.loaded)} / {formatBytes(
						llmStore.loadingBytes.total
					)}
				</p>
			{/if}
		</div>

		<button
			onclick={() => llmStore.cancelLoading()}
			class="self-start h-touch px-4 rounded-button border border-danger-border bg-danger-soft text-sm font-semibold text-danger hover:bg-danger-soft/70 transition-colors"
		>
			{$_("loading.cancel")}
		</button>
	</div>
{/if}

<!-- Erreur / Error -->
{#if llmStore.error}
	<div class="mb-4 p-4 rounded-card bg-danger-soft border border-danger-border">
		<p class="text-danger">
			<strong class="font-semibold">{$_("error.title")} :</strong>
			{llmStore.error}
		</p>
	</div>
{/if}
