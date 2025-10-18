<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';
	import { registerServiceWorker, setupInstallPrompt } from '$lib/pwa.js';
	
	let { children } = $props();
	
	// Enregistre le service worker au montage / Register service worker on mount
	onMount(() => {
		// Enregistre le SW / Register SW
		registerServiceWorker();
		
		// Configure le prompt d'installation / Setup install prompt
		setupInstallPrompt();
	});
</script>

<svelte:head>
	<title>Ho my AI! - IA locale dans votre navigateur</title>
	<meta name="description" content="Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur." />
	<meta name="keywords" content="AI, LLM, WebAssembly, Local AI, Privacy, Chat, Chatbot" />
	
	<!-- PWA Meta Tags -->
	<meta name="application-name" content="Ho my AI!" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Ho my AI!" />
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

{@render children?.()}
