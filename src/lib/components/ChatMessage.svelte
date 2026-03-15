<script>
	import logo from "$lib/assets/logo.svg";
	import logoDark from "$lib/assets/logo-dark.svg";
	import { themeStore } from "$lib/stores/theme.svelte.js";

	/**
	 * Composant pour afficher un message de chat
	 * Component to display a chat message
	 */

	// Props: message avec { role: 'user' | 'assistant', content: string }
	let { message, onreuse = null, onsave = null } = $props();

	let copied = $state(false);
	let saved = $state(false);
	let thinkExpanded = $state(false);

	/**
	 * Sépare le contenu <think> du reste de la réponse
	 */
	function parseThinking(content) {
		if (!content) return { thinking: '', answer: '', closed: true };
		const thinkMatch = content.match(/^<think>([\s\S]*?)(<\/think>|$)([\s\S]*)$/);
		if (!thinkMatch) {
			const altMatch = content.match(/^\[THINK\]([\s\S]*?)(\[\/THINK\]|$)([\s\S]*)$/);
			if (!altMatch) return { thinking: '', answer: content, closed: true };
			return { thinking: altMatch[1].trim(), answer: altMatch[3].trim(), closed: altMatch[2] !== '' };
		}
		return { thinking: thinkMatch[1].trim(), answer: thinkMatch[3].trim(), closed: thinkMatch[2] === '</think>' };
	}

	async function copyText() {
		try {
			await navigator.clipboard.writeText(message.content);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	}

	function reusePrompt() {
		if (onreuse) onreuse(message.content);
	}

	function saveToMemory() {
		if (onsave) {
			onsave(message.content);
			saved = true;
			setTimeout(() => {
				saved = false;
			}, 2000);
		}
	}
</script>

<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
	<div
		class="max-w-[80%] rounded-lg p-4 {message.role === 'user'
			? 'bg-purple-600 text-white shadow-sm'
			: 'bg-white dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 shadow-sm dark:shadow-none'}"
	>
		<!-- En-tête du message / Message header -->
		<div class="flex items-center justify-between mb-2">
			<div class="flex items-center gap-2">
				{#if message.role === "user"}
					<!-- Icône utilisateur / User icon -->
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
							d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
						/>
					</svg>
					<span
						class="font-semibold text-sm text-slate-800 dark:text-white"
						>Vous / You</span
					>
				{:else}
					<!-- Logo IA / AI logo -->
					<img
						src={!themeStore.isDark ||
						themeStore.colorTheme === "paper"
							? logoDark
							: logo}
						alt="AI Logo"
						class="w-5 h-5"
					/>
					<span
						class="font-semibold text-sm text-purple-600 dark:text-purple-400"
						>Assistant IA / AI Assistant</span
					>
				{/if}
			</div>

			<!-- Action Buttons -->
			{#if message.content}
				<div class="flex items-center gap-0.5">
					<!-- Bouton Copier / Copy Button -->
					<button
						onclick={copyText}
						class="p-1 rounded {message.role === 'user' ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'} transition-[colors,transform] active:scale-95"
						title="Copier / Copy"
					>
						{#if copied}
							<svg
								class="w-4 h-4 text-green-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						{:else}
							<svg
								class="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
							</svg>
						{/if}
					</button>

					<!-- Bouton Réutiliser / Reuse Prompt Button (user only) -->
					{#if message.role === "user" && onreuse}
						<button
							onclick={reusePrompt}
							class="p-1 rounded text-white/70 hover:text-white hover:bg-white/20 transition-[colors,transform] active:scale-95"
							title="Réutiliser le prompt / Reuse prompt"
						>
							<svg
								class="w-4 h-4"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4"
								/>
							</svg>
						</button>
					{/if}

					<!-- Bouton Sauvegarder / Save to Memory Button -->
					{#if onsave}
						<button
							onclick={saveToMemory}
							class="p-1 rounded {message.role === 'user' ? 'text-white/70 hover:text-white hover:bg-white/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'} transition-[colors,transform] active:scale-95"
							title="Sauvegarder en mémoire / Save to memory"
						>
							{#if saved}
								<svg
									class="w-4 h-4 text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
							{:else}
								<svg
									class="w-4 h-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
									/>
								</svg>
							{/if}
						</button>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Contenu du message / Message content -->
		<div
			class="prose prose-sm dark:prose-invert max-w-none {message.role ===
			'user'
				? 'text-white'
				: ''}"
		>
			{#if message.content}
				{@const parsed = message.role === 'assistant' ? parseThinking(message.content) : null}
				{#if parsed && parsed.thinking}
					<!-- Section de raisonnement repliable / Collapsible thinking section -->
					<div class="mb-3">
						<button
							onclick={() => thinkExpanded = !thinkExpanded}
							class="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
						>
							<svg
								class="w-3.5 h-3.5 transition-transform {thinkExpanded ? 'rotate-90' : ''}"
								fill="none" stroke="currentColor" viewBox="0 0 24 24"
							><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
							{#if !parsed.closed}
								<span class="animate-pulse">Raisonnement en cours...</span>
							{:else}
								Raisonnement
							{/if}
						</button>
						{#if thinkExpanded}
							<div class="mt-2 pl-3 border-l-2 border-slate-300 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400 italic">
								<p class="whitespace-pre-wrap break-words m-0">{parsed.thinking}</p>
							</div>
						{/if}
					</div>
					{#if parsed.answer}
						<p class="whitespace-pre-wrap break-words m-0">{parsed.answer}</p>
					{:else if !parsed.closed}
						<span class="text-slate-400 text-sm italic">...</span>
					{/if}
				{:else}
					<p class="whitespace-pre-wrap break-words m-0">
						{parsed ? parsed.answer : message.content}
					</p>
				{/if}
			{:else}
				<span class="text-slate-400 text-sm italic">...</span>
			{/if}
		</div>

		<!-- Images attachées (si présentes) / Attached images (if any) -->
		{#if message.images && message.images.length > 0}
			<div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
				{#each message.images as img, idx}
					<img
						src={img}
						alt="Pièce jointe / Attachment"
						class="w-full h-32 object-cover rounded border border-slate-200 dark:border-slate-700"
					/>
				{/each}
			</div>
		{/if}
	</div>
</div>
