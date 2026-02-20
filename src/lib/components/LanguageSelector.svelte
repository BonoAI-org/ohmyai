<script>
	/**
	 * Composant de sélection de langue / Language selector component
	 * Permet de basculer entre français et anglais / Allows switching between French and English
	 */
	import { locale, locales } from "svelte-i18n";

	// État du menu déroulant / Dropdown state
	let isOpen = $state(false);

	// Configuration des langues disponibles / Available languages configuration
	const languages = {
		fr: { name: "Français", flag: "🇫🇷" },
		en: { name: "English", flag: "🇬🇧" },
	};

	/**
	 * Change la langue de l'application / Change application language
	 * @param {string} lang - Code de la langue / Language code
	 * @param {Event} event - Événement de clic / Click event
	 */
	function changeLanguage(lang, event) {
		event.stopPropagation();
		locale.set(lang);
		isOpen = false;
		// Sauvegarde la préférence / Save preference
		if (typeof window !== "undefined") {
			localStorage.setItem("preferred-language", lang);
		}
	}

	/**
	 * Obtient la langue actuelle / Get current language
	 * @returns {string}
	 */
	function getCurrentLanguage() {
		return $locale || "fr";
	}

	/**
	 * Gère le toggle du menu / Handle menu toggle
	 */
	function toggleMenu(event) {
		event.stopPropagation();
		isOpen = !isOpen;
	}

	/**
	 * Expose la fonction pour fermer le menu depuis l'extérieur / Expose function to close menu from outside
	 */
	export function closeMenu() {
		isOpen = false;
	}
</script>

<div
	class="relative language-selector bg-slate-200/50 dark:bg-slate-700/50 rounded-lg"
>
	<button
		onclick={toggleMenu}
		class="flex items-center gap-2 bg-transparent hover:bg-slate-200/50 active:bg-slate-300/50 dark:hover:bg-slate-700/80 dark:active:bg-slate-600/80 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg transition-colors touch-manipulation font-medium border border-transparent dark:border-slate-600/50"
		aria-label="Sélectionner la langue / Select language"
		title="Langue / Language"
		aria-expanded={isOpen}
	>
		<div class="flex items-center text-slate-600 dark:text-slate-400">
			<!-- Icône Globe en SVG / SVG Globe icon -->
			<svg
				class="w-4 h-4 flex-shrink-0"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
				></path>
			</svg>
		</div>
		<span class="text-sm hidden sm:inline"
			>{languages[getCurrentLanguage()]?.name || "Language"}</span
		>
		<svg
			class="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform ml-1 {isOpen
				? 'rotate-180'
				: ''}"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 9l-7 7-7-7"
			/>
		</svg>
	</button>

	{#if isOpen}
		<div
			class="fixed sm:absolute left-0 right-0 sm:left-auto sm:right-0 mt-2 mx-4 sm:mx-0 sm:w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-[100]"
		>
			<div class="p-2">
				{#each Object.entries(languages) as [code, lang]}
					<button
						onclick={(e) => changeLanguage(code, e)}
						class="w-full text-left px-3 py-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700/50 active:bg-slate-200 dark:active:bg-slate-600 transition-colors flex items-center gap-3 touch-manipulation {code ===
						getCurrentLanguage()
							? 'bg-purple-50 dark:bg-purple-600/20 border border-purple-200 dark:border-purple-500/50'
							: ''}"
					>
						<span class="text-xl">{lang.flag}</span>
						<span class="flex-1 text-slate-900 dark:text-white"
							>{lang.name}</span
						>
						{#if code === getCurrentLanguage()}
							<svg
								class="w-4 h-4 text-purple-400"
								fill="currentColor"
								viewBox="0 0 20 20"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>
