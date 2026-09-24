<script>
	/**
	 * Liste des messages de la conversation, avec l'écran d'accueil quand elle
	 * est vide et l'indicateur de génération en cours.
	 * Conversation message list, with the welcome screen when empty and the
	 * in-progress generation indicator.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import ChatMessage from "$lib/components/ChatMessage.svelte";

	/**
	 * @type {{
	 *   onreuse: (content: string) => void,
	 *   onsave: (content: string) => void,
	 *   onexport?: () => void
	 * }}
	 */
	let { onreuse, onsave, onexport = () => {} } = $props();
</script>

<!-- Messages de chat / Chat messages -->
<div class="space-y-4 pb-4">
	{#if llmStore.messages.length > 0}
		<div class="flex justify-end">
			<button
				onclick={onexport}
				class="flex items-center gap-2 h-9 px-3 rounded-control border border-border bg-surface text-[13px] text-ink-2 hover:text-ink hover:bg-bg transition-colors"
				aria-label={$_("chat.exportMarkdown")}
				title={$_("chat.exportMarkdown")}
			>
				<svg class="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 19h16" /></svg>
				{$_("chat.export")}
			</button>
		</div>
	{/if}
	{#if llmStore.messages.length === 0 && !llmStore.isLoading}
		<div class="text-center text-slate-400 py-12">
			<svg
				class="w-16 h-16 mx-auto mb-4 opacity-50"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
				/>
			</svg>
			<p class="text-lg">{$_("chat.startConversation")}</p>
			<p class="text-sm mt-2">{$_("chat.runsInBrowser")}</p>
		</div>
	{/if}

	{#each llmStore.messages as message, index (index)}
		<ChatMessage
		{message}
		onreuse={(content) => onreuse(content)}
		onsave={(content) => onsave(content)}
	/>
	{/each}

	{#if llmStore.isGenerating && llmStore.messages[llmStore.messages.length - 1]?.content === ""}
		<div class="flex gap-2 items-center text-slate-400">
			<div class="flex gap-1">
				<div
					class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
					style="animation-delay: 0ms;"
				></div>
				<div
					class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
					style="animation-delay: 150ms;"
				></div>
				<div
					class="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
					style="animation-delay: 300ms;"
				></div>
			</div>
			<span class="text-sm">{$_("chat.generating")}</span>
		</div>
	{/if}
</div>
