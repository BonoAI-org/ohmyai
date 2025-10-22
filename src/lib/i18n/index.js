/**
 * Configuration de l'internationalisation avec svelte-i18n
 * Internationalization configuration with svelte-i18n
 * 
 * Supporte le français et l'anglais
 * Supports French and English
 */

import { register, init, getLocaleFromNavigator } from 'svelte-i18n';

// Enregistre les traductions / Register translations
register('en', () => import('./locales/en.json'));
register('fr', () => import('./locales/fr.json'));

/**
 * Initialise i18n avec la langue du navigateur ou français par défaut
 * Initialize i18n with browser language or French by default
 */
export function initI18n() {
	init({
		fallbackLocale: 'fr',
		initialLocale: getLocaleFromNavigator() || 'fr',
	});
}
