<script>
    import { oramaStore } from '$lib/stores/orama.svelte.js';

    let inputText = $state('');
    let searchQuery = $state('');
    let searchResults = $state([]);

    async function handleAdd() {
        if (!inputText.trim()) return;
        await oramaStore.addDocument(inputText);
        inputText = '';
    }

    async function handleSearch() {
        if (!searchQuery.trim()) return;
        searchResults = await oramaStore.search(searchQuery);
    }
</script>

<div class="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
    <h3 class="text-lg font-bold">🧠 Local Vector DB Test (Orama)</h3>

    <div class="space-y-2">
        <label class="block text-sm font-medium">Add Knowledge</label>
        <div class="flex gap-2">
            <input
                type="text"
                bind:value={inputText}
                placeholder="Ex: My secret color is blue..."
                class="flex-1 p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                onkeydown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
                onclick={handleAdd}
                class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                disabled={oramaStore.isLoading}
            >
                Add
            </button>
        </div>
    </div>

    <div class="space-y-2">
        <label class="block text-sm font-medium">Semantic Search</label>
        <div class="flex gap-2">
            <input
                type="text"
                bind:value={searchQuery}
                placeholder="Ex: What is the secret color?"
                class="flex-1 p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
                onkeydown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button
                onclick={handleSearch}
                class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                disabled={oramaStore.isLoading}
            >
                Search
            </button>
        </div>
    </div>

    <div class="text-xs text-gray-500">
        Status: {oramaStore.status}
    </div>

    {#if searchResults.length > 0}
        <div class="mt-4 space-y-2">
            <h4 class="font-semibold text-sm">Results:</h4>
            {#each searchResults as result}
                <div class="p-2 bg-white dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-700 text-sm">
                    <div class="font-medium">{result.content}</div>
                    <div class="text-xs text-gray-400 mt-1">Score: {result.score.toFixed(4)}</div>
                </div>
            {/each}
        </div>
    {/if}
</div>
