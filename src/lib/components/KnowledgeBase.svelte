<script>
	import { onMount } from 'svelte';
	import { oramaStore } from '$lib/stores/orama.svelte.js';
	import { extractTextFromFile, chunkText } from '$lib/rag/ingest.js';

	let noteText = $state('');
	let searchQuery = $state('');
	let searchResults = $state([]);
	let hasSearched = $state(false);
	let errorMsg = $state('');
	let fileInputEl = $state(null);

	// Documents groupés par source / Documents grouped by source
	// [{ source, isFile, count, items: [{id, content}] }]
	let groups = $state([]);

	async function refreshList() {
		const docs = await oramaStore.listDocuments();
		const bySource = new Map();
		for (const doc of docs) {
			if (!bySource.has(doc.source)) bySource.set(doc.source, []);
			bySource.get(doc.source).push(doc);
		}
		groups = [...bySource.entries()].map(([source, items]) => ({
			source,
			isFile: source !== 'note',
			count: items.length,
			items,
		}));
	}

	onMount(refreshList);

	async function handleAddNote() {
		if (!noteText.trim()) return;
		errorMsg = '';
		try {
			await oramaStore.addDocument(noteText.trim());
			noteText = '';
			await refreshList();
		} catch (err) {
			errorMsg = err.message;
		}
	}

	async function handleFiles(event) {
		const files = [...(event.target.files ?? [])];
		event.target.value = '';
		errorMsg = '';
		for (const file of files) {
			try {
				const text = await extractTextFromFile(file);
				const chunks = chunkText(text);
				if (chunks.length === 0) {
					errorMsg = `Aucun texte trouvé dans / No text found in ${file.name}`;
					continue;
				}
				await oramaStore.addChunks(chunks, file.name);
			} catch (err) {
				errorMsg = err.message;
			}
		}
		await refreshList();
	}

	async function handleDeleteSource(source) {
		errorMsg = '';
		await oramaStore.deleteSource(source);
		await refreshList();
	}

	async function handleDeleteNote(id) {
		errorMsg = '';
		await oramaStore.deleteDocument(id);
		await refreshList();
	}

	async function handleSearch() {
		if (!searchQuery.trim()) return;
		errorMsg = '';
		searchResults = await oramaStore.search(searchQuery);
		hasSearched = true;
	}
</script>

<div class="space-y-5">
	<p class="text-xs text-slate-500 dark:text-slate-400">
		Tout est indexé et stocké localement. Le chat utilise automatiquement ces connaissances quand elles sont pertinentes.
		/ Everything is indexed and stored locally. The chat automatically uses this knowledge when relevant.
	</p>

	<!-- Ajout d'une note / Add a note -->
	<div class="space-y-2">
		<label for="kb-note-input" class="block text-sm font-medium">
			Ajouter une note / Add a note
		</label>
		<div class="flex gap-2">
			<input
				id="kb-note-input"
				type="text"
				bind:value={noteText}
				placeholder="Ex: Mon plat préféré est la poutine..."
				class="flex-1 p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
				onkeydown={(e) => e.key === 'Enter' && handleAddNote()}
			/>
			<button
				onclick={handleAddNote}
				class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
				disabled={oramaStore.isLoading || !noteText.trim()}
			>
				Ajouter / Add
			</button>
		</div>
	</div>

	<!-- Import de fichiers / File import -->
	<div class="space-y-2">
		<span class="block text-sm font-medium">
			Importer des fichiers / Import files
		</span>
		<input
			bind:this={fileInputEl}
			type="file"
			accept=".txt,.md,.markdown,.pdf,text/plain,text/markdown,application/pdf"
			multiple
			aria-label="Fichiers à importer / Files to import"
			class="sr-only"
			onchange={handleFiles}
		/>
		<button
			onclick={() => fileInputEl?.click()}
			disabled={oramaStore.isLoading}
			class="w-full p-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-500 dark:text-slate-400 hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors disabled:opacity-50"
		>
			📄 Choisir des fichiers .txt, .md ou .pdf / Pick .txt, .md or .pdf files
		</button>
		{#if oramaStore.ingestProgress}
			<div class="space-y-1">
				<div class="h-2 bg-slate-200 dark:bg-slate-700 rounded overflow-hidden">
					<div
						class="h-full bg-purple-500 transition-all"
						style="width: {(oramaStore.ingestProgress.done / oramaStore.ingestProgress.total) * 100}%"
					></div>
				</div>
				<p class="text-xs text-slate-500">
					Indexation... {oramaStore.ingestProgress.done}/{oramaStore.ingestProgress.total} chunks
				</p>
			</div>
		{/if}
	</div>

	<!-- Documents indexés / Indexed documents -->
	{#if groups.length > 0}
		<div class="space-y-2">
			<span class="block text-sm font-medium">
				Documents indexés / Indexed documents
			</span>
			<div class="space-y-1.5 max-h-48 overflow-y-auto pr-1">
				{#each groups as group}
					{#if group.isFile}
						<div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-slate-200 dark:border-slate-700 text-sm">
							<span class="flex-1 truncate" title={group.source}>📄 {group.source}</span>
							<span class="text-xs text-slate-400 shrink-0">{group.count} chunks</span>
							<button
								onclick={() => handleDeleteSource(group.source)}
								disabled={oramaStore.isLoading}
								class="text-slate-400 hover:text-red-500 shrink-0 disabled:opacity-50"
								title="Supprimer / Delete"
							>
								🗑️
							</button>
						</div>
					{:else}
						{#each group.items as note}
							<div class="flex items-center gap-2 p-2 bg-white dark:bg-gray-900 rounded border border-slate-200 dark:border-slate-700 text-sm">
								<span class="flex-1 truncate" title={note.content}>📝 {note.content}</span>
								<button
									onclick={() => handleDeleteNote(note.id)}
									disabled={oramaStore.isLoading}
									class="text-slate-400 hover:text-red-500 shrink-0 disabled:opacity-50"
									title="Supprimer / Delete"
								>
									🗑️
								</button>
							</div>
						{/each}
					{/if}
				{/each}
			</div>
		</div>
	{/if}

	<!-- Recherche sémantique / Semantic search -->
	<div class="space-y-2">
		<label for="kb-search-input" class="block text-sm font-medium">
			Tester la recherche / Test search
		</label>
		<div class="flex gap-2">
			<input
				id="kb-search-input"
				type="text"
				bind:value={searchQuery}
				placeholder="Ex: Quel est mon plat préféré ?"
				class="flex-1 p-2 rounded border dark:bg-gray-700 dark:border-gray-600"
				onkeydown={(e) => e.key === 'Enter' && handleSearch()}
			/>
			<button
				onclick={handleSearch}
				class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
				disabled={oramaStore.isLoading || !searchQuery.trim()}
			>
				Chercher / Search
			</button>
		</div>
		{#if hasSearched}
			{#if searchResults.length > 0}
				<div class="space-y-2">
					{#each searchResults as result}
						<div class="p-2 bg-white dark:bg-gray-900 rounded border border-slate-200 dark:border-slate-700 text-sm">
							<div class="break-words">{result.content}</div>
							<div class="text-xs text-slate-400 mt-1">
								{result.source === 'note' ? '📝 note' : `📄 ${result.source}`} • Score: {result.score.toFixed(3)}
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-xs text-slate-400">Aucun résultat au-dessus du seuil / No result above threshold</p>
			{/if}
		{/if}
	</div>

	{#if errorMsg}
		<p class="text-xs text-red-500">{errorMsg}</p>
	{/if}

	<div class="text-xs text-slate-400">
		Status: {oramaStore.status}
	</div>
</div>
