import { describe, expect, it } from 'bun:test';
import {
	classifyModel,
	estimateLargestBufferBytes,
	FIT_ORDER,
	requiresShaderF16,
	sortByFit
} from './modelFit.js';

const petit = { id: 'p', size: '2 GB', engine: 'transformers' };
const enorme = { id: 'g', size: '30 GB', engine: 'transformers' };

describe('classifyModel', () => {
	it('place un modèle déjà présent en tête, quel que soit le reste', () => {
		expect(classifyModel(enorme, { isInstalled: true })).toBe('installed');
	});

	it('déclare incompatible ce que le navigateur refusera de toute façon', () => {
		expect(classifyModel(enorme, { hasWebGPU: true, deviceMemoryGB: 64 })).toBe(
			'incompatible'
		);
	});

	it('déclare incompatible un modèle plus gros que la mémoire rapportée', () => {
		// 2 GB de poids demandent 2,5 GB avec la marge d'exécution.
		expect(classifyModel(petit, { hasWebGPU: true, deviceMemoryGB: 2 })).toBe(
			'incompatible'
		);
	});

	it('déclare lent ce qui tournerait sans WebGPU', () => {
		expect(classifyModel(petit, { hasWebGPU: false, deviceMemoryGB: 32 })).toBe(
			'slow'
		);
	});

	it('déclare adapté ce que la machine peut faire tourner', () => {
		expect(classifyModel(petit, { hasWebGPU: true, deviceMemoryGB: 32 })).toBe(
			'suitable'
		);
	});

	it("ne conclut pas à l'incompatibilité faute d'information", () => {
		expect(classifyModel(petit, { hasWebGPU: true, deviceMemoryGB: null })).toBe(
			'suitable'
		);
	});

	it('ne tranche pas avant de connaître le verdict WebGPU', () => {
		expect(classifyModel(petit, { hasWebGPU: null, deviceMemoryGB: 32 })).toBe(
			'suitable'
		);
	});
});

describe('sortByFit', () => {
	it("range les groupes dans l'ordre déclaré et garde l'ordre interne", () => {
		const fits = { a: 'slow', b: 'installed', c: 'incompatible', d: 'suitable', e: 'installed' };
		const liste = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
		expect(sortByFit(liste, (m) => fits[m.id]).map((m) => m.id)).toEqual([
			'b',
			'e',
			'd',
			'a',
			'c'
		]);
	});

	it('ne modifie pas le tableau reçu', () => {
		const liste = [{ id: 'a' }, { id: 'b' }];
		sortByFit(liste, () => 'suitable');
		expect(liste.map((m) => m.id)).toEqual(['a', 'b']);
	});

	it('expose quatre verdicts ordonnés', () => {
		expect(FIT_ORDER).toEqual(['installed', 'suitable', 'slow', 'incompatible']);
	});
});

describe('requiresShaderF16', () => {
	it('repère la demi-précision dans un dtype en chaîne', () => {
		expect(requiresShaderF16({ dtype: 'q4f16' })).toBe(true);
		expect(requiresShaderF16({ dtype: 'q4' })).toBe(false);
	});

	it('repère la demi-précision dans un dtype par sous-module', () => {
		expect(
			requiresShaderF16({ dtype: { decoder_model_merged: 'q2f16', embed_tokens: 'q4' } })
		).toBe(true);
		expect(requiresShaderF16({ dtype: { decoder_model_merged: 'q4' } })).toBe(false);
	});

	it("repère la demi-précision dans l'identifiant du modèle", () => {
		expect(requiresShaderF16({ id: 'Qwen3-0.6B-q4f16_1-MLC' })).toBe(true);
		expect(requiresShaderF16({ id: 'Qwen3-0.6B-q4f32_1-MLC' })).toBe(false);
	});

	it('tolère un modèle sans indication', () => {
		expect(requiresShaderF16(null)).toBe(false);
		expect(requiresShaderF16({})).toBe(false);
	});
});

describe('estimateLargestBufferBytes', () => {
	it("estime le plus gros tampon à partir du poids", () => {
		// 3,2 Go annoncés, un tiers, soit environ 1,07 Gio : proche des
		// 1,09 Gio réellement demandés par Gemma 4 E2B.
		const o = estimateLargestBufferBytes({ size: '~3.2 GB' });
		expect(Math.round(o / 1024 ** 3 * 100) / 100).toBeCloseTo(1.07, 1);
	});

	it('rend null pour un poids inconnu', () => {
		expect(estimateLargestBufferBytes({})).toBeNull();
		expect(estimateLargestBufferBytes({ size: 'inconnu' })).toBeNull();
	});
});

describe('classifyModel, capacités mesurées', () => {
	const f16 = { id: 'Qwen3-q4f16_1-MLC', size: '0.5 GB', engine: 'webllm' };
	const gros = { id: 'gemma', size: '3.2 GB', engine: 'transformers' };

	it('écarte un modèle en demi-précision quand shader-f16 manque', () => {
		expect(classifyModel(f16, { hasWebGPU: true, shaderF16: false })).toBe('incompatible');
	});

	it("garde le modèle quand la demi-précision est là", () => {
		expect(classifyModel(f16, { hasWebGPU: true, shaderF16: true })).toBe('suitable');
	});

	it("ne tranche pas quand la capacité n'est pas connue", () => {
		expect(classifyModel(f16, { hasWebGPU: true, shaderF16: null })).toBe('suitable');
	});

	it("écarte un modèle dont le plus gros tampon dépasse l'allocation mesurée", () => {
		// Un tiers de 3,2 Go fait environ 1,07 Gio : au-delà des 512 Mio mesurés.
		expect(
			classifyModel(gros, { hasWebGPU: true, largestAllocatableBytes: 512 * 1024 * 1024 })
		).toBe('incompatible');
	});

	it('garde le modèle quand la mesure le permet', () => {
		expect(
			classifyModel(gros, { hasWebGPU: true, largestAllocatableBytes: 2 * 1024 ** 3 })
		).toBe('suitable');
	});

	it("ne tranche pas faute de mesure d'allocation", () => {
		expect(classifyModel(gros, { hasWebGPU: true, largestAllocatableBytes: null })).toBe(
			'suitable'
		);
	});

	it("laisse un modèle déjà installé passer avant tout verdict", () => {
		expect(
			classifyModel(f16, { isInstalled: true, shaderF16: false, largestAllocatableBytes: 1 })
		).toBe('installed');
	});
});
