<script>
	/**
	 * Enveloppe modale des réglages.
	 * Settings modal wrapper.
	 *
	 * Échap fermait déjà en apparence : l'écouteur vivait sur le conteneur,
	 * qui portait `tabindex="-1"` mais ne recevait jamais le focus, si bien
	 * qu'aucune touche ne lui parvenait. L'écoute se fait désormais au niveau
	 * de la fenêtre, et le focus entre dans la modale à l'ouverture puis
	 * retourne au bouton d'origine à la fermeture.
	 * Escape only appeared to close: the listener lived on the container,
	 * which carried `tabindex="-1"` but never received focus, so no key ever
	 * reached it. Listening now happens at the window level, and focus enters
	 * the modal on open then returns to the origin button on close.
	 */
	import { tick } from "svelte";
	import Settings from "$lib/components/Settings.svelte";
	import { _ } from "svelte-i18n";

	/** @type {{ isOpen?: boolean, onmanagemodels?: () => void }} */
	let { isOpen = $bindable(false), onmanagemodels = () => {} } = $props();

	let dialogEl = $state(null);

	// Élément qui avait le focus avant l'ouverture, pour le lui rendre.
	// Element that held focus before opening, to give it back.
	let previouslyFocused = null;

	$effect(() => {
		if (isOpen) {
			previouslyFocused =
				typeof document !== "undefined" ? document.activeElement : null;
			tick().then(() => dialogEl?.focus());
		} else if (previouslyFocused) {
			previouslyFocused.focus?.();
			previouslyFocused = null;
		}
	});

	function handleKeydown(event) {
		if (isOpen && event.key === "Escape") {
			event.preventDefault();
			isOpen = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen}
	<div
		class="fixed inset-0 z-50 bg-ink/50 flex items-center justify-center p-4"
		role="presentation"
		onclick={(e) => e.target === e.currentTarget && (isOpen = false)}
	>
		<div
			bind:this={dialogEl}
			class="bg-surface rounded-card-lg shadow-[0_24px_64px_rgba(20,18,13,0.24)] w-full max-w-md outline-none"
			role="dialog"
			aria-modal="true"
			aria-label={$_("settings.title")}
			tabindex="-1"
		>
			<Settings close={() => (isOpen = false)} {onmanagemodels} />
		</div>
	</div>
{/if}
