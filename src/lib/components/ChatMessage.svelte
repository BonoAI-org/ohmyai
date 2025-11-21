<script>
	import logo from '$lib/assets/logo.svg';
	
	/**
	 * Composant pour afficher un message de chat
	 * Component to display a chat message
	 */
	
	// Props: message avec { role: 'user' | 'assistant', content: string }
	let { message } = $props();
</script>

<div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
	<div 
		class="max-w-[80%] rounded-lg p-4 {
			message.role === 'user' 
				? 'bg-purple-600 text-white' 
				: 'bg-slate-800/70 text-slate-100 border border-slate-700'
		}"
	>
		<!-- En-tête du message / Message header -->
		<div class="flex items-center gap-2 mb-2">
			{#if message.role === 'user'}
				<!-- Icône utilisateur / User icon -->
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
				</svg>
				<span class="font-semibold text-sm">Vous / You</span>
			{:else}
				<!-- Logo IA / AI logo -->
				<img src={logo} alt="AI Logo" class="w-5 h-5" />
				<span class="font-semibold text-sm text-purple-400">Assistant IA / AI Assistant</span>
			{/if}
		</div>

		<!-- Contenu du message / Message content -->
		<div class="prose prose-invert max-w-none">
			{#if message.content}
				<!-- Affiche le contenu avec préservation des sauts de ligne / Display content with line breaks preserved -->
				<p class="whitespace-pre-wrap break-words m-0">{message.content}</p>
			{:else}
				<!-- Message vide pendant la génération / Empty message during generation -->
				<span class="text-slate-400 text-sm italic">...</span>
			{/if}
		</div>

		<!-- Images attachées (si présentes) / Attached images (if any) -->
		{#if message.images && message.images.length > 0}
			<div class="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
				{#each message.images as img, idx}
					<img src={img} alt="Pièce jointe / Attachment" class="w-full h-32 object-cover rounded border border-slate-700" />
				{/each}
			</div>
		{/if}
	</div>
</div>
