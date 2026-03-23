<script>
	import { onMount } from "svelte";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { themeStore } from "$lib/stores/theme.svelte.js";
	import { mcpStore } from "$lib/stores/mcp.svelte.js";
	import { _ } from "svelte-i18n";
	import MCPConfigModal from "./MCPConfigModal.svelte";

	let { close = () => {} } = $props();
	let isMCPModalOpen = $state(false);
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
		{ id: "purple", name: "Amethyst", color: "bg-[#a855f7]" },
		{ id: "blue", name: "Ocean", color: "bg-[#3b82f6]" },
		{ id: "emerald", name: "Emerald", color: "bg-[#10b981]" },
		{ id: "rose", name: "Rose", color: "bg-[#f43f5e]" },
		{ id: "amber", name: "Amber", color: "bg-[#f59e0b]" },
		{
			id: "paper",
			name: "Paper",
			color: "bg-white border-2 border-slate-900",
		},
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
		if (llmStore.huggingFaceToken) {
			huggingFaceToken = llmStore.huggingFaceToken;
		}
		if (llmStore.userProfile) {
			profileName = llmStore.userProfile.name || '';
			profileRole = llmStore.userProfile.role || '';
			profileExpertise = llmStore.userProfile.expertise || '';
			profilePreferences = llmStore.userProfile.preferences || '';
			profileLanguage = llmStore.userProfile.language || '';
		}
		globalRules = llmStore.systemPrompt || '';
	});
</script>

<div
	class="p-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg max-h-[85vh] overflow-y-auto"
>
	<h2 class="text-lg font-bold mb-5">{$_('settings.title')}</h2>

	<!-- Color Theme -->
	<div class="mb-6">
		<p class="block font-medium mb-3">{$_('settings.colorTheme')}</p>
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

	<!-- Hugging Face Token -->
	<div class="mb-6">
		<div class="flex justify-between items-center mb-2">
			<label for="hf-token" class="block font-medium">{$_('settings.hfToken')}</label>
			<a
				href="https://huggingface.co/settings/tokens"
				target="_blank"
				rel="noopener noreferrer"
				class="text-sm text-purple-500 dark:text-purple-400 hover:underline"
			>
				{$_('settings.hfGetToken')}
			</a>
		</div>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-2">
			{$_('settings.hfDescription')}
		</p>
		<input
			type="password"
			id="hf-token"
			bind:value={huggingFaceToken}
			class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
			placeholder="hf_..."
		/>
	</div>

	<!-- User Profile -->
	<div class="mb-6 border-t border-slate-200 dark:border-slate-700 pt-6">
		<p class="block font-medium mb-3">{$_('settings.profileTitle')}</p>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
			{$_('settings.profileDescription')}
		</p>
		<div class="space-y-3">
			<div>
				<label for="profile-name" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{$_('settings.profileName')}</label>
				<input type="text" id="profile-name" bind:value={profileName} placeholder={$_('settings.profileNamePlaceholder')}
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-role" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{$_('settings.profileRole')}</label>
				<input type="text" id="profile-role" bind:value={profileRole} placeholder={$_('settings.profileRolePlaceholder')}
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-expertise" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{$_('settings.profileExpertise')}</label>
				<input type="text" id="profile-expertise" bind:value={profileExpertise} placeholder={$_('settings.profileExpertisePlaceholder')}
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-preferences" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{$_('settings.profilePreferences')}</label>
				<input type="text" id="profile-preferences" bind:value={profilePreferences} placeholder={$_('settings.profilePreferencesPlaceholder')}
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<div>
				<label for="profile-language" class="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{$_('settings.profileLanguage')}</label>
				<input type="text" id="profile-language" bind:value={profileLanguage} placeholder={$_('settings.profileLanguagePlaceholder')}
					class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm" />
			</div>
			<button onclick={saveProfile}
				class="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm {profileSaved
					? 'bg-green-600 hover:bg-green-600 text-white'
					: 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'}">
				{profileSaved ? $_('settings.profileSaved') : $_('settings.saveProfile')}
			</button>
		</div>
	</div>

	<!-- Global Rules -->
	<div class="mb-6 border-t border-slate-200 dark:border-slate-700 pt-6">
		<p class="block font-medium mb-3">{$_('settings.rulesTitle')}</p>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
			{$_('settings.rulesDescription')}
		</p>
		<textarea bind:value={globalRules}
			placeholder={$_('settings.rulesPlaceholder')}
			rows="5"
			class="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-mono resize-none"
		></textarea>
		<button onclick={saveGlobalRules}
			class="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm {rulesSaved
				? 'bg-green-600 hover:bg-green-600 text-white'
				: 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'}">
			{rulesSaved ? $_('settings.rulesSaved') : $_('settings.saveRules')}
		</button>
	</div>

	<!-- MCP Servers -->
	<div class="mb-6 border-t border-slate-200 dark:border-slate-700 pt-6">
		<p class="block font-medium mb-3">{$_('mcp.title')}</p>
		<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
			{$_('mcp.description')}
		</p>
		<button onclick={() => isMCPModalOpen = true}
			class="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm font-medium active:scale-[0.98]">
			{$_('mcp.configure')}
		</button>
		{#if mcpStore.availableTools.length > 0}
			<p class="text-xs text-green-600 dark:text-green-400 mt-2">
				{$_('mcp.toolsAvailable', { values: { count: mcpStore.availableTools.length } })}
			</p>
		{/if}
	</div>

	<MCPConfigModal bind:isOpen={isMCPModalOpen} />

	<!-- Bottom action buttons -->
	<div class="flex gap-3 border-t border-slate-200 dark:border-slate-700 pt-5">
		<button
			onclick={saveToken}
			class="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-sm font-medium text-sm active:scale-[0.98]"
		>{$_('settings.save')}</button>
		<button
			onclick={() => llmStore.clearCache()}
			class="flex-1 px-4 py-2.5 border border-red-300 dark:border-red-500/50 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 transition-all font-medium text-sm active:scale-[0.98]"
		>{$_('settings.clearCache')}</button>
	</div>
</div>
