import { describe, expect, it } from 'bun:test';
import { classifyModel, FIT_ORDER, sortByFit } from './modelFit.js';

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
