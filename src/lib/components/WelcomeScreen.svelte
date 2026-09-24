<script>
	/**
	 * Écran de premier lancement, affiché tant qu'aucun modèle n'est installé.
	 * C'est le seul écran dans cet état : on ne montre jamais « Commencez une
	 * conversation » en même temps que « Téléchargement requis ».
	 * First-launch screen, shown while no model is installed. It is the only
	 * screen in that state: "Start a conversation" never shows at the same time
	 * as "Download required".
	 *
	 * Colonne gauche : l'offre et ses preuves. Colonne droite : le diagnostic
	 * réel de l'appareil, puis le modèle recommandé avec son coût annoncé
	 * avant le clic.
	 * Left column: the offer and its proofs. Right column: the real device
	 * diagnosis, then the recommended model with its cost stated before the
	 * click.
	 */
	import { _ } from "svelte-i18n";
	import { llmStore } from "$lib/stores/llm.svelte.js";
	import { AVAILABLE_MODELS, findModel } from "$lib/llm/models.js";
	import {
		hasUsableWebGPU,
		parseGigabytes,
		TRANSFORMERS_MAX_MODEL_GB,
	} from "$lib/llm/hardware.js";
	import { onMount } from "svelte";
	import { estimateMinutes } from "$lib/llm/downloadEstimate.js";

	/** @type {{ onmanage: () => void }} */
	let { onmanage } = $props();

	const REPO_URL = "https://github.com/BonoAI-org/ohmyai";
	const WEBGPU_HELP_URL =
		"https://developer.chrome.com/docs/web-platform/webgpu/troubleshooting-tips";

	// Diagnostic réel : la présence de l'API ne dit pas qu'un adaptateur
	// existe. `null` tant que la réponse n'est pas connue, pour ne pas
	// afficher un verdict avant de l'avoir.
	// Real diagnosis: the API being present does not mean an adapter exists.
	// `null` until the answer is known, so no verdict shows before we have it.
	let hasWebGPU = $state(null);
	onMount(async () => {
		hasWebGPU = await hasUsableWebGPU();
	});

	// Mémoire rapportée par le navigateur. Absente de Firefox et de Safari.
	// Memory reported by the browser. Absent from Firefox and Safari.
	const reportedMemoryGB =
		typeof navigator !== "undefined" &&
		typeof navigator.deviceMemory === "number"
			? navigator.deviceMemory
			: null;

	const model = $derived(
		findModel(llmStore.selectedModel, llmStore.customModels)
	);
	const modelSizeGB = $derived(parseGigabytes(model?.size));
	const estimatedMinutes = $derived(estimateMinutes(modelSizeGB));
	const modelCount = AVAILABLE_MODELS.length;

	// Le navigateur refuse au-delà d'une certaine taille, quelle que soit la
	// machine : proposer le téléchargement serait mentir.
	// The browser refuses past a certain size, whatever the machine: offering
	// the download would be a lie.
	const isBeyondBrowserLimit = $derived(
		llmStore.hardwareCheck?.reason === "browser-limit"
	);

	// Trois preuves, dans l'ordre de la maquette / Three proofs, mockup order
	const proofs = [
		{ key: "offline", path: "M2 12h4 M18 12h4" },
		{ key: "nothingLeaves", path: "" },
		{ key: "verifiable", path: "" },
	];
</script>

<div class="flex flex-col gap-10 lg:flex-row lg:gap-14 lg:items-start py-8 lg:py-12">
	<!-- ============ L'offre et ses preuves / The offer and its proofs ============ -->
	<div class="flex-1 min-w-0 flex flex-col gap-5">
		<div
			class="self-start inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-soft text-accent font-mono text-xs tracking-[0.04em]"
		>
			<span
				class="w-[7px] h-[7px] rounded-full bg-accent"
				aria-hidden="true"
			></span>
			{$_("welcome.badge")}
		</div>

		<h1
			class="text-4xl lg:text-[54px] leading-[1.03] text-balance text-ink"
		>
			{$_("welcome.title")}
		</h1>

		<p class="text-[17px] lg:text-lg leading-[1.55] text-ink-2 max-w-[540px]">
			{$_("welcome.lede")}
		</p>

		<ul class="flex flex-col gap-3.5 mt-1">
			{#each proofs as proof (proof.key)}
				<li class="flex gap-3.5 items-start">
					<svg
						class="w-5 h-5 flex-shrink-0 mt-0.5 text-accent"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="1.9"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						{#if proof.key === "offline"}
							<path d="M2 12h4" /><path d="M18 12h4" />
							<rect x="7" y="7" width="10" height="10" rx="3" />
						{:else if proof.key === "nothingLeaves"}
							<path d="M12 3 4 6v6c0 5 3.4 8.3 8 9 4.6-.7 8-4 8-9V6z" />
							<path d="m9 12 2 2 4-4" />
						{:else}
							<path d="m9 18-6-6 6-6" /><path d="m15 6 6 6-6 6" />
						{/if}
					</svg>
					<p class="text-[15px] leading-[1.45] text-ink-2">
						<strong class="font-semibold text-ink">
							{$_(`welcome.proofs.${proof.key}.title`)}
						</strong>
						{$_(`welcome.proofs.${proof.key}.body`)}
						{#if proof.key === "verifiable"}
							<a
								href={REPO_URL}
								target="_blank"
								rel="noopener noreferrer"
								class="text-accent hover:text-accent-hover font-medium"
							>
								BonoAI-org/ohmyai
							</a>
						{/if}
					</p>
				</li>
			{/each}
		</ul>
	</div>

	<!-- ============ Votre appareil / Your device ============ -->
	<div
		class="w-full lg:w-[456px] lg:flex-shrink-0 p-6 bg-surface border border-border rounded-card-lg shadow-[0_1px_2px_rgba(20,18,13,0.04)] flex flex-col gap-4"
	>
		<div class="flex items-center justify-between gap-3">
			<h2
				class="font-mono text-xs tracking-[0.08em] uppercase text-ink-3 font-normal"
			>
				{$_("welcome.device.title")}
			</h2>
			<span class="font-mono text-xs text-ink-3">
				{reportedMemoryGB
					? $_("welcome.device.memory", {
							values: { gb: reportedMemoryGB },
						})
					: $_("welcome.device.memoryUnknown")}
			</span>
		</div>

		<!-- Diagnostic WebGPU : l'alerte porte la conséquence, pas le symptôme -->
		<!-- WebGPU diagnosis: the alert carries the consequence, not the symptom -->
		{#if hasWebGPU === null}
			<div
				class="px-4 py-3 rounded-button bg-bg font-mono text-[13px] text-ink-3"
			>
				{$_("welcome.device.webgpuChecking")}
			</div>
		{:else if hasWebGPU}
			<div
				class="flex items-start gap-2.5 px-4 py-3 rounded-button bg-accent-soft"
			>
				<svg
					class="w-[18px] h-[18px] flex-shrink-0 mt-px text-accent"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="m5 13 4 4L19 7" />
				</svg>
				<p class="text-[13px] leading-[1.45] text-accent">
					{$_("welcome.device.webgpuOk")}
				</p>
			</div>
		{:else}
			<div
				class="px-4 py-3.5 rounded-button bg-warn-soft border border-warn-border"
			>
				<div class="flex gap-2.5 items-start">
					<svg
						class="w-[18px] h-[18px] flex-shrink-0 mt-px text-warn-ink"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
					>
						<path d="M12 9v4" /><path d="M12 17h.01" />
						<path
							d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"
						/>
					</svg>
					<div>
						<p class="text-[15px] font-semibold text-ink">
							{$_("welcome.device.webgpuMissing")}
						</p>
						<p class="mt-1 text-[13px] leading-[1.45] text-warn-ink">
							{$_("welcome.device.webgpuConsequence")}
						</p>
						<a
							href={WEBGPU_HELP_URL}
							target="_blank"
							rel="noopener noreferrer"
							class="inline-block mt-1.5 text-[13px] font-semibold text-warn-ink hover:underline"
						>
							{$_("welcome.device.webgpuHelp")}
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- Modèle recommandé selon le diagnostic / Model recommended per the diagnosis -->
		{#if model}
			<div class="p-4 border border-border rounded-button">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="text-[17px] font-semibold tracking-[-0.01em] text-ink">
							{model.name}
						</p>
						{#if model.description}
							<p class="mt-0.5 text-[13px] leading-[1.45] text-ink-2">
								{model.description}
							</p>
						{/if}
					</div>
					<span
						class="flex-shrink-0 px-2.5 py-1 rounded-full bg-accent-soft text-accent text-xs font-semibold"
					>
						{$_("welcome.model.recommendedHere")}
					</span>
				</div>
				<div
					class="mt-3 flex flex-wrap gap-x-[18px] gap-y-1 font-mono text-xs text-ink-2"
				>
					{#if model.size}<span>{model.size}</span>{/if}
					{#if estimatedMinutes}
						<span>
							{$_("welcome.model.estimatedTime", {
								values: { minutes: estimatedMinutes },
							})}
						</span>
					{/if}
					<span>{$_("welcome.model.storedOffline")}</span>
				</div>
			</div>
		{/if}

		{#if isBeyondBrowserLimit}
			<p
				class="px-4 py-3 rounded-button bg-danger-soft border border-danger-border text-[13px] leading-[1.45] text-danger"
			>
				{$_("loading.hardwareReasonBrowserLimit", {
					values: { limit: TRANSFORMERS_MAX_MODEL_GB },
				})}
			</p>
		{:else}
			<button
				onclick={() => llmStore.initEngine(true)}
				class="h-13 rounded-button bg-accent text-white text-base font-semibold hover:bg-accent-hover transition-colors touch-manipulation"
			>
				{$_("welcome.actions.download")}
			</button>
		{/if}

		<!-- L'action secondaire dit ce qu'elle coûte, plus « quand même ». -->
		<!-- The secondary action says what it costs, no more "anyway". -->
		<button
			onclick={onmanage}
			class="h-touch rounded-button border border-border bg-surface text-[15px] text-ink hover:bg-bg transition-colors touch-manipulation"
		>
			{$_("welcome.actions.compare", { values: { count: modelCount } })}
		</button>

		<p class="text-xs leading-[1.45] text-ink-3">
			{$_("welcome.device.retention")}
		</p>
	</div>
</div>
