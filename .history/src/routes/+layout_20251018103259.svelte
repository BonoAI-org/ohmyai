<script>
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	
	let { children } = $props();
</script>

<svelte:head>
	<title>Ho my AI! - IA locale dans votre navigateur</title>
	<meta name="description" content="Chatbot IA 100% local fonctionnant dans votre navigateur via WebAssembly. Aucune donnée envoyée à un serveur." />
	<meta name="keywords" content="AI, LLM, WebAssembly, Local AI, Privacy, Chat, Chatbot" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}
