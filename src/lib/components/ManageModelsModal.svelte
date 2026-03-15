<script>
    import { llmStore, AVAILABLE_MODELS } from "$lib/stores/llm.svelte.js";
    import { _ } from "svelte-i18n";

    /**
     * Props du composant / Component props
     */
    let { isOpen = $bindable(false) } = $props();

    // Tabs: 'manage', 'add', 'rules'
    let activeTab = $state("manage");

    // --- ADD MODEL STATE ---
    let modelId = $state("");
    let modelName = $state("");
    let modelUrl = $state("");
    let modelSize = $state("");
    let modelDescription = $state("");
    let addModelError = $state("");

    // --- RULES STATE ---
    let localSystemPrompt = $state("");

    // Sync localSystemPrompt with store when modal opens
    $effect(() => {
        if (isOpen) {
            localSystemPrompt = llmStore.systemPrompt || "";
        }
    });

    /**
     * Réinitialise le formulaire d'ajout / Reset the add form
     */
    function resetAddForm() {
        modelId = "";
        modelName = "";
        modelUrl = "";
        modelSize = "";
        modelDescription = "";
        addModelError = "";
    }

    /**
     * Ferme le modal / Close the modal
     */
    function closeModal() {
        isOpen = false;
        resetAddForm();
        activeTab = "manage"; // reset tab
    }

    /**
     * Gère la soumission du formulaire d'ajout / Handle add form submission
     */
    function handleAddSubmit(event) {
        event.preventDefault();
        addModelError = "";

        if (!modelId.trim() || !modelName.trim() || !modelUrl.trim()) {
            addModelError =
                "Veuillez remplir tous les champs requis / Please fill all required fields";
            return;
        }

        try {
            llmStore.addCustomModel({
                id: modelId.trim(),
                name: modelName.trim(),
                url: modelUrl.trim(),
                size: modelSize.trim() || "Inconnue / Unknown",
                description:
                    modelDescription.trim() ||
                    "Modèle personnalisé / Custom model",
            });
            resetAddForm();
            activeTab = "manage"; // Switch back to manage tab to see the new model
        } catch (err) {
            addModelError = err.message;
        }
    }

    /**
     * Sauvegarder les règles globales / Save global rules
     */
    function saveRules() {
        llmStore.updateSystemPrompt(localSystemPrompt.trim());
        closeModal();
    }

    function getCombinedModels() {
        return [...AVAILABLE_MODELS, ...llmStore.customModels];
    }
</script>

{#if isOpen}
    <!-- Overlay / Overlay -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
        class="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onclick={closeModal}
        onkeydown={(e) => e.key === "Escape" && closeModal()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
    >
        <!-- Modal / Modal -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
        <div
            class="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="document"
        >
            <!-- Header / Header -->
            <div
                class="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
            >
                <h2
                    id="modal-title"
                    class="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2"
                >
                    <svg
                        class="w-6 h-6 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        ><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        ></path><path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        ></path></svg
                    >
                    Gérer les Modèles / Manage Models
                </h2>
                <button
                    onclick={closeModal}
                    class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    aria-label="Fermer / Close"
                >
                    <svg
                        class="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Tabs -->
            <div
                class="flex border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-4 pt-2"
            >
                <button
                    class="px-4 py-2 text-sm font-medium border-b-2 outline-none transition-colors {activeTab ===
                    'manage'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                    onclick={() => (activeTab = "manage")}
                >
                    🗂️ Gérer
                </button>
                <button
                    class="px-4 py-2 text-sm font-medium border-b-2 outline-none transition-colors {activeTab ===
                    'add'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                    onclick={() => (activeTab = "add")}
                >
                    ➕ Ajouter
                </button>
                <button
                    class="px-4 py-2 text-sm font-medium border-b-2 outline-none transition-colors {activeTab ===
                    'rules'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}"
                    onclick={() => (activeTab = "rules")}
                >
                    📜 AI Rules
                </button>
            </div>

            <!-- Body / Body -->
            <div class="p-6 overflow-y-auto flex-1">
                <!-- TAB: MANAGE MODELS -->
                {#if activeTab === "manage"}
                    <div class="space-y-4">
                        <p
                            class="text-sm text-slate-500 dark:text-slate-400 mb-4"
                        >
                            Gérez vos modèles d'IA locaux. Les modèles
                            personnalisés peuvent être supprimés de la liste.
                        </p>

                        {#each getCombinedModels() as model}
                            <div
                                class="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                            >
                                <div>
                                    <div
                                        class="font-semibold text-slate-900 dark:text-white flex items-center gap-2"
                                    >
                                        {model.name}
                                        {#if model.custom}
                                            <span
                                                class="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20"
                                                >Custom</span
                                            >
                                        {/if}
                                        {#if llmStore.downloadedModels[model.id]}
                                            <span
                                                class="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded border border-green-500/20"
                                                title="Téléchargé en local"
                                                >Local</span
                                            >
                                        {/if}
                                    </div>
                                    <div
                                        class="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[300px]"
                                    >
                                        {model.id} • {model.size}
                                    </div>
                                </div>

                                {#if model.custom}
                                    <button
                                        onclick={() => {
                                            if (
                                                confirm(
                                                    "Supprimer ce modèle personnalisé de la liste ? / Remove this custom model?",
                                                )
                                            ) {
                                                llmStore.removeCustomModel(
                                                    model.id,
                                                );
                                            }
                                        }}
                                        class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                        title="Supprimer / Delete"
                                    >
                                        <svg
                                            class="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            ><path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                            /></svg
                                        >
                                    </button>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}

                <!-- TAB: ADD CUSTOM MODEL -->
                {#if activeTab === "add"}
                    <form onsubmit={handleAddSubmit} class="space-y-4">
                        <!-- Description / Description -->
                        <div
                            class="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200"
                        >
                            <p
                                class="font-semibold mb-2 flex items-center gap-2"
                            >
                                <svg
                                    class="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    ><path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    ></path></svg
                                >
                                Information
                            </p>
                            <p>
                                Vous pouvez ajouter des modèles WebLLM
                                compatibles en fournissant leur ID et URL. Les
                                modèles doivent être au format MLC (Machine
                                Learning Compilation).
                            </p>
                        </div>

                        <!-- Erreur / Error -->
                        {#if addModelError}
                            <div
                                class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-sm text-red-800 dark:text-red-200"
                            >
                                <p class="font-semibold mb-1">
                                    ❌ Erreur / Error
                                </p>
                                <p>{addModelError}</p>
                            </div>
                        {/if}

                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <!-- ID du modèle / Model ID -->
                            <div>
                                <label
                                    for="modelId"
                                    class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                                >
                                    ID du Modèle / Model ID <span
                                        class="text-red-500">*</span
                                    >
                                </label>
                                <input
                                    id="modelId"
                                    type="text"
                                    bind:value={modelId}
                                    placeholder="Ex: Llama-3.2-1B-Instruct-q4f32_1-MLC"
                                    class="w-full bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg px-4 py-2 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                                    required
                                />
                            </div>

                            <!-- Nom du modèle / Model name -->
                            <div>
                                <label
                                    for="modelName"
                                    class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                                >
                                    Nom d'Affichage / Display Name <span
                                        class="text-red-500">*</span
                                    >
                                </label>
                                <input
                                    id="modelName"
                                    type="text"
                                    bind:value={modelName}
                                    placeholder="Ex: Mon Modèle Personnalisé"
                                    class="w-full bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg px-4 py-2 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                                    required
                                />
                            </div>
                        </div>

                        <!-- URL du modèle / Model URL -->
                        <div>
                            <label
                                for="modelUrl"
                                class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                            >
                                URL du Modèle / Model URL <span
                                    class="text-red-500">*</span
                                >
                            </label>
                            <input
                                id="modelUrl"
                                type="url"
                                bind:value={modelUrl}
                                placeholder="https://example.com/models/my-model"
                                class="w-full bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg px-4 py-2 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                                required
                            />
                            <p
                                class="text-xs text-slate-500 dark:text-slate-400 mt-1"
                            >
                                Doit pointer vers le dépôt contenant le fichier <code
                                    >ndarray-cache.json</code
                                >
                            </p>
                        </div>

                        <div class="grid grid-cols-1 gap-4">
                            <!-- Taille du modèle / Model size -->
                            <div>
                                <label
                                    for="modelSize"
                                    class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                                >
                                    Taille / Size <span
                                        class="text-slate-400 font-normal"
                                        >(Optionnel)</span
                                    >
                                </label>
                                <input
                                    id="modelSize"
                                    type="text"
                                    bind:value={modelSize}
                                    placeholder="Ex: ~1.5 GB"
                                    class="w-full bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white rounded-lg px-4 py-2 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                                />
                            </div>
                        </div>

                        <!-- Boutons / Buttons -->
                        <div
                            class="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700"
                        >
                            <button
                                type="submit"
                                class="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/25"
                            >
                                ➕ Ajouter à la liste
                            </button>
                        </div>
                    </form>
                {/if}

                <!-- TAB: AI RULES (SYSTEM PROMPT) -->
                {#if activeTab === "rules"}
                    <div
                        class="space-y-4 flex flex-col h-[60vh] sm:h-auto sm:min-h-[300px]"
                    >
                        <div class="flex justify-between flex-wrap gap-2">
                            <p
                                class="text-sm text-slate-500 dark:text-slate-400"
                            >
                                Définit le comportement global de l'assistant
                                (System Prompt). Ce texte est inséré au début de
                                chaque nouvelle conversation.
                            </p>
                            <button
                                type="button"
                                class="text-xs text-purple-600 dark:text-purple-400 hover:underline"
                                onclick={() =>
                                    (localSystemPrompt =
                                        "Tu es un assistant IA utile, expert en programmation et polyvalent. Tu réponds toujours de manière claire, concise et précise dans la langue de l'utilisateur. Tu utilises le gras pour souligner les concepts clés.")}
                            >
                                Réinitialiser par défaut
                            </button>
                        </div>

                        <textarea
                            bind:value={localSystemPrompt}
                            placeholder="Tu es un assistant utile..."
                            class="flex-1 w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white rounded-lg p-4 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow font-mono text-sm resize-none"
                        ></textarea>

                        <div class="flex gap-3 pt-2">
                            <button
                                type="button"
                                onclick={saveRules}
                                class="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/25"
                            >
                                💾 Sauvegarder les règles
                            </button>
                        </div>
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
