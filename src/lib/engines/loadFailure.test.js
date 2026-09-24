import { test, expect, describe } from 'bun:test';
import {
	ModelLoadError,
	isModelLoadFailure,
	toModelLoadError,
	failOnUnhandledLoadError
} from './loadFailure.js';

/** Simule le rejet non géré que produit Transformers.js. */
function rejectUnhandled(target, reason) {
	const event = new Event('unhandledrejection', { cancelable: true });
	// @ts-ignore - propriété de PromiseRejectionEvent
	event.reason = reason;
	target.dispatchEvent(event);
	return event;
}

/** Promesse qui ne se règle jamais, comme from_pretrained après l'échec d'une tranche. */
const forever = () => new Promise(() => {});

describe('isModelLoadFailure', () => {
	test('reconnaît un échec d\'allocation', () => {
		expect(isModelLoadFailure(new RangeError('Array buffer allocation failed'))).toBe(true);
	});

	test('reconnaît un fichier de modèle introuvable', () => {
		const notFound = new Error('Could not locate file: "https://huggingface.co/x/resolve/main/onnx/a.onnx".');
		expect(isModelLoadFailure(notFound)).toBe(true);
		const named = new Error('…');
		named.name = 'ModelFileNotFoundError';
		expect(isModelLoadFailure(named)).toBe(true);
	});

	test('ignore les rejets sans rapport', () => {
		expect(isModelLoadFailure(new TypeError('Failed to fetch'))).toBe(false);
		expect(isModelLoadFailure(new Error('quota'))).toBe(false);
		expect(isModelLoadFailure(undefined)).toBe(false);
		expect(isModelLoadFailure('RangeError')).toBe(false);
	});
});

describe('toModelLoadError', () => {
	test('classe un échec d\'allocation en mémoire du navigateur', () => {
		const cause = new RangeError('Array buffer allocation failed');
		const err = toModelLoadError(cause);
		expect(err).toBeInstanceOf(ModelLoadError);
		expect(err.kind).toBe('browser-memory');
		expect(err.cause).toBe(cause);
	});

	test('classe les autres en erreur de fichier', () => {
		expect(toModelLoadError(new Error('Could not locate file: "x"')).kind).toBe('file');
	});
});

describe('failOnUnhandledLoadError', () => {
	test('rend le résultat d\'un chargement qui aboutit', async () => {
		const target = new EventTarget();
		expect(await failOnUnhandledLoadError(async () => 42, target)).toBe(42);
	});

	test('fait échouer un chargement bloqué dès qu\'une allocation échoue', async () => {
		const target = new EventTarget();
		const pending = failOnUnhandledLoadError(forever, target);
		const event = rejectUnhandled(target, new RangeError('Array buffer allocation failed'));
		const err = await pending.catch((e) => e);
		expect(err).toBeInstanceOf(ModelLoadError);
		expect(err.kind).toBe('browser-memory');
		expect(event.defaultPrevented).toBe(true);
	});

	test('ne s\'arrête pas sur un rejet sans rapport', async () => {
		const target = new EventTarget();
		let resolveLoad;
		const pending = failOnUnhandledLoadError(() => new Promise((r) => (resolveLoad = r)), target);
		const event = rejectUnhandled(target, new TypeError('Failed to fetch'));
		expect(event.defaultPrevented).toBe(false);
		resolveLoad('ok');
		expect(await pending).toBe('ok');
	});

	test('propage l\'erreur d\'un chargement qui rejette normalement', async () => {
		const target = new EventTarget();
		const boom = new Error('boom');
		expect(await failOnUnhandledLoadError(() => Promise.reject(boom), target).catch((e) => e)).toBe(boom);
	});

	test('retire son écoute une fois le chargement terminé', async () => {
		const target = new EventTarget();
		await failOnUnhandledLoadError(async () => 'fini', target);
		const event = rejectUnhandled(target, new RangeError('Array buffer allocation failed'));
		expect(event.defaultPrevented).toBe(false);
	});

	test('sans cible d\'événements, se contente d\'exécuter le chargement', async () => {
		// null et non undefined : undefined déclencherait la valeur par défaut, globalThis.
		expect(await failOnUnhandledLoadError(async () => 'ok', null)).toBe('ok');
	});
});
