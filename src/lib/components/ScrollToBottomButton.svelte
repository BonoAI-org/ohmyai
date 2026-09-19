<script>
	/**
	 * Bouton flottant ramenant la conversation en bas.
	 * Floating button that scrolls the conversation back to the bottom.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";

	/** @type {{ onclick: () => void }} */
	let { onclick } = $props();
</script>

<!-- Bouton pour revenir en bas / Button to scroll to bottom -->
{#if llmStore.messages.length > 0}
	<div
		class="sticky bottom-4 left-0 right-0 flex justify-center pointer-events-none"
	>
		<button
			{onclick}
			class="pointer-events-auto flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-full shadow-lg transition-all animate-bounce"
			aria-label={$_("chat.scrollToBottom")}
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
					d="M19 14l-7 7m0 0l-7-7m7 7V3"
				/>
			</svg>
			<span class="text-sm font-medium"
				>{$_("chat.scrollToBottom")}</span
			>
		</button>
	</div>
{/if}
