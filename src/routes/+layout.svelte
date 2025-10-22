<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { registerServiceWorker, setupInstallPrompt } from '$lib/pwa.js';
	import { initI18n } from '$lib/i18n';
	import { isLoading } from 'svelte-i18n';
	
	let { children } = $props();
	
	// Initialise i18n / Initialize i18n
	initI18n();
	
	// Enregistre le service worker au montage / Register service worker on mount
	onMount(() => {
		// Charge la langue préférée depuis le localStorage / Load preferred language from localStorage
		const preferredLang = localStorage.getItem('preferred-language');
		if (preferredLang) {
			import('svelte-i18n').then(({ locale }) => {
				locale.set(preferredLang);
			});
		}
		
		// Enregistre le SW / Register SW
		registerServiceWorker();
		
		// Configure le prompt d'installation / Setup install prompt
		setupInstallPrompt();
	});
</script>

<svelte:head>
	<title>Oh my AI! - IA locale dans votre navigateur</title>
	<meta name="description" content="Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur." />
	<meta name="keywords" content="AI, LLM, WebAssembly, Local AI, Privacy, Chat, Chatbot" />
	
	<!-- Google Fonts - Nunito (police rounded) / Nunito (rounded font) -->
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
	<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
	
	<!-- PWA Meta Tags -->
	<meta name="application-name" content="Oh my AI!" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Oh my AI!" />
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="theme-color" content="#7c3aed" />
	
	<!-- Apple Touch Icons -->
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
	<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
	
	<!-- Favicon -->
	<link rel="icon" href={favicon} />
	<link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
	
	<!-- Manifest -->
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

<!-- Écran de chargement des traductions / Translation loading screen -->
{#if $isLoading}
	<div class="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
		<div class="flex flex-col items-center gap-4">
			<div class="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
			<p class="text-white text-lg">Loading / Chargement...</p>
		</div>
	</div>
{:else}
	{@render children?.()}
{/if}
