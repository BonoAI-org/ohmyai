<script>
	import { onMount } from 'svelte';
	import { llmStore } from '$lib/stores/llm.svelte.js';

	let { close = () => {} } = $props();
	let huggingFaceToken = $state('');

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

<div class="p-4 bg-slate-800 text-white">
	<h2 class="text-lg font-bold mb-4">Paramètres / Settings</h2>
	<div class="mb-4">
			<div class="flex justify-between items-center mb-2">
				<label for="hf-token" class="block font-medium">Token Hugging Face</label>
				<a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" class="text-sm text-purple-400 hover:underline">
					Obtenir un token
				</a>
			</div>
			<p class="text-xs text-slate-400 mb-2">
				Un token est requis pour télécharger certains modèles.
			</p>
			<input type="password" id="hf-token" bind:value={huggingFaceToken} class="w-full p-2 border border-slate-600 rounded bg-slate-700 text-white" placeholder="hf_..." />
		</div>
	<div class="flex justify-between items-center">
		<button onclick={saveToken} class="px-4 py-2 bg-purple-600 text-white rounded">Sauvegarder / Save</button>
		<button onclick={() => llmStore.clearCache()} class="px-4 py-2 bg-red-600 text-white rounded">Vider le cache / Clear Cache</button>
	</div>
</div>
