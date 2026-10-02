<script>
	/**
	 * Composant de sélection de langue / Language selector component
	 * Permet de basculer entre français, anglais et allemand / Allows switching between French, English and German
	 *
	 * Deux points de montage : l'en-tête, en variante compacte (le code à deux
	 * lettres), et les réglages, en variante longue (le nom de la langue).
	 * Two mount points: the header, in compact form (the two-letter code), and
	 * the settings, in long form (the language name).
	 */
	import { _, locale } from "svelte-i18n";

	/** @type {{ compact?: boolean }} */
	let { compact = false } = $props();

	// État du menu déroulant / Dropdown state
	let isOpen = $state(false);

	// Configuration des langues disponibles / Available languages configuration
	const languages = {
		fr: { name: "Français", code: "FR", flag: "🇫🇷" },
		en: { name: "English", code: "EN", flag: "🇬🇧" },
		de: { name: "Deutsch", code: "DE", flag: "🇩🇪" },
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

	/**
	 * Referme le menu lorsqu'on clique ailleurs dans la page. La page déléguait
	 * auparavant cette fermeture via une référence au composant ; le composant
	 * s'en charge désormais lui-même, grâce à la classe `language-selector` de
	 * sa racine.
	 * Closes the menu when clicking elsewhere in the page. The page used to
	 * delegate this close through a component reference; the component now
	 * handles it itself, via the `language-selector` class on its root.
	 */
	function handleClickOutside(event) {
		if (isOpen && !event.target.closest(".language-selector")) {
			isOpen = false;
		}
	}
</script>

<svelte:window onclick={handleClickOutside} />

<div class="relative language-selector">
	<button
		onclick={toggleMenu}
		class="hit-44 flex items-center gap-1.5 h-9 {compact
			? 'px-2.5'
			: 'px-3'} rounded-control bg-surface border border-border text-ink-2 hover:bg-bg transition-colors touch-manipulation"
		aria-label={$_("settings.selectLanguage")}
		title={$_("settings.language")}
		aria-expanded={isOpen}
	>
		<!-- Icône Globe en SVG / SVG Globe icon -->
		<svg
			class="w-4 h-4 flex-shrink-0"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
			></path>
		</svg>
		{#if compact}
			<span class="font-mono text-xs font-semibold tracking-wide">
				{languages[getCurrentLanguage()]?.code || "FR"}
			</span>
		{:else}
			<span class="text-sm font-medium">
				{languages[getCurrentLanguage()]?.name || "Language"}
			</span>
		{/if}
		<svg
			class="w-3.5 h-3.5 text-ink-3 transition-transform {isOpen
				? 'rotate-180'
				: ''}"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			viewBox="0 0 24 24"
			aria-hidden="true"
		>
			<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
		</svg>
	</button>

	{#if isOpen}
		<div
			class="absolute right-0 mt-2 w-44 bg-surface border border-border rounded-card shadow-xl z-[100] p-1.5"
		>
			{#each Object.entries(languages) as [code, lang]}
				<button
					onclick={(e) => changeLanguage(code, e)}
					class="w-full text-left px-2.5 py-2 rounded-control transition-colors flex items-center gap-2.5 touch-manipulation {code ===
					getCurrentLanguage()
						? 'bg-accent-soft text-accent font-semibold'
						: 'text-ink-2 hover:bg-bg'}"
				>
					<span class="text-lg leading-none">{lang.flag}</span>
					<span class="flex-1 text-sm">{lang.name}</span>
					{#if code === getCurrentLanguage()}
						<svg
							class="w-4 h-4 flex-shrink-0"
							fill="currentColor"
							viewBox="0 0 20 20"
							aria-hidden="true"
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
	{/if}
</div>
