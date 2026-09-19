import { test, expect, describe } from 'bun:test';
import {
	MIN_RAM_GB,
	parseGigabytes,
	requiredVramGB,
	hasMinimumRam,
	estimateHardwareSupport
} from './hardware.js';

/** Faux navigateur : RAM déclarée et limite de buffer GPU en Go. */
const nav = ({ ram, gpuBufferGB, gpuFails = false, noAdapter = false } = {}) => ({
	deviceMemory: ram,
	gpu: gpuFails
		? {
				requestAdapter: async () => {
					throw new Error('WebGPU indisponible');
				}
			}
		: noAdapter
			? { requestAdapter: async () => null }
			: gpuBufferGB === undefined
				? undefined
				: { requestAdapter: async () => ({ limits: { maxBufferSize: gpuBufferGB * 1024 ** 3 } }) }
});

describe('parseGigabytes', () => {
	test('lit une valeur en Go', () => {
		expect(parseGigabytes('4.2 GB')).toBe(4.2);
		expect(parseGigabytes('12GB')).toBe(12);
		expect(parseGigabytes('3 gb')).toBe(3);
	});

	test('renvoie null pour une valeur absente ou non reconnue', () => {
		expect(parseGigabytes(undefined)).toBeNull();
		expect(parseGigabytes(null)).toBeNull();
		expect(parseGigabytes('800 MB')).toBeNull();
	});
});

describe('requiredVramGB', () => {
	test('préfère la VRAM déclarée', () => {
		expect(requiredVramGB({ vram: '6 GB', size: '3 GB' })).toBe(6);
	});

	test('à défaut, majore le poids des fichiers de 25 %', () => {
		expect(requiredVramGB({ size: '4 GB' })).toBe(5);
	});

	test('renvoie zéro sans information', () => {
		expect(requiredVramGB({})).toBe(0);
		expect(requiredVramGB(null)).toBe(0);
	});
});

describe('hasMinimumRam', () => {
	test('accepte quand le navigateur ne dit rien', () => {
		expect(hasMinimumRam(MIN_RAM_GB, undefined)).toBe(true);
		expect(hasMinimumRam(MIN_RAM_GB, {})).toBe(true);
	});

	test('refuse sous le seuil, accepte au seuil', () => {
		expect(hasMinimumRam(4, { deviceMemory: 2 })).toBe(false);
		expect(hasMinimumRam(4, { deviceMemory: 4 })).toBe(true);
		expect(hasMinimumRam(4, { deviceMemory: 8 })).toBe(true);
	});
});

describe('estimateHardwareSupport', () => {
	test('valide une machine confortable', async () => {
		const out = await estimateHardwareSupport({ vram: '4 GB' }, nav({ ram: 16, gpuBufferGB: 2 }));
		expect(out.supported).toBe(true);
		expect(out.requiredGB).toBe(4);
		expect(out.deviceMemoryGB).toBe(16);
		expect(out.gpuMaxBufferGB).toBe(2);
	});

	test('refuse quand la RAM déclarée est sous le besoin', async () => {
		const out = await estimateHardwareSupport({ vram: '6 GB' }, nav({ ram: 4, gpuBufferGB: 4 }));
		expect(out.supported).toBe(false);
	});

	test('ne conclut rien d\'un deviceMemory au plafond de Chrome', async () => {
		// 8 signifie « 8 Go ou plus » : un modèle de 10 Go ne doit pas être
		// refusé sur ce seul indice.
		const out = await estimateHardwareSupport({ vram: '10 GB' }, nav({ ram: 8, gpuBufferGB: 4 }));
		expect(out.supported).toBe(true);
	});

	test('refuse un adaptateur dont le buffer maximal est trop petit', async () => {
		// Besoin 8 Go, le buffer doit couvrir au moins 2 Go.
		const out = await estimateHardwareSupport({ vram: '8 GB' }, nav({ ram: 32, gpuBufferGB: 1 }));
		expect(out.supported).toBe(false);
		expect(out.gpuMaxBufferGB).toBe(1);
	});

	test('accepte un buffer juste au quart du besoin', async () => {
		const out = await estimateHardwareSupport({ vram: '8 GB' }, nav({ ram: 32, gpuBufferGB: 2 }));
		expect(out.supported).toBe(true);
	});

	test('refuse quand aucun adaptateur WebGPU n\'est fourni', async () => {
		const out = await estimateHardwareSupport({ vram: '2 GB' }, nav({ ram: 32, noAdapter: true }));
		expect(out.supported).toBe(false);
	});

	test('reste permissif si la requête d\'adaptateur échoue', async () => {
		// Une requête qui échoue n'est pas concluante : on laisse le chargement
		// tenter et échouer avec un message clair.
		const out = await estimateHardwareSupport({ vram: '2 GB' }, nav({ ram: 32, gpuFails: true }));
		expect(out.supported).toBe(true);
		expect(out.gpuMaxBufferGB).toBeNull();
	});

	test('refuse sans WebGPU du tout', async () => {
		// Distinct du cas précédent : l'absence de WebGPU est concluante, aucun
		// modèle ne peut tourner.
		const out = await estimateHardwareSupport({ vram: '2 GB' }, { deviceMemory: 32 });
		expect(out.supported).toBe(false);
	});

	test('arrondit les valeurs rapportées au dixième', async () => {
		const out = await estimateHardwareSupport({ size: '3.33 GB' }, nav({ ram: 16, gpuBufferGB: 1.234 }));
		expect(out.requiredGB).toBe(4.2);
		expect(out.gpuMaxBufferGB).toBe(1.2);
	});

	test('un modèle sans information n\'est pas refusé sur la VRAM', async () => {
		const out = await estimateHardwareSupport({}, nav({ ram: 2, gpuBufferGB: 0.001 }));
		expect(out.requiredGB).toBe(0);
		expect(out.supported).toBe(true);
	});
});
