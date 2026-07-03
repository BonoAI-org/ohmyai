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

	// Drawer states
	let openDrawer = $state('theme');

	function toggleDrawer(id) {
		openDrawer = openDrawer === id ? null : id;
	}

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

	// Generation params state
	let temperature = $state(0.65);
	let maxTokens = $state(512);
	let frequencyPenalty = $state(0.5);
	let presencePenalty = $state(0.5);
	let generationSaved = $state(false);

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

	function saveGenerationParams() {
		llmStore.updateGenerationParams({
			temperature,
			maxTokens,
			frequencyPenalty,
			presencePenalty,
		});
		generationSaved = true;
		setTimeout(() => generationSaved = false, 2000);
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
		if (llmStore.generationParams) {
			temperature = llmStore.generationParams.temperature;
			maxTokens = llmStore.generationParams.maxTokens;
			frequencyPenalty = llmStore.generationParams.frequencyPenalty;
			presencePenalty = llmStore.generationParams.presencePenalty;
		}
	});
</script>

<div
	class="p-5 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg max-h-[85vh] overflow-y-auto"
>
	<h2 class="text-lg font-bold mb-4">{$_('settings.title')}</h2>

	<div class="space-y-2">

		<!-- Drawer: Theme & Token -->
		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
			<button
				onclick={() => toggleDrawer('theme')}
				class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
					</svg>
					<span class="font-medium text-sm">{$_('settings.colorTheme')}</span>
				</div>
				<svg class="w-4 h-4 text-slate-400 transition-transform {openDrawer === 'theme' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if openDrawer === 'theme'}
				<div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
					<div class="flex gap-3 mb-5">
						{#each colorThemes as theme}
							<button
								onclick={() => themeStore.setColorTheme(theme.id)}
								class="w-10 h-10 rounded-full {theme.color} {themeStore.colorTheme ===
								theme.id
									? 'ring-4 ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ring-purple-500'
									: 'opacity-70 hover:opacity-100 transition-opacity'}"
								aria-label="Theme {theme.name}"
								title={theme.name}
							></button>
						{/each}
					</div>

					<!-- Hugging Face Token -->
					<div class="flex justify-between items-center mb-2">
						<label for="hf-token" class="block text-xs font-medium text-slate-600 dark:text-slate-400">{$_('settings.hfToken')}</label>
						<a
							href="https://huggingface.co/settings/tokens"
							target="_blank"
							rel="noopener noreferrer"
							class="text-xs text-purple-500 dark:text-purple-400 hover:underline"
						>
							{$_('settings.hfGetToken')}
						</a>
					</div>
					<p class="text-[10px] text-slate-400 dark:text-slate-500 mb-2">
						{$_('settings.hfDescription')}
					</p>
					<input
						type="password"
						id="hf-token"
						bind:value={huggingFaceToken}
						class="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
						placeholder="hf_..."
					/>
				</div>
			{/if}
		</div>

		<!-- Drawer: User Profile -->
		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
			<button
				onclick={() => toggleDrawer('profile')}
				class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<svg class="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
					</svg>
					<span class="font-medium text-sm">{$_('settings.profileTitle')}</span>
				</div>
				<svg class="w-4 h-4 text-slate-400 transition-transform {openDrawer === 'profile' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if openDrawer === 'profile'}
				<div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
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
			{/if}
		</div>

		<!-- Drawer: Global Rules -->
		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
			<button
				onclick={() => toggleDrawer('rules')}
				class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<span class="font-medium text-sm">{$_('settings.rulesTitle')}</span>
				</div>
				<svg class="w-4 h-4 text-slate-400 transition-transform {openDrawer === 'rules' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if openDrawer === 'rules'}
				<div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
						{$_('settings.rulesDescription')}
					</p>
					<textarea bind:value={globalRules}
						placeholder={$_('settings.rulesPlaceholder')}
						rows="4"
						class="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm font-mono resize-none"
					></textarea>
					<button onclick={saveGlobalRules}
						class="w-full mt-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm {rulesSaved
							? 'bg-green-600 hover:bg-green-600 text-white'
							: 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'}">
						{rulesSaved ? $_('settings.rulesSaved') : $_('settings.saveRules')}
					</button>
				</div>
			{/if}
		</div>

		<!-- Drawer: Generation Parameters -->
		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
			<button
				onclick={() => toggleDrawer('generation')}
				class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
					</svg>
					<span class="font-medium text-sm">{$_('settings.generationTitle')}</span>
				</div>
				<svg class="w-4 h-4 text-slate-400 transition-transform {openDrawer === 'generation' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if openDrawer === 'generation'}
				<div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-4">
						{$_('settings.generationDescription')}
					</p>
					<div class="space-y-4">
						<!-- Temperature -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="gen-temperature" class="text-xs font-medium text-slate-600 dark:text-slate-400">{$_('settings.temperature')}</label>
								<span class="text-xs font-mono text-slate-500 dark:text-slate-400">{temperature.toFixed(2)}</span>
							</div>
							<input type="range" id="gen-temperature" bind:value={temperature} min="0" max="1.5" step="0.05"
								class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
							<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{$_('settings.temperatureHelp')}</p>
						</div>

						<!-- Max Tokens -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="gen-max-tokens" class="text-xs font-medium text-slate-600 dark:text-slate-400">{$_('settings.maxTokens')}</label>
								<span class="text-xs font-mono text-slate-500 dark:text-slate-400">{maxTokens}</span>
							</div>
							<input type="range" id="gen-max-tokens" bind:value={maxTokens} min="64" max="4096" step="64"
								class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
							<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{$_('settings.maxTokensHelp')}</p>
						</div>

						<!-- Frequency Penalty -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="gen-freq" class="text-xs font-medium text-slate-600 dark:text-slate-400">{$_('settings.frequencyPenalty')}</label>
								<span class="text-xs font-mono text-slate-500 dark:text-slate-400">{frequencyPenalty.toFixed(2)}</span>
							</div>
							<input type="range" id="gen-freq" bind:value={frequencyPenalty} min="0" max="2" step="0.05"
								class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
							<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{$_('settings.frequencyPenaltyHelp')}</p>
						</div>

						<!-- Presence Penalty -->
						<div>
							<div class="flex justify-between items-center mb-1">
								<label for="gen-pres" class="text-xs font-medium text-slate-600 dark:text-slate-400">{$_('settings.presencePenalty')}</label>
								<span class="text-xs font-mono text-slate-500 dark:text-slate-400">{presencePenalty.toFixed(2)}</span>
							</div>
							<input type="range" id="gen-pres" bind:value={presencePenalty} min="0" max="2" step="0.05"
								class="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600" />
							<p class="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{$_('settings.presencePenaltyHelp')}</p>
						</div>

						<button onclick={saveGenerationParams}
							class="w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm {generationSaved
								? 'bg-green-600 hover:bg-green-600 text-white'
								: 'bg-purple-600 hover:bg-purple-700 text-white active:scale-[0.98]'}">
							{generationSaved ? $_('settings.generationSaved') : $_('settings.saveGeneration')}
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Drawer: MCP Servers -->
		<div class="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
			<button
				onclick={() => toggleDrawer('mcp')}
				class="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
			>
				<div class="flex items-center gap-2.5">
					<svg class="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
					</svg>
					<span class="font-medium text-sm">{$_('mcp.title')}</span>
					{#if mcpStore.availableTools.length > 0}
						<span class="text-[10px] bg-green-500/15 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded-full font-medium">
							{mcpStore.availableTools.length} tools
						</span>
					{/if}
				</div>
				<svg class="w-4 h-4 text-slate-400 transition-transform {openDrawer === 'mcp' ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if openDrawer === 'mcp'}
				<div class="px-4 pb-4 border-t border-slate-100 dark:border-slate-700 pt-3">
					<p class="text-xs text-slate-500 dark:text-slate-400 mb-3">
						{$_('mcp.description')}
					</p>
					<button onclick={() => isMCPModalOpen = true}
						class="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all text-sm font-medium active:scale-[0.98]">
						{$_('mcp.configure')}
					</button>
				</div>
			{/if}
		</div>

	</div>

	<MCPConfigModal bind:isOpen={isMCPModalOpen} />

	<!-- Bottom action buttons -->
	<div class="flex gap-3 mt-5 pt-5 border-t border-slate-200 dark:border-slate-700">
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
