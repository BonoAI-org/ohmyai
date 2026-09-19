import { test, expect, describe } from 'bun:test';
import { accumulateToolCallDeltas, executeToolCall, runToolLoop } from './toolLoop.js';

/**
 * Fabrique un faux moteur dont chaque tour renvoie une liste de chunks.
 * Builds a fake engine whose every round returns a list of chunks.
 * @param {Array<Array<any>>} rounds
 */
function fakeEngine(rounds) {
	const calls = [];
	let round = 0;
	return {
		calls,
		chat: {
			completions: {
				async create(params) {
					calls.push(params);
					const chunks = rounds[round++] ?? [];
					return (async function* () {
						for (const c of chunks) yield c;
					})();
				}
			}
		}
	};
}

const textChunk = (content, finish = null) => ({
	choices: [{ delta: { content }, finish_reason: finish }]
});

const toolChunk = (toolCalls, finish = null) => ({
	choices: [{ delta: { tool_calls: toolCalls }, finish_reason: finish }]
});

// Dernier chunk de `stream_options.include_usage` : aucun `choices`.
// Final chunk from `stream_options.include_usage`: no `choices` at all.
const usageChunk = (total) => ({ choices: [], usage: { total_tokens: total } });

/** Callbacks inertes, surchargeables. / Inert callbacks, overridable. */
function spies(over = {}) {
	const seen = { deltas: [], toolCalls: [], results: [], roundEnds: 0, tools: [], usages: [] };
	return {
		seen,
		deps: {
			params: { temperature: 0.5, max_tokens: 100 },
			onDelta: (t) => seen.deltas.push(t),
			onToolCalls: (c, tc) => seen.toolCalls.push({ content: c, count: tc.length }),
			onToolResult: (i, o) => seen.results.push({ i, ...o }),
			onRoundEnd: () => seen.roundEnds++,
			onUsage: (u) => seen.usages.push(u.total_tokens),
			callTool: async (name, args) => {
				seen.tools.push({ name, args });
				return { ok: true };
			},
			...over
		}
	};
}

describe('accumulateToolCallDeltas', () => {
	test('assemble un nom et des arguments reçus en morceaux', () => {
		const acc = [];
		accumulateToolCallDeltas(acc, [{ index: 0, id: 'c1', function: { name: 'get_' } }]);
		accumulateToolCallDeltas(acc, [{ index: 0, function: { name: 'time' } }]);
		accumulateToolCallDeltas(acc, [{ index: 0, function: { arguments: '{"tz":' } }]);
		accumulateToolCallDeltas(acc, [{ index: 0, function: { arguments: '"utc"}' } }]);
		expect(acc).toEqual([
			{ id: 'c1', function: { name: 'get_time', arguments: '{"tz":"utc"}' } }
		]);
	});

	test('gère plusieurs outils en parallèle par leur index', () => {
		const acc = [];
		accumulateToolCallDeltas(acc, [
			{ index: 0, id: 'a', function: { name: 'un' } },
			{ index: 1, id: 'b', function: { name: 'deux' } }
		]);
		expect(acc.map((t) => t.function.name)).toEqual(['un', 'deux']);
		expect(acc.map((t) => t.id)).toEqual(['a', 'b']);
	});

	test('attribue un identifiant de repli quand le modèle n\'en fournit pas', () => {
		const acc = [];
		accumulateToolCallDeltas(acc, [{ index: 2, function: { name: 'x' } }]);
		expect(acc[2].id).toBe('call_2');
	});

	test('traite un delta sans index comme le premier outil', () => {
		const acc = [];
		accumulateToolCallDeltas(acc, [{ function: { name: 'seul' } }]);
		expect(acc[0].function.name).toBe('seul');
	});
});

describe('executeToolCall', () => {
	test('sérialise un résultat objet', async () => {
		const out = await executeToolCall(
			{ function: { name: 'f', arguments: '{"a":1}' } },
			async () => ({ v: 2 })
		);
		expect(out).toEqual({ resultStr: '{"v":2}', hasError: false });
	});

	test('laisse une chaîne telle quelle', async () => {
		const out = await executeToolCall({ function: { name: 'f', arguments: '{}' } }, async () => 'brut');
		expect(out).toEqual({ resultStr: 'brut', hasError: false });
	});

	test('transmet les arguments décodés', async () => {
		let received;
		await executeToolCall({ function: { name: 'f', arguments: '{"tz":"utc"}' } }, async (n, a) => {
			received = { n, a };
			return '';
		});
		expect(received).toEqual({ n: 'f', a: { tz: 'utc' } });
	});

	test('traite des arguments vides comme un objet vide', async () => {
		let received;
		await executeToolCall({ function: { name: 'f', arguments: '' } }, async (n, a) => {
			received = a;
			return '';
		});
		expect(received).toEqual({});
	});

	test('rapporte une erreur d\'outil sans lever', async () => {
		const out = await executeToolCall({ function: { name: 'f', arguments: '{}' } }, async () => {
			throw new Error('serveur injoignable');
		});
		expect(out.hasError).toBe(true);
		expect(out.resultStr).toBe('{"error":"serveur injoignable"}');
	});

	test('rapporte des arguments JSON invalides sans lever', async () => {
		const out = await executeToolCall(
			{ function: { name: 'f', arguments: '{pas du json' } },
			async () => 'jamais appelé'
		);
		expect(out.hasError).toBe(true);
	});
});

describe('runToolLoop', () => {
	test('un tour sans outil pousse le texte et ne relance pas', async () => {
		const engine = fakeEngine([[textChunk('Bon'), textChunk('jour', 'stop')]]);
		const { seen, deps } = spies();
		const messages = [{ role: 'user', content: 'salut' }];

		await runToolLoop(engine, messages, deps);

		expect(seen.deltas).toEqual(['Bon', 'jour']);
		expect(seen.roundEnds).toBe(0);
		expect(engine.calls.length).toBe(1);
		expect(messages.length).toBe(1);
	});

	test('un appel d\'outil déclenche exécution puis second tour', async () => {
		const engine = fakeEngine([
			[toolChunk([{ index: 0, id: 'c1', function: { name: 'get_time', arguments: '{}' } }], 'tool_calls')],
			[textChunk('Il est midi', 'stop')]
		]);
		const { seen, deps } = spies();
		const messages = [{ role: 'user', content: 'quelle heure' }];

		await runToolLoop(engine, messages, deps);

		expect(seen.tools).toEqual([{ name: 'get_time', args: {} }]);
		expect(seen.roundEnds).toBe(1);
		expect(engine.calls.length).toBe(2);
		// contexte enrichi : message assistant avec tool_calls, puis résultat
		expect(messages.map((m) => m.role)).toEqual(['user', 'assistant', 'tool', 'user'].slice(0, 3));
		expect(messages[1].tool_calls[0].function.name).toBe('get_time');
		expect(messages[2]).toEqual({ role: 'tool', tool_call_id: 'c1', content: '{"ok":true}' });
		expect(seen.deltas).toEqual(['Il est midi']);
	});

	test('signale les appels d\'outils avant de les exécuter', async () => {
		const order = [];
		const engine = fakeEngine([
			[toolChunk([{ index: 0, id: 'c1', function: { name: 't', arguments: '{}' } }], 'tool_calls')],
			[textChunk('fini', 'stop')]
		]);
		const { deps } = spies({
			onToolCalls: () => order.push('signalé'),
			callTool: async () => {
				order.push('exécuté');
				return '';
			},
			onToolResult: () => order.push('résultat'),
			onRoundEnd: () => order.push('tour terminé')
		});

		await runToolLoop(engine, [], deps);
		expect(order).toEqual(['signalé', 'exécuté', 'résultat', 'tour terminé']);
	});

	test('une erreur d\'outil est remontée et la boucle continue', async () => {
		const engine = fakeEngine([
			[toolChunk([{ index: 0, id: 'c1', function: { name: 'casse', arguments: '{}' } }], 'tool_calls')],
			[textChunk('désolé', 'stop')]
		]);
		const { seen, deps } = spies({
			callTool: async () => {
				throw new Error('boum');
			}
		});

		await runToolLoop(engine, [], deps);
		expect(seen.results).toEqual([{ i: 0, resultStr: '{"error":"boum"}', hasError: true }]);
		expect(engine.calls.length).toBe(2);
	});

	test('plafonne le nombre de tours', async () => {
		// Le modèle redemande indéfiniment un outil.
		const loopRound = [
			toolChunk([{ index: 0, id: 'c', function: { name: 't', arguments: '{}' } }], 'tool_calls')
		];
		const engine = fakeEngine([loopRound, loopRound, loopRound, loopRound, loopRound, loopRound]);
		const { seen, deps } = spies();

		await runToolLoop(engine, [], { ...deps, maxRounds: 3 });
		expect(seen.roundEnds).toBe(3);
		expect(engine.calls.length).toBe(3);
	});

	test('un signal déjà avorté n\'appelle pas le moteur', async () => {
		const engine = fakeEngine([[textChunk('jamais', 'stop')]]);
		const { seen, deps } = spies();
		const controller = new AbortController();
		controller.abort();

		await runToolLoop(engine, [], { ...deps, signal: controller.signal });
		expect(engine.calls.length).toBe(0);
		expect(seen.deltas).toEqual([]);
	});

	test('un abort pendant le flux arrête la diffusion', async () => {
		const controller = new AbortController();
		const engine = fakeEngine([
			[textChunk('premier'), textChunk('second'), textChunk('troisième', 'stop')]
		]);
		const { seen, deps } = spies({
			onDelta: (t) => {
				seen.deltas.push(t);
				if (t === 'premier') controller.abort();
			}
		});

		await runToolLoop(engine, [], { ...deps, signal: controller.signal });
		expect(seen.deltas).toEqual(['premier']);
	});

	test('passe les outils et tool_choice au moteur, seulement s\'il y en a', async () => {
		const engine = fakeEngine([[textChunk('ok', 'stop')], [textChunk('ok', 'stop')]]);
		const { deps } = spies();

		await runToolLoop(engine, [], { ...deps, tools: [{ name: 'a' }] });
		expect(engine.calls[0].tools).toEqual([{ name: 'a' }]);
		expect(engine.calls[0].tool_choice).toBe('auto');

		await runToolLoop(engine, [], { ...deps, tools: [] });
		expect(engine.calls[1].tools).toBeUndefined();
		expect(engine.calls[1].tool_choice).toBeUndefined();
	});

	test('transmet les paramètres de génération et active le streaming', async () => {
		const engine = fakeEngine([[textChunk('ok', 'stop')]]);
		const { deps } = spies();

		await runToolLoop(engine, [{ role: 'user', content: 'x' }], deps);
		expect(engine.calls[0].temperature).toBe(0.5);
		expect(engine.calls[0].max_tokens).toBe(100);
		expect(engine.calls[0].stream).toBe(true);
		expect(engine.calls[0].messages).toEqual([{ role: 'user', content: 'x' }]);
	});

	test('une réponse tronquée avec appel partiel ne relance pas', async () => {
		// finish_reason 'length' : le modèle a été coupé par max_tokens.
		const engine = fakeEngine([
			[toolChunk([{ index: 0, id: 'c', function: { name: 't', arguments: '{' } }], 'length')],
			[textChunk('jamais', 'stop')]
		]);
		const { seen, deps } = spies();

		await runToolLoop(engine, [], deps);
		expect(seen.tools).toEqual([]);
		expect(engine.calls.length).toBe(1);
	});

	test('remonte les compteurs de tokens du dernier chunk', async () => {
		const engine = fakeEngine([[textChunk('bonjour', 'stop'), usageChunk(1234)]]);
		const { seen, deps } = spies();

		await runToolLoop(engine, [], deps);
		expect(seen.usages).toEqual([1234]);
		expect(seen.deltas).toEqual(['bonjour']);
	});

	test('un chunk sans choices ne casse pas la diffusion', async () => {
		// Le garde sur `choices` ne doit pas court-circuiter la lecture de l'usage.
		const engine = fakeEngine([[usageChunk(10), textChunk('suite', 'stop')]]);
		const { seen, deps } = spies();

		await runToolLoop(engine, [], deps);
		expect(seen.usages).toEqual([10]);
		expect(seen.deltas).toEqual(['suite']);
	});

	test('sur plusieurs tours, chaque usage est remonté dans l\'ordre', async () => {
		const engine = fakeEngine([
			[
				toolChunk([{ index: 0, id: 'c', function: { name: 't', arguments: '{}' } }], 'tool_calls'),
				usageChunk(100)
			],
			[textChunk('fini', 'stop'), usageChunk(250)]
		]);
		const { seen, deps } = spies();

		await runToolLoop(engine, [], deps);
		expect(seen.usages).toEqual([100, 250]);
	});

	test('onUsage absent ne fait pas échouer la boucle', async () => {
		const engine = fakeEngine([[textChunk('ok', 'stop'), usageChunk(5)]]);
		const { deps } = spies();
		delete deps.onUsage;

		await runToolLoop(engine, [], deps);
		expect(engine.calls.length).toBe(1);
	});

	test('exécute plusieurs outils d\'un même tour dans l\'ordre', async () => {
		const engine = fakeEngine([
			[
				toolChunk(
					[
						{ index: 0, id: 'a', function: { name: 'un', arguments: '{}' } },
						{ index: 1, id: 'b', function: { name: 'deux', arguments: '{}' } }
					],
					'tool_calls'
				)
			],
			[textChunk('fini', 'stop')]
		]);
		const { seen, deps } = spies();
		const messages = [];

		await runToolLoop(engine, messages, deps);
		expect(seen.tools.map((t) => t.name)).toEqual(['un', 'deux']);
		expect(seen.results.map((r) => r.i)).toEqual([0, 1]);
		expect(messages.filter((m) => m.role === 'tool').map((m) => m.tool_call_id)).toEqual(['a', 'b']);
	});
});
