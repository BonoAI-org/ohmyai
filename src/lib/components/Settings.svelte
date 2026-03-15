<script>
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";

	let { close = () => {} } = $props();
	let huggingFaceToken = $state("");

	// Profile state
	let profileName = $state('');
	let profileRole = $state('');
	let profileExpertise = $state('');
	let profilePreferences = $state('');
	let profileLanguage = $state('');
	let profileSaved = $state(false);

	// Global rules state
	let globalRules = $state('');
	let rulesSaved = $state(false);

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

	function saveProfile() {
		llmStore.updateUserProfile({
			name: profileName,
			role: profileRole,
			expertise: profileExpertise,
			preferences: profilePreferences,
			language: profileLanguage
		});
		profileSaved = true;
		setTimeout(() => profileSaved = false, 2000);
	}

	function saveGlobalRules() {
		llmStore.updateSystemPrompt(globalRules);
		rulesSaved = true;
		setTimeout(() => rulesSaved = false, 2000);
	}

	onMount(() => {
		// Pré-remplit le champ avec le token existant
		// Pre-fill the input with the existing token
		if (llmStore.huggingFaceToken) {
			huggingFaceToken = llmStore.huggingFaceToken;
		}
		// Load profile
		if (llmStore.userProfile) {
			profileName = llmStore.userProfile.name || '';
			profileRole = llmStore.userProfile.role || '';
			profileExpertise = llmStore.userProfile.expertise || '';
			profilePreferences = llmStore.userProfile.preferences || '';
			profileLanguage = llmStore.userProfile.language || '';
		}
		// Load global rules
		globalRules = llmStore.systemPrompt || '';
	});
</script>

<div
	class="p-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg max-h-[85vh] overflow-y-auto"
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

	<!-- Section Profil / Profile Section -->
	<div class="mb-6 border-t border-slate-200 dark:border-slate-700 pt-6">
		<label class="block font-medium mb-3">Profil Utilisateur / User Profile</label>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
			Ces informations sont partagées avec les modèles pour personnaliser les réponses.
		</p>
		<div class="space-y-3">
			<div>
				<label for="profile-name" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Nom / Name</label>
				<input type="text" id="profile-name" bind:value={profileName} placeholder="Votre nom..."
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-role" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Rôle / Role</label>
				<input type="text" id="profile-role" bind:value={profileRole} placeholder="Ex: Développeur, Designer, Étudiant..."
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-expertise" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Expertise</label>
				<input type="text" id="profile-expertise" bind:value={profileExpertise} placeholder="Ex: Python, React, Data Science..."
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-preferences" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Préférences / Preferences</label>
				<input type="text" id="profile-preferences" bind:value={profilePreferences} placeholder="Ex: Réponses concises, exemples de code..."
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-language" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Langue préférée / Preferred Language</label>
				<input type="text" id="profile-language" bind:value={profileLanguage} placeholder="Ex: Français, English..."
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<button onclick={saveProfile}
				class="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors shadow-sm text-sm {profileSaved ? 'bg-green-600 hover:bg-green-600' : ''}">
				{profileSaved ? 'Profil sauvegardé !' : 'Sauvegarder le profil / Save Profile'}
			</button>
		</div>
	</div>

	<!-- Section Règles Globales / Global Rules Section -->
	<div class="mb-6 border-t border-slate-200 dark:border-slate-700 pt-6">
		<label class="block font-medium mb-3">Règles Globales / Global Rules</label>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
			Instructions que tous les modèles doivent suivre. Injecté comme System Prompt.
		</p>
		<textarea bind:value={globalRules}
			placeholder="Ex: Réponds toujours en français. Utilise un ton professionnel..."
			rows="5"
			class="w-full p-3 border border-slate-300 dark:border-slate-600 rounded bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-mono resize-none"
		></textarea>
		<button onclick={saveGlobalRules}
			class="w-full mt-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors shadow-sm text-sm {rulesSaved ? 'bg-green-600 hover:bg-green-600' : ''}">
			{rulesSaved ? 'Règles sauvegardées !' : 'Sauvegarder les règles / Save Rules'}
		</button>
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
