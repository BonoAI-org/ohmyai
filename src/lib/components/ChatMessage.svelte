<script>
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
				<!-- Icône IA / AI icon -->
				<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
						d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
				</svg>
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
	</div>
</div>
