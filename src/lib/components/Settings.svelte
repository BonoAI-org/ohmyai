<script>
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";

	let { close = () => {} } = $props();
	let huggingFaceToken = $state("");

	const colorThemes = [
		{ id: "purple", name: "Amethyst", color: "bg-[#a855f7]" }, // purple-500
		{ id: "blue", name: "Ocean", color: "bg-[#3b82f6]" }, // blue-500
		{ id: "emerald", name: "Emerald", color: "bg-[#10b981]" }, // emerald-500
		{ id: "rose", name: "Rose", color: "bg-[#f43f5e]" }, // rose-500
		{ id: "amber", name: "Amber", color: "bg-[#f59e0b]" }, // amber-500
		{
			id: "paper",
			name: "Paper",
			color: "bg-white border-2 border-slate-900",
		}, // B&W Notion style
	];

	function saveToken() {
		llmStore.setHuggingFaceToken(huggingFaceToken);
		close();
	}

	onMount(() => {
		// Pré-remplit le champ avec le token existant
		// Pre-fill the input with the existing token
		if (llmStore.huggingFaceToken) {
			huggingFaceToken = llmStore.huggingFaceToken;
		}
	});
</script>

<div
	class="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg"
>
	<h2 class="text-lg font-bold mb-4">Paramètres / Settings</h2>

	<div class="mb-6">
		<label class="block font-medium mb-3"
			>Thème de couleur / Color Theme</label
		>
		<div class="flex gap-3">
			{#each colorThemes as theme}
				<button
					onclick={() => themeStore.setColorTheme(theme.id)}
					class="w-10 h-10 rounded-full {theme.color} {themeStore.colorTheme ===
					theme.id
						? 'ring-4 ring-offset-2 ring-offset-slate-800 ring-white'
						: 'opacity-70 hover:opacity-100 transition-opacity'}"
					aria-label="Theme {theme.name}"
					title={theme.name}
				></button>
			{/each}
		</div>
	</div>

	<div class="mb-6">
		<div class="flex justify-between items-center mb-2">
			<label for="hf-token" class="block font-medium"
				>Token Hugging Face</label
			>
			<a
				href="https://huggingface.co/settings/tokens"
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-purple-500 dark:text-purple-400 hover:underline"
			>
				Obtenir un token
			</a>
		</div>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
			Un token est requis pour télécharger certains modèles.
		</p>
		<input
			type="password"
			id="hf-token"
			bind:value={huggingFaceToken}
			class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
			placeholder="hf_..."
		/>
	</div>
	<div class="flex justify-between items-center">
		<button
			onclick={saveToken}
			class="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors shadow-sm"
			>Sauvegarder / Save</button
		>
		<button
			onclick={() => llmStore.clearCache()}
			class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors shadow-sm"
			>Vider le cache / Clear Cache</button
		>
	</div>
</div>
