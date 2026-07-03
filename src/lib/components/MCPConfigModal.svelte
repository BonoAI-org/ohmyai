<script>
    import { mcpStore } from "$lib/stores/mcp.svelte.js";
    import { _ } from "svelte-i18n";

    let { isOpen = $bindable(false) } = $props();

    let activeTab = $state("servers");

    // Add server form state
    let serverName = $state("");
    let serverUrl = $state("");
    let apiKey = $state("");
    let addError = $state("");
    let testResult = $state(null); // null | { success: boolean, toolCount: number, error?: string }
    let isTesting = $state(false);

    function closeModal() {
        isOpen = false;
        resetForm();
        activeTab = "servers";
    }

    function resetForm() {
        serverName = "";
        serverUrl = "";
        apiKey = "";
        addError = "";
        testResult = null;
    }

    async function testConnection() {
        if (!serverUrl) return;
        isTesting = true;
        testResult = null;

        try {
            const response = await fetch('/api/mcp/tools/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ serverUrl, apiKey: apiKey || undefined })
            });
            const data = await response.json();

            if (response.ok && data.tools) {
                testResult = { success: true, toolCount: data.tools.length };
            } else {
                testResult = { success: false, error: data.error || 'Unknown error' };
            }
        } catch (err) {
            testResult = { success: false, error: err.message };
        } finally {
            isTesting = false;
        }
    }

    function addServer() {
        if (!serverName.trim() || !serverUrl.trim()) {
            addError = "Name and URL are required";
            return;
        }

        try {
            new URL(serverUrl);
        } catch {
            addError = "Invalid URL";
            return;
        }

        mcpStore.addServer({
            name: serverName.trim(),
            url: serverUrl.trim(),
            apiKey: apiKey.trim() || undefined
        });

        resetForm();
        activeTab = "servers";
        mcpStore.discoverTools();
    }

    function removeServer(id) {
        mcpStore.removeServer(id);
    }

    function getStatusColor(status) {
        if (status === 'connected') return 'bg-green-500';
        if (status === 'error') return 'bg-red-500';
        return 'bg-slate-400';
    }

    function getStatusLabel(status) {
        if (status === 'connected') return $_('mcp.connected');
        if (status === 'error') return $_('mcp.error');
        return $_('mcp.disconnected');
    }
</script>

{#if isOpen}
    <!-- Overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onclick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
    >
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <!-- Header -->
            <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h2 class="text-lg font-bold text-slate-800 dark:text-white">{$_('mcp.title')}</h2>
                <button
                    onclick={closeModal}
                    class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                    aria-label={$_('mcp.close')}
                >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Tabs -->
            <div class="flex border-b border-slate-200 dark:border-slate-700 px-4">
                <button
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'servers' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
                    onclick={() => activeTab = 'servers'}
                >
                    {$_('mcp.servers')}
                </button>
                <button
                    class="px-4 py-2 text-sm font-medium border-b-2 transition-colors {activeTab === 'add' ? 'border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}"
                    onclick={() => activeTab = 'add'}
                >
                    {$_('mcp.addServer')}
                </button>
            </div>

            <!-- Body -->
            <div class="flex-1 overflow-y-auto p-4">
                {#if activeTab === 'servers'}
                    <!-- Server list -->
                    {#if mcpStore.servers.length === 0}
                        <p class="text-sm text-slate-500 dark:text-slate-400 text-center py-8">
                            {$_('mcp.noServers')}
                        </p>
                    {:else}
                        <div class="space-y-3">
                            {#each mcpStore.servers as server}
                                <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3 border border-slate-200 dark:border-slate-600">
                                    <div class="flex items-center justify-between">
                                        <div class="flex items-center gap-2 min-w-0">
                                            <span class="w-2.5 h-2.5 rounded-full flex-shrink-0 {getStatusColor(server.status)}"></span>
                                            <span class="font-medium text-sm text-slate-800 dark:text-white truncate">{server.name}</span>
                                        </div>
                                        <div class="flex items-center gap-1.5 flex-shrink-0">
                                            <button
                                                onclick={() => mcpStore.toggleServer(server.id)}
                                                class="text-xs px-2 py-1 rounded {server.enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-slate-200 text-slate-500 dark:bg-slate-600 dark:text-slate-400'}"
                                            >
                                                {server.enabled ? $_('mcp.disable') : $_('mcp.enable')}
                                            </button>
                                            <button
                                                onclick={() => { if (confirm($_('mcp.removeConfirm'))) removeServer(server.id); }}
                                                class="text-xs px-2 py-1 rounded bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50"
                                            >
                                                {$_('mcp.remove')}
                                            </button>
                                        </div>
                                    </div>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{server.url}</p>
                                    <p class="text-xs mt-1 {server.status === 'connected' ? 'text-green-600 dark:text-green-400' : server.status === 'error' ? 'text-red-500' : 'text-slate-400'}">
                                        {getStatusLabel(server.status)}
                                        {#if server.status === 'connected'}
                                            — {mcpStore.availableTools.filter(t => t.serverId === server.id).length} tool(s)
                                        {/if}
                                    </p>
                                </div>
                            {/each}
                        </div>
                    {/if}

                    {#if mcpStore.availableTools.length > 0}
                        <div class="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <p class="text-xs font-medium text-slate-600 dark:text-slate-300 mb-2">
                                {$_('mcp.toolsAvailable', { values: { count: mcpStore.availableTools.length } })}
                            </p>
                            <div class="flex flex-wrap gap-1.5">
                                {#each mcpStore.availableTools as tool}
                                    <span class="text-[11px] bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full" title={tool.description}>
                                        {tool.name}
                                    </span>
                                {/each}
                            </div>
                        </div>
                    {/if}

                {:else if activeTab === 'add'}
                    <!-- Add server form -->
                    <div class="space-y-4">
                        <div>
                            <label for="mcp-server-name" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {$_('mcp.serverName')}
                            </label>
                            <input
                                id="mcp-server-name"
                                type="text"
                                bind:value={serverName}
                                placeholder="My MCP Server"
                                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label for="mcp-server-url" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {$_('mcp.serverUrl')}
                            </label>
                            <input
                                id="mcp-server-url"
                                type="url"
                                bind:value={serverUrl}
                                placeholder="https://mcp-server.example.com/mcp"
                                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        <div>
                            <label for="mcp-api-key" class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                {$_('mcp.apiKey')}
                            </label>
                            <input
                                id="mcp-api-key"
                                type="password"
                                bind:value={apiKey}
                                placeholder="sk-..."
                                class="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                        </div>

                        {#if addError}
                            <p class="text-sm text-red-500">{addError}</p>
                        {/if}

                        {#if testResult}
                            <div class="text-sm p-2 rounded-lg {testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'}">
                                {#if testResult.success}
                                    {$_('mcp.connected')} — {$_('mcp.toolsFound', { values: { count: testResult.toolCount } })}
                                {:else}
                                    {$_('mcp.error')}: {testResult.error}
                                {/if}
                            </div>
                        {/if}

                        <div class="flex gap-2">
                            <button
                                onclick={testConnection}
                                disabled={!serverUrl || isTesting}
                                class="flex-1 px-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50"
                            >
                                {isTesting ? $_('mcp.testing') : $_('mcp.testConnection')}
                            </button>
                            <button
                                onclick={addServer}
                                disabled={!serverName || !serverUrl}
                                class="flex-1 px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                            >
                                {$_('mcp.add')}
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
