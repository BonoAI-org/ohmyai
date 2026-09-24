<script>
	/**
	 * Historique des conversations, en panneau latéral de 248 px.
	 * Conversation history, as a 248 px side panel.
	 *
	 * À partir de `lg`, le panneau fait partie du flux et se replie sans
	 * masquer la conversation. En dessous, il redevient un tiroir modal
	 * au-dessus de la page.
	 * From `lg` up, the panel sits in the flow and collapses without hiding
	 * the conversation. Below that, it is a modal drawer over the page.
	 */
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { oramaStore } from "$lib/stores/orama.svelte.js";
	import { db } from "$lib/db/conversationDB.js";
	import { AVAILABLE_MODELS } from "$lib/llm/models.js";
	import { t } from "svelte-i18n";
	import { onMount } from "svelte";

	/**
	 * @type {{
	 *   isOpen?: boolean,
	 *   onknowledgebase?: () => void,
	 *   onmodels?: () => void
	 * }}
	 */
	let {
		isOpen = $bindable(false),
		onknowledgebase = () => {},
		onmodels = () => {}
	} = $props();

	let renamingId = $state(null);
	let renamingTitle = $state("");
	let searchQuery = $state("");
	let isSearching = $state(false);

	const DAY = 86400000;

	/**
	 * Répartit les conversations en groupes datés, dans l'ordre de la maquette.
	 * Splits conversations into dated groups, in the mockup's order.
	 */
	const groups = $derived.by(() => {
		const now = new Date();
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		).getTime();

		const buckets = { today: [], week: [], older: [] };
		for (const c of llmStore.conversationHistory) {
			const at = c.lastModified;
			if (at >= startOfToday) buckets.today.push(c);
			else if (at >= startOfToday - 7 * DAY) buckets.week.push(c);
			else buckets.older.push(c);
		}
		return [
			{ key: "today", label: $t("history.groupToday"), items: buckets.today },
			{ key: "week", label: $t("history.groupWeek"), items: buckets.week },
			{ key: "older", label: $t("history.groupOlder"), items: buckets.older }
		].filter((g) => g.items.length > 0);
	});

	// Le compteur de documents reste à null tant que personne ne l'a demandé.
	// The document counter stays null until someone asks for it.
	onMount(() => {
		oramaStore.countDocuments();
	});

	// Nombre de modèles présents sur l'appareil / Models present on the device
	const installedModelCount = $derived(
		AVAILABLE_MODELS.filter((m) => llmStore.downloadedModels[m.id]).length
	);

	async function handleLoadConversation(conversationId) {
		await llmStore.loadConversation(conversationId);
		closeOnMobile();
	}

	/**
	 * Sur mobile le panneau est modal : une sélection le referme. Sur grand
	 * écran il reste ouvert, la conversation s'affiche à côté.
	 * On mobile the panel is modal, so a selection closes it. On a large
	 * screen it stays open and the conversation shows next to it.
	 */
	function closeOnMobile() {
		if (typeof window !== "undefined" && window.innerWidth < 1024) {
			isOpen = false;
		}
	}

	function startRenaming(conversation) {
		renamingId = conversation.id;
		renamingTitle = conversation.title;
	}

	async function saveRename() {
		if (renamingId && renamingTitle.trim()) {
			await llmStore.renameConversation(renamingId, renamingTitle.trim());
		}
		renamingId = null;
		renamingTitle = "";
	}

	function cancelRename() {
		renamingId = null;
		renamingTitle = "";
	}

	async function handleDelete(conversationId, event) {
		event.stopPropagation();
		if (confirm($t("history.deleteConfirm"))) {
			await llmStore.deleteConversation(conversationId);
		}
	}

	/**
	 * Exporte l'historique / Export history
	 */
	async function handleExport() {
		const data = await llmStore.exportHistory();
		const blob = new Blob([data], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `ho-my-ai-history-${new Date().toISOString().split("T")[0]}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	/**
	 * Importe l'historique / Import history
	 */
	function handleImport() {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "application/json";
		input.onchange = (e) => {
			const file = e.target.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async (event) => {
				try {
					const imported = await llmStore.importHistory(
						event.target.result
					);
					alert(
						$t("history.importSuccess", {
							values: { count: imported.conversations },
						})
					);
				} catch (err) {
					alert($t("history.importError") + " : " + err.message);
				}
			};
			reader.readAsText(file);
		};
		input.click();
	}

	/**
	 * Recherche dans les conversations / Search conversations
	 */
	async function handleSearch(query) {
		if (!query || query.trim() === "") {
			await llmStore.loadConversationHistory();
			isSearching = false;
		} else {
			isSearching = true;
			llmStore.conversationHistory = await db.searchConversations(query);
		}
	}
</script>

<!-- Voile, sous `lg` seulement : au-dessus, le panneau est dans le flux. -->
<!-- Scrim, below `lg` only: above that, the panel sits in the flow. -->
{#if isOpen}
	<div
		class="lg:hidden fixed inset-0 z-40 bg-ink/40 backdrop-blur-sm"
		onclick={() => (isOpen = false)}
		onkeydown={(e) => e.key === "Escape" && (isOpen = false)}
		role="button"
		tabindex="-1"
		aria-label={$t("history.close")}
	></div>
{/if}

{#if isOpen}
	<nav
		class="fixed lg:static inset-y-0 left-0 z-50 lg:z-auto w-[248px] flex-shrink-0 bg-bg-raised border-r border-border-soft flex flex-col gap-3.5 p-4 lg:p-3.5 overflow-hidden"
		aria-label={$t("history.title")}
	>
		<h2 class="sr-only">{$t("history.conversationHistory")}</h2>

		<!-- Fermeture, mobile seulement / Close, mobile only -->
		<button
			onclick={() => (isOpen = false)}
			class="lg:hidden absolute top-2 right-2 flex items-center justify-center w-touch h-touch rounded-button text-ink-2 hover:bg-border-soft transition-colors"
			aria-label={$t("history.close")}
		>
			<svg
				class="w-5 h-5"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M6 18 18 6" /><path d="m6 6 12 12" />
			</svg>
		</button>

		<!-- Recherche / Search -->
		<label
			class="flex items-center gap-2 h-touch px-2.5 mt-12 lg:mt-0 mr-12 lg:mr-0 border border-border rounded-control bg-surface focus-within:border-accent transition-colors"
		>
			<svg
				class="w-[15px] h-[15px] flex-shrink-0 text-ink-3"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
			</svg>
			<span class="sr-only">{$t("history.searchInHistory")}</span>
			<input
				type="search"
				bind:value={searchQuery}
				oninput={(e) => handleSearch(e.target.value)}
				placeholder={$t("history.searchPlaceholder")}
				class="flex-grow self-stretch min-w-0 border-0 outline-none bg-transparent p-0 text-sm text-ink placeholder:text-ink-3 focus:ring-0"
			/>
		</label>

		<!-- Conversations groupées par date / Conversations grouped by date -->
		<div class="flex-grow min-h-0 overflow-y-auto flex flex-col gap-3.5 -mx-1 px-1">
			{#if llmStore.conversationHistory.length === 0}
				<p class="px-2 py-6 text-sm text-ink-3">
					{isSearching
						? $t("history.noResults")
						: $t("history.noConversations")}
				</p>
			{:else}
				{#each groups as group (group.key)}
					<div class="flex flex-col gap-1.5">
						<div
							class="px-2 font-mono text-[11px] uppercase tracking-[0.08em] text-ink-3"
						>
							{group.label}
						</div>
						{#each group.items as conversation (conversation.id)}
							{#if renamingId === conversation.id}
								<div class="flex items-center gap-1.5 px-1">
									<input
										type="text"
										bind:value={renamingTitle}
										onkeydown={(e) => {
											if (e.key === "Enter") saveRename();
											if (e.key === "Escape") {
												e.stopPropagation();
												cancelRename();
											}
										}}
										class="flex-grow min-w-0 h-9 px-2 border border-border rounded-control bg-surface text-sm text-ink focus:border-accent focus:ring-0"
									/>
									<button
										onclick={saveRename}
										class="hit-44 flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-control text-accent hover:bg-accent-soft transition-colors"
										aria-label={$t("history.save")}
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
									</button>
									<button
										onclick={cancelRename}
										class="hit-44 flex items-center justify-center w-9 h-9 flex-shrink-0 rounded-control text-danger hover:bg-danger-soft transition-colors"
										aria-label={$t("history.cancel")}
									>
										<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18 18 6" /><path d="m6 6 12 12" /></svg>
									</button>
								</div>
							{:else}
								<div class="group relative">
									<button
										onclick={() =>
											handleLoadConversation(conversation.id)}
										class="w-full text-left block py-2.5 pl-2.5 pr-16 rounded-control text-sm truncate transition-colors {conversation.id ===
										llmStore.currentConversationId
											? 'bg-border-soft font-medium text-ink'
											: 'text-ink-2 hover:bg-border-soft/60'}"
										title={conversation.title}
									>
										{conversation.title}
									</button>
									<!-- Renommer et supprimer, révélés au survol ou au focus -->
									<!-- Rename and delete, revealed on hover or focus -->
									<div
										class="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
									>
										<button
											onclick={(e) => {
												e.stopPropagation();
												startRenaming(conversation);
											}}
											class="hit-44 flex items-center justify-center w-7 h-7 rounded-md bg-surface border border-border text-ink-2 hover:text-ink transition-colors"
											aria-label={$t("history.rename")}
											title={$t("history.rename")}
										>
											<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5" /><path d="M17.586 3.586a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828z" /></svg>
										</button>
										<button
											onclick={(e) =>
												handleDelete(conversation.id, e)}
											class="hit-44 flex items-center justify-center w-7 h-7 rounded-md bg-surface border border-border text-danger hover:bg-danger-soft transition-colors"
											aria-label={$t("history.delete")}
											title={$t("history.delete")}
										>
											<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16" /><path d="m6 7 .9 12.1A2 2 0 0 0 8.9 21h6.2a2 2 0 0 0 2-1.9L18 7" /><path d="M9 7V4h6v3" /></svg>
										</button>
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/each}
			{/if}
		</div>

		<!-- Entrées nommées, plus des icônes muettes / Named entries, no longer mute icons -->
		<div class="flex-shrink-0 pt-3 border-t border-border-soft flex flex-col gap-1">
			<button
				onclick={() => {
					onknowledgebase();
					closeOnMobile();
				}}
				class="flex items-center gap-2.5 h-touch px-2.5 rounded-control text-sm text-ink hover:bg-border-soft transition-colors text-left"
			>
				<svg class="w-4 h-4 flex-shrink-0 text-ink-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v16H6.5A2.5 2.5 0 0 0 4 21.5z" /></svg>
				{$t("history.knowledgeBase")}
				<span class="ml-auto font-mono text-xs text-ink-3">
					{oramaStore.documentCount ?? 0}
				</span>
			</button>
			<button
				onclick={() => {
					onmodels();
					closeOnMobile();
				}}
				class="flex items-center gap-2.5 h-touch px-2.5 rounded-control text-sm text-ink hover:bg-border-soft transition-colors text-left"
			>
				<svg class="w-4 h-4 flex-shrink-0 text-ink-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="14" width="18" height="6" rx="2" /></svg>
				{$t("history.installedModels")}
				<span class="ml-auto font-mono text-xs text-ink-3">
					{installedModelCount}
				</span>
			</button>
		</div>

		<!-- Export et import de l'historique / History export and import -->
		<div class="flex-shrink-0 flex items-center gap-1 pt-1">
			<button
				onclick={handleExport}
				class="flex items-center gap-2 h-touch flex-grow px-2.5 rounded-control font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:bg-border-soft hover:text-ink-2 transition-colors"
				aria-label={$t("history.exportHistory")}
				title={$t("history.exportHistory")}
			>
				<svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M4 19h16" /></svg>
				{$t("history.export")}
			</button>
			<button
				onclick={handleImport}
				class="flex items-center gap-2 h-touch flex-grow px-2.5 rounded-control font-mono text-[11px] uppercase tracking-[0.06em] text-ink-3 hover:bg-border-soft hover:text-ink-2 transition-colors"
				aria-label={$t("history.importHistory")}
				title={$t("history.importHistory")}
			>
				<svg class="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V3" /><path d="m7 8 5-5 5 5" /><path d="M4 19h16" /></svg>
				{$t("history.import")}
			</button>
		</div>
	</nav>
{/if}
