import { describe, expect, it } from 'bun:test';
import { isGpuAllocationFailure, modelWeightGB, suggestLighterModel } from './gpuFailure.js';

const GIB = 1024 ** 3;

describe('isGpuAllocationFailure', () => {
	it('reconnaît une erreur de mémoire du GPU, quel que soit son libellé', () => {
		expect(isGpuAllocationFailure({ gpuErrorType: 'out-of-memory', message: '…' })).toBe(true);
	});

	it('reconnaît le message de Dawn', () => {
		const dawn = new Error(
			'Allocation size too large\n - While calling [Device].CreateBuffer([BufferDescriptor]).'
		);
		expect(isGpuAllocationFailure(dawn)).toBe(true);
	});

	it('ignore les autres échecs', () => {
		expect(isGpuAllocationFailure(new Error('Could not locate file'))).toBe(false);
		expect(isGpuAllocationFailure({ gpuErrorType: 'validation', message: 'Invalid BindGroup' })).toBe(
			false
		);
		expect(isGpuAllocationFailure(undefined)).toBe(false);
	});
});

describe('modelWeightGB', () => {
	it('lit les poids en GB comme en MB', () => {
		expect(modelWeightGB({ size: '~3.2 GB' })).toBe(3.2);
		expect(modelWeightGB({ size: '~512 MB' })).toBe(0.5);
		expect(modelWeightGB({ size: 'inconnu' })).toBeNull();
		expect(modelWeightGB(undefined)).toBeNull();
	});
});

describe('suggestLighterModel', () => {
	const gemmaE2B = { id: 'e2b', size: '~3.2 GB' };
	const gemmaQat = { id: 'qat', size: '~2.6 GB' };
	const qwenF16 = { id: 'qwen-q4f16', size: '~1.1 GB', dtype: 'q4f16' };
	const llama = { id: 'llama-q4', size: '~800 MB' };
	const enorme = { id: 'xl', size: '~8.2 GB' };
	const catalogue = [enorme, gemmaE2B, gemmaQat, qwenF16, llama];

	it('propose le plus lourd des modèles plus légers', () => {
		expect(suggestLighterModel(gemmaE2B, catalogue)?.id).toBe('qat');
	});

	it('ne propose jamais plus lourd, ni le même', () => {
		expect(suggestLighterModel(llama, catalogue)).toBeNull();
	});

	it('tient compte du plafond de la sonde quand il est plus strict que l\'échec', () => {
		// 0,5 Gio : le plus gros tampon de qat (≈0,87 Gio) ne passe plus.
		const device = { largestAllocatableBytes: 0.5 * GIB };
		expect(suggestLighterModel(gemmaE2B, catalogue, device)?.id).toBe('qwen-q4f16');
	});

	it('écarte la demi-précision quand le GPU ne l\'a pas', () => {
		const device = { largestAllocatableBytes: 0.5 * GIB, shaderF16: false };
		expect(suggestLighterModel(gemmaE2B, catalogue, device)?.id).toBe('llama-q4');
	});

	it('ne propose rien sans poids connu pour le modèle en échec', () => {
		expect(suggestLighterModel({ id: 'perso' }, catalogue)).toBeNull();
	});
});
