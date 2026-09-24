import { test, expect, describe } from 'bun:test';
import {
	MIN_RAM_GB,
	parseGigabytes,
	requiredVramGB,
	hasMinimumRam,
	estimateHardwareSupport,
	exceedsBrowserLimit,
	TRANSFORMERS_MAX_MODEL_GB
} from './hardware.js';
import { AVAILABLE_MODELS } from './models.js';

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
	test('accepte un modèle qui tient dans la mémoire rapportée', async () => {
		const out = await estimateHardwareSupport({ vram: '8 GB' }, nav({ ram: 32, gpuBufferGB: 4 }));
		expect(out.supported).toBe(true);
		expect(out.reason).toBeNull();
		expect(out.requiredGB).toBe(8);
		expect(out.deviceMemoryGB).toBe(32);
		expect(out.gpuMaxBufferGB).toBe(4);
	});

	test('un gros modèle passe si la mémoire suffit, quel que soit le buffer', async () => {
		// C'est l'assouplissement : l'ancienne règle exigeait un buffer couvrant
		// le quart du modèle, soit 5 Go pour 20 Go, ce qu'aucun Mac ne fournit,
		// le plafond WebGPU y étant de 4 Gio.
		const out = await estimateHardwareSupport({ vram: '20 GB' }, nav({ ram: 32, gpuBufferGB: 4 }));
		expect(out.supported).toBe(true);
		expect(out.reason).toBeNull();
	});

	test('refuse quand le modèle dépasse la mémoire rapportée', async () => {
		const out = await estimateHardwareSupport({ vram: '20 GB' }, nav({ ram: 16, gpuBufferGB: 4 }));
		expect(out.supported).toBe(false);
		expect(out.reason).toBe('memory');
	});

	test('accepte un modèle égal à la mémoire rapportée', async () => {
		const out = await estimateHardwareSupport({ vram: '16 GB' }, nav({ ram: 16, gpuBufferGB: 4 }));
		expect(out.supported).toBe(true);
	});

	test('refuse un buffer GPU sous le plancher', async () => {
		const out = await estimateHardwareSupport({ vram: '5 GB' }, nav({ ram: 32, gpuBufferGB: 0.25 }));
		expect(out.supported).toBe(false);
		expect(out.reason).toBe('gpu-buffer');
	});

	test('accepte un buffer GPU juste au plancher', async () => {
		const out = await estimateHardwareSupport({ vram: '5 GB' }, nav({ ram: 32, gpuBufferGB: 1 }));
		expect(out.supported).toBe(true);
	});

	test('refuse sans adaptateur WebGPU', async () => {
		const out = await estimateHardwareSupport({ vram: '2 GB' }, nav({ ram: 32, noAdapter: true }));
		expect(out.supported).toBe(false);
		expect(out.reason).toBe('no-webgpu');
	});

	test('refuse sans WebGPU du tout', async () => {
		// Distinct d'une requête qui échoue : l'absence de WebGPU est concluante.
		const out = await estimateHardwareSupport({ vram: '2 GB' }, { deviceMemory: 32 });
		expect(out.supported).toBe(false);
		expect(out.reason).toBe('no-webgpu');
	});

	test('reste permissif si la requête d\'adaptateur échoue', async () => {
		// Une requête qui échoue n'est pas concluante : on laisse le chargement
		// tenter et échouer avec un message clair.
		const out = await estimateHardwareSupport({ vram: '2 GB' }, nav({ ram: 32, gpuFails: true }));
		expect(out.supported).toBe(true);
		expect(out.reason).toBeNull();
		expect(out.gpuMaxBufferGB).toBeNull();
	});

	test('le manque de mémoire est signalé même si le GPU est correct', async () => {
		const out = await estimateHardwareSupport({ vram: '64 GB' }, nav({ ram: 8, gpuBufferGB: 4 }));
		expect(out.reason).toBe('memory');
	});

	test('sans information de mémoire, ne refuse pas sur ce critère', async () => {
		const out = await estimateHardwareSupport({ vram: '20 GB' }, { gpu: nav({ gpuBufferGB: 4 }).gpu });
		expect(out.supported).toBe(true);
		expect(out.deviceMemoryGB).toBeNull();
	});

	test('arrondit les valeurs rapportées au dixième', async () => {
		const out = await estimateHardwareSupport({ size: '3.33 GB' }, nav({ ram: 16, gpuBufferGB: 1.234 }));
		expect(out.requiredGB).toBe(4.2);
		expect(out.gpuMaxBufferGB).toBe(1.2);
	});

	test('un modèle sans information de taille n\'est jamais refusé', async () => {
		const out = await estimateHardwareSupport({}, nav({ ram: 2, gpuBufferGB: 4 }));
		expect(out.requiredGB).toBe(0);
		expect(out.supported).toBe(true);
	});

	test('refuse un modèle Transformers.js au-delà de la limite du navigateur, même sur une grosse machine', async () => {
		// Le cas de Gemma 4 26B A4B : 17 Go de fichiers, machine à 64 Go.
		const gemma26b = { engine: 'transformers', size: '~17 GB', vram: '~20 GB' };
		const out = await estimateHardwareSupport(gemma26b, nav({ ram: 64, gpuBufferGB: 4 }));
		expect(out.supported).toBe(false);
		expect(out.reason).toBe('browser-limit');
	});

	test('la limite du navigateur prime sur le manque de mémoire', async () => {
		const big = { engine: 'transformers', size: '~17 GB', vram: '~20 GB' };
		const out = await estimateHardwareSupport(big, nav({ ram: 8, gpuBufferGB: 4 }));
		expect(out.reason).toBe('browser-limit');
	});
});

describe('exceedsBrowserLimit', () => {
	test('ne concerne que les modèles Transformers.js', () => {
		expect(exceedsBrowserLimit({ size: '~40 GB' })).toBe(false);
		expect(exceedsBrowserLimit({ engine: 'webllm', size: '~40 GB' })).toBe(false);
	});

	test('accepte jusqu\'à la limite, refuse au-delà', () => {
		expect(exceedsBrowserLimit({ engine: 'transformers', size: `${TRANSFORMERS_MAX_MODEL_GB} GB` })).toBe(false);
		expect(exceedsBrowserLimit({ engine: 'transformers', size: '~15.5 GB' })).toBe(true);
	});

	test('les modèles Transformers.js du catalogue restent sous la limite', () => {
		const transformers = AVAILABLE_MODELS.filter((m) => m.engine === 'transformers');
		expect(transformers.length).toBeGreaterThan(0);
		for (const m of transformers) expect(exceedsBrowserLimit(m)).toBe(false);
	});

	test('sans taille connue, ne refuse pas', () => {
		expect(exceedsBrowserLimit({ engine: 'transformers' })).toBe(false);
	});
});
