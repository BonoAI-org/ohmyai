<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Ho my AI! - IA locale dans votre navigateur</title>
	<meta name="description" content="Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur." />
	<meta name="keywords" content="AI, LLM, WebAssembly, Local AI, Privacy, Chat, Chatbot" />
	
	<!-- Favicon -->
	<link rel="icon" href={favicon} />
	
	<!-- PWA Meta Tags -->
	<meta name="theme-color" content="#7c3aed" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
	<meta name="apple-mobile-web-app-title" content="Ho my AI!" />
	<meta name="mobile-web-app-capable" content="yes" />
	
	<!-- Apple Touch Icons -->
	<link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
	<link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
	<link rel="apple-touch-icon" sizes="144x144" href="/icon-144x144.png" />
	
	<!-- Manifest -->
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

{@render children?.()}
