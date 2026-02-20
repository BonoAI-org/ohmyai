<script>
	import logo from "$lib/assets/logo.svg";
	import logoDark from "$lib/assets/logo-dark.svg";
	import { themeStore } from "$lib/stores/theme.svelte.js";

	/**
	 * Composant pour afficher un message de chat
	 * Component to display a chat message
	 */

	// Props: message avec { role: 'user' | 'assistant', content: string }
	let { message } = $props();

	let copied = $state(false);

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

			<!-- Bouton Copier / Copy Button -->
			{#if message.role === "assistant" && message.content}
				<button
					onclick={copyText}
					class="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-[colors,transform] active:scale-95"
					title="Copier la réponse / Copy response"
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
				<!-- Affiche le contenu avec préservation des sauts de ligne / Display content with line breaks preserved -->
				<p class="whitespace-pre-wrap break-words m-0">
					{message.content}
				</p>
			{:else}
				<!-- Message vide pendant la génération / Empty message during generation -->
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
