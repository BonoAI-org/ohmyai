<script>
	import { llmStore } from '$lib/stores/llm.svelte.js';
	import { db } from '$lib/db/conversationDB.js';

	/**
	 * Props du composant / Component props
	 */
	let { isOpen = $bindable(false) } = $props();

	// État pour renommer une conversation / State for renaming conversation
	let renamingId = $state(null);
	let renamingTitle = $state('');
	
	// État pour la recherche / Search state
	let searchQuery = $state('');
	let isSearching = $state(false);

	/**
	 * Charge une conversation / Load a conversation
	 */
	async function handleLoadConversation(conversationId) {
		await llmStore.loadConversation(conversationId);
		isOpen = false;
	}

	/**
	 * Démarre le renommage / Start renaming
	 */
	function startRenaming(conversation) {
		renamingId = conversation.id;
		renamingTitle = conversation.title;
	}

	/**
	 * Sauvegarde le nouveau titre / Save new title
	 */
	async function saveRename() {
		if (renamingId && renamingTitle.trim()) {
			await llmStore.renameConversation(renamingId, renamingTitle.trim());
		}
		renamingId = null;
		renamingTitle = '';
	}

	/**
	 * Annule le renommage / Cancel renaming
	 */
	function cancelRename() {
		renamingId = null;
		renamingTitle = '';
	}

	/**
	 * Supprime une conversation / Delete a conversation
	 */
	async function handleDelete(conversationId, event) {
		event.stopPropagation();
		if (confirm('Supprimer cette conversation ?\n\nDelete this conversation?')) {
			await llmStore.deleteConversation(conversationId);
		}
	}

	/**
	 * Formate la date / Format date
	 */
	function formatDate(timestamp) {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now - date;
		
		// Moins d'une heure / Less than an hour
		if (diff < 3600000) {
			const minutes = Math.floor(diff / 60000);
			return `Il y a ${minutes} min / ${minutes} min ago`;
		}
		
		// Aujourd'hui / Today
		if (date.toDateString() === now.toDateString()) {
			return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
		}
		
		// Hier / Yesterday
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) {
			return `Hier / Yesterday ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
		}
		
		// Date complète / Full date
		return date.toLocaleDateString('fr-FR', { 
			day: 'numeric', 
			month: 'short', 
			year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
		});
	}

	/**
	 * Exporte l'historique / Export history
	 */
	async function handleExport() {
		const data = await llmStore.exportHistory();
		const blob = new Blob([data], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `ho-my-ai-history-${new Date().toISOString().split('T')[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Importe l'historique / Import history
	 */
	function handleImport() {
		const input = document.createElement('input');
		input.type = 'file';
		input.accept = 'application/json';
		input.onchange = (e) => {
			const file = e.target.files[0];
			if (file) {
				const reader = new FileReader();
				reader.onload = async (event) => {
					try {
						const imported = await llmStore.importHistory(event.target.result);
						alert(`Historique importé avec succès !\n${imported.conversations} conversations importées\n\nHistory imported successfully!\n${imported.conversations} conversations imported`);
					} catch (err) {
						alert('Erreur lors de l\'importation / Import error: ' + err.message);
					}
				};
				reader.readAsText(file);
			}
		};
		input.click();
	}

	/**
	 * Recherche dans les conversations / Search conversations
	 */
	async function handleSearch(query) {
		if (!query || query.trim() === '') {
			// Recharge toutes les conversations / Reload all conversations
			await llmStore.loadConversationHistory();
			isSearching = false;
		} else {
			isSearching = true;
			llmStore.conversationHistory = await db.searchConversations(query);
		}
	}
</script>

{#if isOpen}
	<!-- Overlay -->
	<div 
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
		onclick={() => isOpen = false}
		onkeydown={(e) => e.key === 'Escape' && (isOpen = false)}
		role="dialog"
		aria-modal="true"
		aria-labelledby="history-title"
		tabindex="-1"
	>
		<!-- Panneau latéral / Side panel -->
		<div 
			class="fixed left-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-r border-slate-700 shadow-2xl overflow-hidden flex flex-col"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header -->
			<div class="bg-slate-800 border-b border-slate-700 p-4">
				<div class="flex items-center justify-between mb-4">
					<h2 id="history-title" class="text-xl font-bold text-white flex items-center gap-2">
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Historique / History
					</h2>
					<button
						onclick={() => isOpen = false}
						class="text-slate-400 hover:text-white transition-colors"
						aria-label="Fermer / Close"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<!-- Boutons d'action / Action buttons -->
				<div class="flex gap-2">
					<button
						onclick={() => llmStore.startNewConversation()}
						class="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg transition-colors text-sm font-semibold"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
						</svg>
						Nouvelle / New
					</button>
					<button
						onclick={handleExport}
						class="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
						aria-label="Exporter / Export"
						title="Exporter l'historique / Export history"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
					</button>
					<button
						onclick={handleImport}
						class="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
						aria-label="Importer / Import"
						title="Importer l'historique / Import history"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
						</svg>
					</button>
				</div>
				
				<!-- Barre de recherche / Search bar -->
				<div class="px-4 pb-2">
					<div class="relative">
						<input
							type="search"
							bind:value={searchQuery}
							oninput={(e) => handleSearch(e.target.value)}
							placeholder="🔍 Rechercher... / Search..."
							class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
						<svg class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
						</svg>
						{#if isSearching}
							<span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-purple-400">
								Recherche...
							</span>
						{/if}
					</div>
				</div>
			</div>

			<!-- Liste des conversations / Conversations list -->
			<div class="flex-1 overflow-y-auto p-4 space-y-2">
				{#if llmStore.conversationHistory.length === 0}
					<div class="text-center text-slate-400 py-12">
						<svg class="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
						</svg>
						<p class="text-sm">Aucune conversation sauvegardée</p>
						<p class="text-sm">No saved conversations</p>
					</div>
				{:else}
					{#each llmStore.conversationHistory as conversation (conversation.id)}
						<div
							class="group relative bg-slate-800 hover:bg-slate-700 rounded-lg p-3 cursor-pointer transition-colors {
								conversation.id === llmStore.currentConversationId ? 'ring-2 ring-purple-500' : ''
							}"
						>
							{#if renamingId === conversation.id}
								<!-- Mode renommage / Rename mode -->
								<div class="flex gap-2" onclick={(e) => e.stopPropagation()}>
									<input
										type="text"
										bind:value={renamingTitle}
										class="flex-1 bg-slate-900 text-white px-2 py-1 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
										onkeydown={(e) => {
											if (e.key === 'Enter') saveRename();
											if (e.key === 'Escape') cancelRename();
										}}
										autofocus
									/>
									<button
										onclick={saveRename}
										class="p-1 text-green-400 hover:text-green-300"
										aria-label="Sauvegarder / Save"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
										</svg>
									</button>
									<button
										onclick={cancelRename}
										class="p-1 text-red-400 hover:text-red-300"
										aria-label="Annuler / Cancel"
									>
										<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{:else}
								<!-- Mode normal / Normal mode -->
								<div onclick={() => handleLoadConversation(conversation.id)}>
									<div class="flex items-start justify-between gap-2 mb-1">
										<h3 class="text-white font-medium text-sm line-clamp-2 flex-1">
											{conversation.title}
										</h3>
										{#if conversation.id === llmStore.currentConversationId}
											<span class="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded shrink-0">
												Actuel
											</span>
										{/if}
									</div>
									
									<div class="flex items-center justify-between text-xs text-slate-400">
										<span>{formatDate(conversation.lastModified)}</span>
										<span>{conversation.messages.length} msg</span>
									</div>

									<!-- Boutons d'action (visibles au survol) / Action buttons (visible on hover) -->
									<div class="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
										<button
											onclick={(e) => {
												e.stopPropagation();
												startRenaming(conversation);
											}}
											class="p-1 bg-slate-900 hover:bg-slate-800 rounded text-blue-400 hover:text-blue-300"
											aria-label="Renommer / Rename"
											title="Renommer / Rename"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
											</svg>
										</button>
										<button
											onclick={(e) => handleDelete(conversation.id, e)}
											class="p-1 bg-slate-900 hover:bg-slate-800 rounded text-red-400 hover:text-red-300"
											aria-label="Supprimer / Delete"
											title="Supprimer / Delete"
										>
											<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
											</svg>
										</button>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>

			<!-- Footer avec stats / Footer with stats -->
			<div class="bg-slate-800 border-t border-slate-700 p-3 text-xs text-slate-400 text-center">
				{llmStore.conversationHistory.length} conversation(s) sauvegardée(s)
			</div>
		</div>
	</div>
{/if}
