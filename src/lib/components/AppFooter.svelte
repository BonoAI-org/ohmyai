<script>
	/**
	 * Pied de page dans le flux : crédit BonoAI, lien vers le dépôt et bouton
	 * d'installation. L'installation ne flotte plus par-dessus le pied de page.
	 * In-flow footer: BonoAI credit, repository link and install button. The
	 * install prompt no longer floats over the footer.
	 */
	import { _ } from "svelte-i18n";
	import { MIN_RAM_GB } from "$lib/llm/hardware.js";

	/**
	 * @type {{
	 *   showInstallButton?: boolean,
	 *   hasEnoughRAM?: boolean,
	 *   deferredInstall?: boolean,
	 *   oninstall?: () => void
	 * }}
	 */
	let {
		showInstallButton = false,
		hasEnoughRAM = true,
		deferredInstall = false,
		oninstall = () => {}
	} = $props();
</script>

<div
	class="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-ink-3"
>
	<span>{$_("footer.builtBy")}</span>
	<a
		href="https://bonoai.org"
		target="_blank"
		rel="noopener noreferrer"
		class="font-semibold text-accent hover:text-accent-hover transition-colors"
	>
		BonoAI
	</a>
	<span aria-hidden="true">·</span>
	<a
		href="https://github.com/BonoAI-org/ohmyai"
		target="_blank"
		rel="noopener noreferrer"
		class="flex items-center gap-1.5 hover:text-ink-2 transition-colors"
	>
		<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
			<path
				d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
			/>
		</svg>
		{$_("footer.sourceCode")}
	</a>

	{#if showInstallButton}
		<button
			onclick={oninstall}
			class="h-touch px-4 rounded-button border border-border bg-surface text-sm font-medium text-ink hover:bg-bg transition-colors touch-manipulation"
			title={$_("header.installApp")}
		>
			{$_("header.install")}
		</button>
	{:else if !hasEnoughRAM && deferredInstall}
		<!-- L'appareil est sous le minimum de mémoire : on dit pourquoi. -->
		<!-- The device is below the memory minimum: we say why. -->
		<span
			class="px-3 py-1.5 rounded-button bg-warn-soft border border-warn-border text-warn-ink text-[13px]"
		>
			{$_("ram.insufficientForInstall", {
				values: { min: MIN_RAM_GB },
			})}
		</span>
	{/if}
</div>
