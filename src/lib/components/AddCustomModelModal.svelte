<script>
	import { llmStore } from '$lib/stores/llm.svelte.js';

	/**
	 * Props du composant / Component props
	 */
	let { isOpen = $bindable(false) } = $props();

	// État du formulaire / Form state
	let modelId = $state('');
	let modelName = $state('');
	let modelUrl = $state('');
	let modelSize = $state('');
	let modelDescription = $state('');
	let error = $state('');

	/**
	 * Réinitialise le formulaire / Reset the form
	 */
	function resetForm() {
		modelId = '';
		modelName = '';
		modelUrl = '';
		modelSize = '';
		modelDescription = '';
		error = '';
	}

	/**
	 * Ferme le modal / Close the modal
	 */
	function closeModal() {
		isOpen = false;
		resetForm();
	}

	/**
	 * Gère la soumission du formulaire / Handle form submission
	 */
	function handleSubmit(event) {
		event.preventDefault();
		error = '';

		// Validation basique / Basic validation
		if (!modelId.trim() || !modelName.trim() || !modelUrl.trim()) {
			error = 'Veuillez remplir tous les champs requis / Please fill all required fields';
			return;
		}

		try {
			// Ajoute le modèle personnalisé / Add custom model
			llmStore.addCustomModel({
				id: modelId.trim(),
				name: modelName.trim(),
				url: modelUrl.trim(),
				size: modelSize.trim() || 'Inconnue / Unknown',
				description: modelDescription.trim() || 'Modèle personnalisé / Custom model'
			});

			closeModal();
		} catch (err) {
			error = err.message;
		}
	}
</script>

{#if isOpen}
	<!-- Overlay / Overlay -->
	<div 
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
		onclick={closeModal}
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		tabindex="-1"
	>
		<!-- Modal / Modal -->
		<div 
			class="bg-slate-800 border border-slate-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="document"
		>
			<!-- Header / Header -->
			<div class="flex items-center justify-between p-6 border-b border-slate-700">
				<h2 id="modal-title" class="text-2xl font-bold text-white">
					➕ Ajouter un Modèle Personnalisé / Add Custom Model
				</h2>
				<button
					onclick={closeModal}
					class="text-slate-400 hover:text-white transition-colors"
					aria-label="Fermer / Close"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>

			<!-- Body / Body -->
			<form onsubmit={handleSubmit} class="p-6 space-y-4">
				<!-- Description / Description -->
				<div class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-200">
					<p class="font-semibold mb-2">ℹ️ Information</p>
					<p>
						Vous pouvez ajouter des modèles WebLLM compatibles en fournissant leur ID et URL.
						Les modèles doivent être au format MLC (Machine Learning Compilation).
					</p>
					<p class="mt-2">
						You can add compatible WebLLM models by providing their ID and URL.
						Models must be in MLC (Machine Learning Compilation) format.
					</p>
				</div>

				<!-- Erreur / Error -->
				{#if error}
					<div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-200">
						<p class="font-semibold mb-1">❌ Erreur / Error</p>
						<p>{error}</p>
					</div>
				{/if}

				<!-- ID du modèle / Model ID -->
				<div>
					<label for="modelId" class="block text-sm font-semibold text-white mb-2">
						ID du Modèle / Model ID <span class="text-red-400">*</span>
					</label>
					<input
						id="modelId"
						type="text"
						bind:value={modelId}
						placeholder="Ex: Llama-3.2-1B-Instruct-q4f32_1-MLC"
						class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
						required
					/>
					<p class="text-xs text-slate-400 mt-1">
						Identifiant unique du modèle (généralement fourni par le créateur du modèle)
					</p>
				</div>

				<!-- Nom du modèle / Model name -->
				<div>
					<label for="modelName" class="block text-sm font-semibold text-white mb-2">
						Nom d'Affichage / Display Name <span class="text-red-400">*</span>
					</label>
					<input
						id="modelName"
						type="text"
						bind:value={modelName}
						placeholder="Ex: Mon Modèle Personnalisé"
						class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
						required
					/>
					<p class="text-xs text-slate-400 mt-1">
						Nom qui apparaîtra dans le sélecteur de modèles
					</p>
				</div>

				<!-- URL du modèle / Model URL -->
				<div>
					<label for="modelUrl" class="block text-sm font-semibold text-white mb-2">
						URL du Modèle / Model URL <span class="text-red-400">*</span>
					</label>
					<input
						id="modelUrl"
						type="url"
						bind:value={modelUrl}
						placeholder="https://example.com/models/my-model"
						class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
						required
					/>
					<p class="text-xs text-slate-400 mt-1">
						URL de base où le modèle est hébergé (doit être accessible publiquement)
					</p>
				</div>

				<!-- Taille du modèle / Model size -->
				<div>
					<label for="modelSize" class="block text-sm font-semibold text-white mb-2">
						Taille Estimée / Estimated Size
					</label>
					<input
						id="modelSize"
						type="text"
						bind:value={modelSize}
						placeholder="Ex: ~1.5 GB"
						class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
					/>
					<p class="text-xs text-slate-400 mt-1">
						Taille approximative du modèle (optionnel)
					</p>
				</div>

				<!-- Description / Description -->
				<div>
					<label for="modelDescription" class="block text-sm font-semibold text-white mb-2">
						Description
					</label>
					<textarea
						id="modelDescription"
						bind:value={modelDescription}
						placeholder="Ex: Modèle optimisé pour la génération de code Python"
						rows="3"
						class="w-full bg-slate-700/50 text-white rounded-lg px-4 py-2 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
					></textarea>
					<p class="text-xs text-slate-400 mt-1">
						Courte description du modèle (optionnel)
					</p>
				</div>

				<!-- Exemple / Example -->
				<details class="bg-slate-700/30 rounded-lg p-4">
					<summary class="cursor-pointer text-sm font-semibold text-purple-400 hover:text-purple-300">
						📖 Voir un exemple / See an example
					</summary>
					<div class="mt-3 text-xs text-slate-300 space-y-2">
						<p class="font-semibold">Exemple de configuration / Configuration example:</p>
						<pre class="bg-slate-900 p-3 rounded overflow-x-auto"><code>{`ID: Mistral-7B-Instruct-v0.2-q4f16_1-MLC
Nom: Mistral 7B Instruct
URL: https://huggingface.co/mlc-ai/Mistral-7B-Instruct-v0.2-q4f16_1-MLC
Taille: ~4.2 GB
Description: Modèle Mistral optimisé pour les instructions`}</code></pre>
					</div>
				</details>

				<!-- Boutons / Buttons -->
				<div class="flex gap-3 pt-4">
					<button
						type="button"
						onclick={closeModal}
						class="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
					>
						Annuler / Cancel
					</button>
					<button
						type="submit"
						class="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
					>
						➕ Ajouter le Modèle / Add Model
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
