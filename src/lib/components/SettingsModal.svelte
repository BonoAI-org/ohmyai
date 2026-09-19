<script>
	/**
	 * Enveloppe modale des paramètres : fond assombri, fermeture au clic sur
	 * le fond ou à la touche Échap.
	 * Settings modal wrapper: dimmed backdrop, closes on backdrop click or
	 * Escape key.
	 */
	import Settings from "$lib/components/Settings.svelte";

	/** @type {{ isOpen?: boolean }} */
	let { isOpen = $bindable(false) } = $props();
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		aria-label="Paramètres / Settings"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && (isOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
	>
		<div class="bg-slate-800 rounded-lg shadow-xl w-full max-w-md">
			<Settings close={() => (isOpen = false)} />
		</div>
	</div>
{/if}
