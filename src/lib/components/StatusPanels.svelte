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
	<div
		class="mb-4 p-8 rounded-card bg-surface border border-border flex flex-col items-center gap-4 text-center"
	>
		<div
			class="animate-spin rounded-full h-12 w-12 border-4 border-accent border-t-transparent"
		></div>
		<div>
			<p class="font-semibold text-ink">{$_("loading.loadingModel")}</p>
			<p class="mt-2 font-mono text-sm text-ink-3">
				{llmStore.loadingProgress}
			</p>
		</div>
		<button
			onclick={() => llmStore.cancelLoading()}
			class="h-touch px-4 rounded-button border border-danger-border bg-danger-soft text-sm font-semibold text-danger hover:bg-danger-soft/70 transition-colors"
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
