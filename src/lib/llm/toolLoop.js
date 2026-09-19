/**
 * Boucle de génération WebLLM avec appels d'outils (MCP).
 * WebLLM generation loop with tool calling (MCP).
 *
 * Le modèle peut répondre en demandant l'exécution d'un outil plutôt qu'en
 * produisant du texte. Il faut alors exécuter l'outil, réinjecter son résultat
 * dans le contexte, et relancer la génération, jusqu'à ce que le modèle
 * réponde en texte. Ces allers-retours étaient imbriqués dans `sendMessage` ;
 * ils vivent ici, séparés de l'état réactif du store, qui n'est plus touché
 * que par les callbacks.
 *
 * The model may answer by requesting a tool execution instead of producing
 * text. The tool must then run, its result be injected back into the context,
 * and generation restarted, until the model answers with text. These
 * round-trips were nested inside `sendMessage`; they live here, separated from
 * the store's reactive state, which is now only touched through callbacks.
 */

/**
 * Accumule les fragments d'appels d'outils reçus en streaming, en place.
 * Le modèle envoie le nom et les arguments par morceaux, indexés.
 * Accumulates streamed tool-call fragments, in place. The model sends the name
 * and the arguments in indexed pieces.
 *
 * @param {Array<{ id: string, function: { name: string, arguments: string } }>} toolCalls
 * @param {Array<{ index?: number, id?: string, function?: { name?: string, arguments?: string } }>} deltaToolCalls
 * @returns {Array<any>} le même tableau, muté / the same array, mutated
 */
export function accumulateToolCallDeltas(toolCalls, deltaToolCalls) {
	for (const tc of deltaToolCalls) {
		const idx = tc.index ?? 0;
		if (!toolCalls[idx]) {
			toolCalls[idx] = { id: tc.id || `call_${idx}`, function: { name: '', arguments: '' } };
		}
		if (tc.function?.name) toolCalls[idx].function.name += tc.function.name;
		if (tc.function?.arguments) toolCalls[idx].function.arguments += tc.function.arguments;
	}
	return toolCalls;
}

/**
 * Exécute un appel d'outil et normalise son résultat en chaîne.
 * Une erreur n'interrompt pas la génération : elle est renvoyée au modèle sous
 * forme de résultat, pour qu'il puisse expliquer ou réessayer.
 * Runs one tool call and normalizes its result to a string. An error does not
 * abort generation: it is handed back to the model as a result, so it can
 * explain or retry.
 *
 * @param {{ function: { name: string, arguments: string } }} toolCall
 * @param {(name: string, args: any) => Promise<any>} callTool
 * @returns {Promise<{ resultStr: string, hasError: boolean }>}
 */
export async function executeToolCall(toolCall, callTool) {
	let result;
	let hasError = false;
	try {
		const args = JSON.parse(toolCall.function.arguments || '{}');
		result = await callTool(toolCall.function.name, args);
	} catch (err) {
		result = { error: err.message };
		hasError = true;
	}
	const resultStr = typeof result === 'string' ? result : JSON.stringify(result);
	return { resultStr, hasError };
}

/**
 * Enchaîne les tours de génération jusqu'à une réponse en texte.
 * Runs generation rounds until the model answers with text.
 *
 * `chatMessages` est muté en place : les messages assistant porteurs d'appels
 * d'outils et les messages de résultat y sont ajoutés, comme attendu par le
 * moteur au tour suivant.
 * `chatMessages` is mutated in place: assistant messages carrying tool calls
 * and result messages are appended, as the engine expects on the next round.
 *
 * @param {{ chat: { completions: { create: (p: any) => Promise<AsyncIterable<any>> } } }} engine
 * @param {Array<any>} chatMessages
 * @param {{
 *   params: Record<string, any>,
 *   tools?: Array<any>,
 *   signal?: AbortSignal,
 *   onDelta: (text: string) => void,
 *   onToolCalls: (assistantContent: string, toolCalls: Array<any>) => void,
 *   onToolResult: (index: number, outcome: { resultStr: string, hasError: boolean }) => void,
 *   onRoundEnd: () => void,
 *   callTool: (name: string, args: any) => Promise<any>,
 *   maxRounds?: number
 * }} deps
 */
export async function runToolLoop(engine, chatMessages, deps) {
	const {
		params,
		tools,
		signal,
		onDelta,
		onToolCalls,
		onToolResult,
		onRoundEnd,
		callTool,
		maxRounds = 5
	} = deps;

	let roundsLeft = maxRounds;

	while (roundsLeft > 0) {
		if (signal?.aborted) break;

		const completionParams = { messages: chatMessages, ...params, stream: true };
		if (tools && tools.length > 0) {
			completionParams.tools = tools;
			completionParams.tool_choice = 'auto';
		}

		const stream = await engine.chat.completions.create(completionParams);

		let assistantContent = '';
		/** @type {Array<any>} */
		let toolCalls = [];
		let lastFinishReason = null;

		for await (const chunk of stream) {
			if (signal?.aborted) break;

			const choice = chunk.choices[0];
			if (!choice) continue;

			lastFinishReason = choice.finish_reason || lastFinishReason;
			const delta = choice.delta;

			if (delta?.content) {
				assistantContent += delta.content;
				onDelta(delta.content);
			}

			if (delta?.tool_calls) {
				accumulateToolCallDeltas(toolCalls, delta.tool_calls);
			}
		}

		// Pas d'appel d'outil demandé, ou réponse tronquée par max_tokens : la
		// réponse en texte est complète.
		// No tool call requested, or answer truncated by max_tokens: the text
		// answer is complete.
		if (lastFinishReason !== 'tool_calls' || toolCalls.length === 0) break;

		onToolCalls(assistantContent, toolCalls);

		chatMessages.push({
			role: 'assistant',
			content: assistantContent || null,
			tool_calls: toolCalls.map((tc, i) => ({
				id: tc.id || `call_${i}`,
				type: 'function',
				function: { name: tc.function.name, arguments: tc.function.arguments }
			}))
		});

		for (let i = 0; i < toolCalls.length; i++) {
			const tc = toolCalls[i];
			const outcome = await executeToolCall(tc, callTool);

			chatMessages.push({
				role: 'tool',
				tool_call_id: tc.id || `call_${i}`,
				content: outcome.resultStr
			});

			onToolResult(i, outcome);
		}

		onRoundEnd();
		roundsLeft--;
	}
}
