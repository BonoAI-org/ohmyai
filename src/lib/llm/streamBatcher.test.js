import { test, expect, describe } from 'bun:test';
import { createStreamBatcher } from './streamBatcher.js';

// Planificateur synchrone : la poussée arrive dès le premier fragment.
// Synchronous scheduler: the push lands as soon as the first fragment does.
const now = (fn) => fn();

describe('createStreamBatcher', () => {
	test('regroupe les fragments en une seule poussée par trame', () => {
		const flushed = [];
		let queued = null;
		const batcher = createStreamBatcher((c) => flushed.push(c), (fn) => (queued = fn));

		batcher.push('a');
		batcher.push('b');
		batcher.push('c');
		expect(flushed).toEqual([]); // rien avant la trame / nothing before the frame

		queued();
		expect(flushed).toEqual(['abc']);
	});

	test('replanifie après une poussée', () => {
		const flushed = [];
		let queued = null;
		const batcher = createStreamBatcher((c) => flushed.push(c), (fn) => (queued = fn));

		batcher.push('un');
		queued();
		batcher.push('deux');
		queued();
		expect(flushed).toEqual(['un', 'deux']);
	});

	test('ignore les fragments vides', () => {
		const flushed = [];
		const batcher = createStreamBatcher((c) => flushed.push(c), now);
		batcher.push('');
		batcher.push(undefined);
		batcher.push(null);
		expect(flushed).toEqual([]);
	});

	test('flush pousse le reste immédiatement', () => {
		const flushed = [];
		const batcher = createStreamBatcher((c) => flushed.push(c), () => {});
		batcher.push('reste');
		expect(flushed).toEqual([]);
		batcher.flush();
		expect(flushed).toEqual(['reste']);
	});

	test('flush sans rien en attente ne pousse pas', () => {
		const flushed = [];
		const batcher = createStreamBatcher((c) => flushed.push(c), () => {});
		batcher.flush();
		batcher.flush();
		expect(flushed).toEqual([]);
	});

	test('discard jette ce qui est en attente', () => {
		const flushed = [];
		let queued = null;
		const batcher = createStreamBatcher((c) => flushed.push(c), (fn) => (queued = fn));

		batcher.push('partiel');
		batcher.discard();
		queued();
		batcher.flush();
		expect(flushed).toEqual([]);
	});

	test('après discard, un nouveau fragment est bien poussé', () => {
		const flushed = [];
		let queued = null;
		const batcher = createStreamBatcher((c) => flushed.push(c), (fn) => (queued = fn));

		// Le fragment est jeté avant que la trame ne l'ait poussé, comme lorsque
		// le modèle termine sur un appel d'outil.
		// The fragment is dropped before the frame pushed it, as when the model
		// ends on a tool call.
		batcher.push('jeté');
		batcher.discard();
		batcher.push('gardé');
		queued();
		expect(flushed).toEqual(['gardé']);
	});
});
