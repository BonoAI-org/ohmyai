/**
 * Surveillance du device WebGPU pendant et après le chargement d'un modèle.
 * Watching the WebGPU device during and after model loading.
 *
 * Ni WebLLM ni Transformers.js (ONNX Runtime Web) ne font échouer le
 * chargement quand le GPU signale une erreur : elles arrivent par l'événement
 * `uncapturederror` du device, que les deux bibliothèques se contentent de
 * journaliser. Observé avec Gemma 4 E2B : « Allocation size too large » sur
 * une allocation de 1,09 Gio, puis une cascade de tampons invalides, et le
 * store annonçait malgré tout « engine initialized successfully ». L'échec
 * n'apparaissait qu'à la première réponse, sous la forme de son dernier
 * maillon (`GatherBlockQuantized`).
 * Neither WebLLM nor Transformers.js (ONNX Runtime Web) fail the load when the
 * GPU reports an error: errors arrive through the device's `uncapturederror`
 * event, which both libraries merely log. Observed with Gemma 4 E2B:
 * "Allocation size too large" on a 1.09 GiB allocation, then a cascade of
 * invalid buffers, and the store still announced "engine initialized
 * successfully". The failure only surfaced on the first reply, as its last
 * link (`GatherBlockQuantized`).
 *
 * Les deux bibliothèques créent leur device elles-mêmes, sans l'exposer avant
 * qu'il ait servi. On intercepte donc `GPUAdapter.prototype.requestDevice`
 * pendant le chargement seulement : chaque device est écouté dès sa création,
 * avant tout travail. La première erreur reçue est la cause ; les suivantes
 * n'en sont que les conséquences.
 * Both libraries create their device themselves, without exposing it before it
 * has been used. We therefore intercept `GPUAdapter.prototype.requestDevice`
 * during loading only: each device is listened to from its creation, before
 * any work. The first error received is the cause; the next ones are only its
 * consequences.
 */

/**
 * Le device est inutilisable : erreur pendant le chargement, ou perte.
 * The device is unusable: error during loading, or loss.
 */
export class GpuDeviceError extends Error {
	/**
	 * @param {'device-error' | 'device-lost'} kind
	 * @param {string} message - Message du GPU, sans retouche / GPU message, untouched.
	 * @param {{ gpuErrorType?: string, cause?: unknown }} [details]
	 */
	constructor(kind, message, { gpuErrorType = 'unknown', cause } = {}) {
		super(message, { cause });
		this.name = 'GpuDeviceError';
		this.kind = kind;
		this.gpuErrorType = gpuErrorType;
	}
}

/**
 * Nature d'une erreur WebGPU, lue sur le nom de sa classe pour rester testable
 * hors navigateur.
 * Kind of a WebGPU error, read from its class name to stay testable outside a
 * browser.
 *
 * @param {unknown} error
 * @returns {'out-of-memory' | 'validation' | 'internal' | 'unknown'}
 */
export function gpuErrorType(error) {
	switch (/** @type {any} */ (error)?.constructor?.name) {
		case 'GPUOutOfMemoryError':
			return 'out-of-memory';
		case 'GPUValidationError':
			return 'validation';
		case 'GPUInternalError':
			return 'internal';
		default:
			return 'unknown';
	}
}

/** Délai maximal d'attente de la file GPU / Maximum wait for the GPU queue. */
const SETTLE_TIMEOUT_MS = 2000;

/**
 * Commence à surveiller les devices créés à partir de maintenant.
 * Starts watching the devices created from now on.
 *
 * @param {any} [adapterProto] - `GPUAdapter.prototype` par défaut ; injectable pour les tests.
 */
export function watchGpuDevices(adapterProto = globalThis.GPUAdapter?.prototype) {
	/** @type {any[]} */
	const devices = [];
	/** @type {GpuDeviceError[]} */
	const errors = [];
	/** @type {GpuDeviceError | null} */
	let lost = null;
	/** @type {Set<(error: GpuDeviceError) => void>} */
	const lostListeners = new Set();
	/** @type {Array<() => void>} */
	const cleanups = [];
	let disposed = false;

	/** @param {any} device */
	const track = (device) => {
		if (!device || disposed) return;
		devices.push(device);

		/** @param {any} event */
		const onError = (event) => {
			const gpuError = event?.error;
			errors.push(
				new GpuDeviceError('device-error', gpuError?.message || 'Unknown GPU error', {
					gpuErrorType: gpuErrorType(gpuError),
					cause: gpuError
				})
			);
		};
		device.addEventListener?.('uncapturederror', onError);
		cleanups.push(() => device.removeEventListener?.('uncapturederror', onError));

		device.lost?.then((/** @type {any} */ info) => {
			// `destroyed` : libération volontaire (changement de modèle, sonde).
			// `destroyed`: deliberate release (model change, probe).
			if (disposed || info?.reason === 'destroyed') return;
			lost ??= new GpuDeviceError('device-lost', info?.message || 'GPU device lost', {
				cause: info
			});
			for (const listener of lostListeners) listener(lost);
		});
	};

	const original = adapterProto?.requestDevice;
	let capturing = typeof original === 'function';
	if (capturing) {
		adapterProto.requestDevice = async function (/** @type {any[]} */ ...args) {
			const device = await original.apply(this, args);
			track(device);
			return device;
		};
	}

	return {
		devices,

		/** Cesse d'intercepter les nouveaux devices / Stops intercepting new devices. */
		stopCapturing() {
			if (!capturing) return;
			capturing = false;
			adapterProto.requestDevice = original;
		},

		/**
		 * Attend que le GPU ait fini le travail soumis, pour que ses erreurs
		 * aient le temps d'arriver.
		 * Waits for the GPU to finish submitted work, so its errors have time
		 * to arrive.
		 */
		async settle() {
			const timeout = new Promise((resolve) => setTimeout(resolve, SETTLE_TIMEOUT_MS));
			await Promise.race([
				Promise.all(devices.map((d) => d.queue?.onSubmittedWorkDone?.()?.catch?.(() => {}))),
				timeout
			]);
			// Les événements d'erreur sont distribués en tâches séparées.
			// Error events are dispatched as separate tasks.
			await new Promise((resolve) => setTimeout(resolve, 0));
		},

		/**
		 * La raison pour laquelle le device est inutilisable, ou `null`. La perte
		 * l'emporte ; sinon, la première erreur, qui est la cause.
		 * Why the device is unusable, or `null`. Loss wins; otherwise the first
		 * error, which is the cause.
		 * @returns {GpuDeviceError | null}
		 */
		failure() {
			return lost ?? errors[0] ?? null;
		},

		/**
		 * Prévient d'une perte du device, y compris déjà survenue.
		 * Notifies of a device loss, including one that already happened.
		 * @param {(error: GpuDeviceError) => void} listener
		 */
		onLost(listener) {
			if (lost) listener(lost);
			else lostListeners.add(listener);
		},

		/** Retire toute écoute / Removes every listener. */
		dispose() {
			this.stopCapturing();
			disposed = true;
			lostListeners.clear();
			for (const cleanup of cleanups) cleanup();
		}
	};
}

/**
 * Exécute un chargement de moteur en surveillant le GPU. Si le device signale
 * une erreur ou se perd, le chargement échoue avec une `GpuDeviceError` qui
 * porte la cause, même si la bibliothèque, elle, s'est déclarée prête ; le
 * moteur obtenu est alors libéré par `release`.
 * Runs an engine load while watching the GPU. If the device reports an error
 * or is lost, the load fails with a `GpuDeviceError` carrying the cause, even
 * if the library itself declared readiness; the engine obtained is then freed
 * through `release`.
 *
 * @template T
 * @param {() => Promise<T>} load
 * @param {{ release?: (result: T) => unknown, adapterProto?: any }} [options]
 * @returns {Promise<{ result: T, watch: ReturnType<typeof watchGpuDevices> }>}
 */
export async function loadWatchingGpu(load, { release, adapterProto } = {}) {
	const watch =
		adapterProto === undefined ? watchGpuDevices() : watchGpuDevices(adapterProto);

	/** @type {T} */
	let result;
	try {
		result = await load();
	} catch (err) {
		// L'erreur de la bibliothèque est souvent la dernière conséquence :
		// on lui préfère la cause signalée par le GPU.
		// The library's error is often the last consequence: prefer the cause
		// reported by the GPU.
		watch.stopCapturing();
		await watch.settle();
		const failure = watch.failure();
		watch.dispose();
		throw failure ?? err;
	} finally {
		watch.stopCapturing();
	}

	await watch.settle();
	const failure = watch.failure();
	if (failure) {
		watch.dispose();
		try {
			await release?.(result);
		} catch (_) {
			// Libération au mieux : l'échec à signaler reste celui du GPU.
			// Best-effort release: the failure to report remains the GPU's.
		}
		throw failure;
	}
	return { result, watch };
}
