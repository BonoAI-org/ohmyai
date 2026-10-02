import { test, expect, describe } from 'bun:test';
import { GpuDeviceError, gpuErrorType, watchGpuDevices, loadWatchingGpu } from './gpuDeviceWatch.js';

class GPUOutOfMemoryError extends Error {}
class GPUValidationError extends Error {}

/** Faux device : événements, file d'attente et promesse `lost` pilotables. */
function fakeDevice() {
	const device = new EventTarget();
	/** @type {(info: any) => void} */
	let resolveLost = () => {};
	// @ts-ignore
	device.lost = new Promise((r) => (resolveLost = r));
	// @ts-ignore
	device.queue = { onSubmittedWorkDone: async () => {} };
	return {
		device,
		/** @param {Error} error */
		fail(error) {
			const event = new Event('uncapturederror');
			// @ts-ignore - propriété de GPUUncapturedErrorEvent
			event.error = error;
			device.dispatchEvent(event);
		},
		/** @param {string} reason @param {string} message */
		lose(reason, message) {
			resolveLost({ reason, message });
		}
	};
}

/** Faux prototype d'adaptateur, dont `requestDevice` rend le device donné. */
function fakeAdapterProto(device) {
	const original = async () => device;
	return { requestDevice: original, original };
}

/** Laisse les promesses en attente se régler. */
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('gpuErrorType', () => {
	test('reconnaît les classes d\'erreur WebGPU', () => {
		expect(gpuErrorType(new GPUOutOfMemoryError('x'))).toBe('out-of-memory');
		expect(gpuErrorType(new GPUValidationError('x'))).toBe('validation');
		expect(gpuErrorType(new Error('x'))).toBe('unknown');
		expect(gpuErrorType(undefined)).toBe('unknown');
	});
});

describe('watchGpuDevices', () => {
	test('intercepte les devices créés, puis rend le prototype intact', async () => {
		const { device } = fakeDevice();
		const proto = fakeAdapterProto(device);
		const watch = watchGpuDevices(proto);
		expect(proto.requestDevice).not.toBe(proto.original);
		expect(await proto.requestDevice()).toBe(device);
		expect(watch.devices).toEqual([device]);
		watch.stopCapturing();
		expect(proto.requestDevice).toBe(proto.original);
	});

	test('retient la première erreur, qui est la cause', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const watch = watchGpuDevices(proto);
		await proto.requestDevice();
		fake.fail(new GPUOutOfMemoryError('Allocation size too large'));
		fake.fail(new GPUValidationError('Invalid BindGroup (GatherBlockQuantized)'));
		const failure = watch.failure();
		expect(failure).toBeInstanceOf(GpuDeviceError);
		expect(failure?.kind).toBe('device-error');
		expect(failure?.gpuErrorType).toBe('out-of-memory');
		expect(failure?.message).toBe('Allocation size too large');
	});

	test('ignore une destruction volontaire du device', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const watch = watchGpuDevices(proto);
		await proto.requestDevice();
		fake.lose('destroyed', 'Device was destroyed.');
		await tick();
		expect(watch.failure()).toBeNull();
	});

	test('prévient d\'une perte, même déjà survenue', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const watch = watchGpuDevices(proto);
		await proto.requestDevice();
		fake.lose('unknown', 'GPU process crashed');
		await tick();
		/** @type {GpuDeviceError[]} */
		const seen = [];
		watch.onLost((e) => seen.push(e));
		expect(seen.length).toBe(1);
		expect(seen[0].kind).toBe('device-lost');
		expect(seen[0].message).toBe('GPU process crashed');
	});

	test('se tait une fois libéré', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const watch = watchGpuDevices(proto);
		await proto.requestDevice();
		let calls = 0;
		watch.onLost(() => calls++);
		watch.dispose();
		fake.fail(new GPUValidationError('après coup'));
		fake.lose('unknown', 'perdu');
		await tick();
		expect(calls).toBe(0);
		expect(watch.failure()).toBeNull();
	});

	test('sans WebGPU, ne surveille rien et ne casse rien', () => {
		const watch = watchGpuDevices(null);
		watch.stopCapturing();
		expect(watch.failure()).toBeNull();
	});
});

describe('loadWatchingGpu', () => {
	test('rend le moteur quand le GPU n\'a rien signalé', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const { result, watch } = await loadWatchingGpu(
			async () => {
				await proto.requestDevice();
				return 'moteur';
			},
			{ adapterProto: proto }
		);
		expect(result).toBe('moteur');
		expect(watch.devices.length).toBe(1);
		expect(proto.requestDevice).toBe(proto.original);
	});

	test('refuse un moteur déclaré prêt après une erreur du GPU, et le libère', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		/** @type {unknown[]} */
		const released = [];
		const err = await loadWatchingGpu(
			async () => {
				await proto.requestDevice();
				fake.fail(new GPUOutOfMemoryError('Allocation size too large'));
				return 'moteur cassé';
			},
			{ adapterProto: proto, release: (engine) => released.push(engine) }
		).catch((e) => e);
		expect(err).toBeInstanceOf(GpuDeviceError);
		expect(err.message).toBe('Allocation size too large');
		expect(released).toEqual(['moteur cassé']);
		expect(proto.requestDevice).toBe(proto.original);
	});

	test('préfère la cause du GPU à l\'erreur finale de la bibliothèque', async () => {
		const fake = fakeDevice();
		const proto = fakeAdapterProto(fake.device);
		const err = await loadWatchingGpu(
			async () => {
				await proto.requestDevice();
				fake.fail(new GPUOutOfMemoryError('Allocation size too large'));
				throw new Error('GatherBlockQuantized: CreateBindGroup failed');
			},
			{ adapterProto: proto }
		).catch((e) => e);
		expect(err).toBeInstanceOf(GpuDeviceError);
		expect(err.message).toBe('Allocation size too large');
	});

	test('propage l\'erreur de la bibliothèque quand le GPU n\'a rien dit', async () => {
		const boom = new Error('Could not locate file');
		const err = await loadWatchingGpu(() => Promise.reject(boom), { adapterProto: null }).catch((e) => e);
		expect(err).toBe(boom);
	});
});
