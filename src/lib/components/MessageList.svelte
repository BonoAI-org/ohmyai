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
	 *   onexport?: () => void,
	 *   onsuggestion?: (prompt: string) => void
	 * }}
	 */
	let {
		onreuse,
		onsave,
		onexport = () => {},
		onsuggestion = () => {},
	} = $props();

	// Trois amorces, pour que l'écran vide propose au lieu de constater.
	// Three openers, so the empty screen offers instead of just stating.
	const SUGGESTIONS = ["summarize", "rewrite", "describe"];
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
	<!-- Modèle prêt, aucune conversation : on propose, on ne constate pas. -->
	<!-- Model ready, no conversation: we offer rather than state. -->
	{#if llmStore.messages.length === 0 && !llmStore.isLoading}
		<div class="py-10 flex flex-col gap-5">
			<div>
				<h2 class="text-2xl sm:text-[28px] leading-[1.08] text-ink">
					{$_("chat.empty.title")}
				</h2>
				<p class="mt-2 text-sm leading-[1.5] text-ink-2 max-w-[520px]">
					{$_("chat.empty.lede")}
				</p>
			</div>
			<div class="flex flex-col gap-2 max-w-[520px]">
				{#each SUGGESTIONS as key (key)}
					<button
						onclick={() => onsuggestion($_(`chat.empty.suggestions.${key}`))}
						class="min-h-touch px-3.5 py-2.5 text-left border border-border rounded-button bg-surface text-sm text-ink hover:bg-bg hover:border-accent transition-colors"
					>
						{$_(`chat.empty.suggestions.${key}`)}
					</button>
				{/each}
			</div>
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
