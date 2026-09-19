<script>
	/**
	 * Enveloppe modale de la base de connaissances (RAG local).
	 * Knowledge base (local RAG) modal wrapper.
	 */
	import KnowledgeBase from "$lib/components/KnowledgeBase.svelte";

	/** @type {{ isOpen?: boolean }} */
	let { isOpen = $bindable(false) } = $props();
</script>

{#if isOpen}
	<div
		class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center"
		role="dialog"
		aria-modal="true"
		aria-labelledby="rag-test-title"
		tabindex="-1"
		onclick={(e) => e.target === e.currentTarget && (isOpen = false)}
		onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
	>
		<div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-lg p-4 max-h-[85vh] overflow-y-auto">
			<div class="flex justify-between items-center mb-4">
			<h2 id="rag-test-title" class="text-xl font-bold text-gray-900 dark:text-white">
					🧠 Base de connaissances / Knowledge base
				</h2>
				<button
					onclick={() => (isOpen = false)}
					class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				>
					✕
				</button>
			</div>
			<KnowledgeBase />
		</div>
	</div>
{/if}
