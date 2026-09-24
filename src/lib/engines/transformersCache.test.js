import { test, expect, describe, beforeEach, afterAll } from 'bun:test';
import {
	COMPLETE_MODELS_KEY,
	TRANSFORMERS_CACHE_NAME,
	markTransformersModelComplete,
	isTransformersModelCached,
	clearTransformersCache
} from './transformersCache.js';

const MODEL = 'onnx-community/gemma-4-e2b-it-ONNX';
const url = (file) => `https://huggingface.co/${MODEL}/resolve/main/${file}`;

// Faux localStorage et fausse Cache API, réinitialisés à chaque test.
const saved = { localStorage: globalThis.localStorage, caches: globalThis.caches };
let store;
let cached;

beforeEach(() => {
	store = new Map();
	globalThis.localStorage = {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: (k) => store.delete(k)
	};
	cached = [];
	globalThis.caches = {
		open: async (name) => {
			expect(name).toBe(TRANSFORMERS_CACHE_NAME);
			return { keys: async () => cached.map((u) => ({ url: u })) };
		},
		delete: async () => {
			cached = [];
			return true;
		}
	};
});

afterAll(() => {
	globalThis.localStorage = saved.localStorage;
	globalThis.caches = saved.caches;
});

describe('isTransformersModelCached', () => {
	test('un chargement interrompu ne compte pas comme un téléchargement', async () => {
		// Transformers.js met ces fichiers en cache avant les poids.
		cached = [url('config.json'), url('tokenizer.json')];
		expect(await isTransformersModelCached(MODEL)).toBe(false);
	});

	test('un modèle chargé en entier et toujours en cache est téléchargé', async () => {
		cached = [url('config.json'), url('onnx/decoder_model_merged_q4.onnx_data')];
		markTransformersModelComplete(MODEL);
		expect(await isTransformersModelCached(MODEL)).toBe(true);
	});

	test('le marqueur seul ne suffit pas si le cache a été vidé par le navigateur', async () => {
		markTransformersModelComplete(MODEL);
		expect(await isTransformersModelCached(MODEL)).toBe(false);
	});

	test('le marqueur ne vaut que pour son modèle', async () => {
		cached = [url('config.json'), 'https://huggingface.co/autre/modele/resolve/main/config.json'];
		markTransformersModelComplete('autre/modele');
		expect(await isTransformersModelCached(MODEL)).toBe(false);
	});
});

describe('markTransformersModelComplete', () => {
	test('n\'inscrit pas deux fois le même modèle', () => {
		markTransformersModelComplete(MODEL);
		markTransformersModelComplete(MODEL);
		expect(JSON.parse(store.get(COMPLETE_MODELS_KEY))).toEqual([MODEL]);
	});

	test('tolère une valeur corrompue', async () => {
		store.set(COMPLETE_MODELS_KEY, '{pas du json');
		markTransformersModelComplete(MODEL);
		expect(JSON.parse(store.get(COMPLETE_MODELS_KEY))).toEqual([MODEL]);
	});
});

describe('clearTransformersCache', () => {
	test('efface aussi les marqueurs', async () => {
		cached = [url('config.json')];
		markTransformersModelComplete(MODEL);
		await clearTransformersCache();
		expect(store.has(COMPLETE_MODELS_KEY)).toBe(false);
		expect(await isTransformersModelCached(MODEL)).toBe(false);
	});
});
