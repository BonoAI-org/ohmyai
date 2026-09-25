import { describe, expect, it } from 'bun:test';
import { PROBE_STEPS_BYTES, probeGpuCapabilities } from './gpuCapabilities.js';

const GIO = 1024 ** 3;

/**
 * Fabrique un navigateur simulé dont les allocations échouent au-delà d'un
 * seuil, comme le fait un pilote avare.
 */
function faireNavigateur({
	adapter = true,
	features = [],
	maxBufferSize = 2 * GIO,
	plafondAllocation = Infinity,
	lancerSurDevice = false,
	info = null
} = {}) {
	if (!adapter) return { gpu: { requestAdapter: async () => null } };

	const device = {
		_scopes: [],
		pushErrorScope(type) {
			this._scopes.push({ type, erreur: null });
		},
		async popErrorScope() {
			return this._scopes.pop()?.erreur ?? null;
		},
		createBuffer({ size }) {
			if (size > plafondAllocation) {
				const scope = this._scopes[this._scopes.length - 1];
				if (scope) scope.erreur = { message: 'Allocation size too large' };
				return { destroy() {} };
			}
			return { destroy() {} };
		},
		destroy() {}
	};

	return {
		gpu: {
			requestAdapter: async () => ({
				features: new Set(features),
				limits: { maxBufferSize },
				info,
				requestDevice: async () => {
					if (lancerSurDevice) throw new Error('device refusé');
					return device;
				}
			})
		}
	};
}

describe('probeGpuCapabilities', () => {
	it("rend des capacités vides sans WebGPU", async () => {
		expect(await probeGpuCapabilities(undefined)).toMatchObject({
			hasWebGPU: false,
			shaderF16: false,
			largestAllocatableBytes: null
		});
		expect(await probeGpuCapabilities({})).toMatchObject({ hasWebGPU: false });
	});

	it("rend des capacités vides quand aucun adaptateur ne répond", async () => {
		const c = await probeGpuCapabilities(faireNavigateur({ adapter: false }));
		expect(c.hasWebGPU).toBe(false);
	});

	it('détecte la demi-précision quand elle est annoncée', async () => {
		const avec = await probeGpuCapabilities(faireNavigateur({ features: ['shader-f16'] }));
		expect(avec.shaderF16).toBe(true);
		const sans = await probeGpuCapabilities(faireNavigateur({ features: [] }));
		expect(sans.shaderF16).toBe(false);
	});

	it("mesure la plus grande allocation réellement obtenue", async () => {
		// Le pilote refuse au-delà de 700 Mio : le dernier palier qui passe
		// est 512 Mio, alors que l'adaptateur annonce 2 Gio.
		const c = await probeGpuCapabilities(
			faireNavigateur({ plafondAllocation: 700 * 1024 * 1024 })
		);
		expect(c.maxBufferBytes).toBe(2 * GIO);
		expect(c.largestAllocatableBytes).toBe(512 * 1024 * 1024);
	});

	it("ne sonde pas au-delà de la limite annoncée", async () => {
		const c = await probeGpuCapabilities(
			faireNavigateur({ maxBufferSize: 600 * 1024 * 1024 })
		);
		expect(c.largestAllocatableBytes).toBe(512 * 1024 * 1024);
	});

	it('atteint le dernier palier quand tout passe', async () => {
		const c = await probeGpuCapabilities(faireNavigateur({ maxBufferSize: 8 * GIO }));
		expect(c.largestAllocatableBytes).toBe(PROBE_STEPS_BYTES.at(-1));
	});

	it("rend null quand même le plus petit palier échoue", async () => {
		const c = await probeGpuCapabilities(faireNavigateur({ plafondAllocation: 1 }));
		expect(c.largestAllocatableBytes).toBeNull();
		expect(c.hasWebGPU).toBe(true);
	});

	it("survit à un device refusé", async () => {
		const c = await probeGpuCapabilities(faireNavigateur({ lancerSurDevice: true }));
		expect(c.hasWebGPU).toBe(true);
		expect(c.largestAllocatableBytes).toBeNull();
	});

	it("rapporte le fabricant quand il est fourni", async () => {
		const c = await probeGpuCapabilities(
			faireNavigateur({ info: { vendor: 'google', description: 'SwiftShader' } })
		);
		expect(c.vendor).toBe('google');
		expect(c.description).toBe('SwiftShader');
	});
});
