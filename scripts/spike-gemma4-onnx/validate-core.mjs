/**
 * Cœur de validation partagé entre Node (onnxruntime-node, CPU) et le
 * navigateur (onnxruntime-web, WebGPU) : préremplissage puis décodage glouton
 * avec le cache clé/valeur, comparés à la référence PyTorch.
 * Validation core shared between Node (onnxruntime-node, CPU) and the browser
 * (onnxruntime-web, WebGPU): prefill then greedy decoding with the key/value
 * cache, compared against the PyTorch reference.
 *
 * Signaux recherchés / Signals we look for:
 * - NaN ou infinis dans les logits : instabilité numérique (le symptôme
 *   rapporté sur WebGPU pour les exports Gemma 4 aux opérateurs décomposés)
 *   NaN or infinities in the logits: numerical instability (the symptom
 *   reported on WebGPU for Gemma 4 exports with decomposed operators)
 * - argmax du préremplissage identique à PyTorch
 *   prefill argmax identical to PyTorch
 * - nombre de jetons gloutons identiques avant divergence
 *   number of identical greedy tokens before divergence
 */

// ---- fp16 <-> fp32 ---------------------------------------------------------

export function fp16ToFloat(h) {
	const s = (h & 0x8000) ? -1 : 1;
	const e = (h >> 10) & 0x1f;
	const f = h & 0x3ff;
	if (e === 0) return s * Math.pow(2, -14) * (f / 1024);
	if (e === 0x1f) return f ? NaN : s * Infinity;
	return s * Math.pow(2, e - 15) * (1 + f / 1024);
}

const F16 = globalThis.Float16Array;

export function tensorToFloat32(tensor) {
	if (tensor.type === 'float16') {
		// Runtimes récents : Float16Array natif, déjà des flottants. Anciens :
		// Uint16Array de bits à décoder.
		// Recent runtimes: native Float16Array, already floats. Older ones:
		// Uint16Array of bits to decode.
		if (F16 && tensor.data instanceof F16) return Float32Array.from(tensor.data);
		const out = new Float32Array(tensor.data.length);
		for (let i = 0; i < out.length; i++) out[i] = fp16ToFloat(tensor.data[i]);
		return out;
	}
	if (tensor.type === 'float32') return tensor.data;
	throw new Error(`Type de logits inattendu / Unexpected logits type: ${tensor.type}`);
}

// ---- Construction des entrées / Input construction ---------------------------

function emptyPast(ort, meta, f16Ctor) {
	const feeds = {};
	const ctor = meta.dtype === 'float16' ? f16Ctor : Float32Array;
	meta.layers.forEach((layer, i) => {
		feeds[`past_key_values.${i}.key`] = new ort.Tensor(meta.dtype, new ctor(0), [1, layer.kv_heads, 0, layer.head_dim]);
		feeds[`past_key_values.${i}.value`] = new ort.Tensor(meta.dtype, new ctor(0), [1, layer.kv_heads, 0, layer.value_head_dim]);
	});
	return feeds;
}

function int64(values) {
	return BigInt64Array.from(values, (v) => BigInt(v));
}

function buildFeeds(ort, meta, ids, pastLength, past) {
	const total = pastLength + ids.length;
	const feeds = {
		input_ids: new ort.Tensor('int64', int64(ids), [1, ids.length]),
		attention_mask: new ort.Tensor('int64', int64(new Array(total).fill(1)), [1, total]),
		position_ids: new ort.Tensor('int64', int64(ids.map((_, i) => pastLength + i)), [1, ids.length]),
	};
	return { ...feeds, ...past };
}

function presentToPast(meta, outputs) {
	const past = {};
	for (let i = 0; i < meta.num_layers; i++) {
		past[`past_key_values.${i}.key`] = outputs[`present.${i}.key`];
		past[`past_key_values.${i}.value`] = outputs[`present.${i}.value`];
	}
	return past;
}

function lastPositionLogits(meta, logitsTensor) {
	const all = tensorToFloat32(logitsTensor);
	const vocab = meta.vocab_size;
	const seq = logitsTensor.dims[1];
	return all.subarray((seq - 1) * vocab, seq * vocab);
}

function stats(logits) {
	let nan = 0, inf = 0, max = -Infinity, argmax = -1;
	for (let i = 0; i < logits.length; i++) {
		const v = logits[i];
		if (Number.isNaN(v)) { nan++; continue; }
		if (!Number.isFinite(v)) { inf++; continue; }
		if (v > max) { max = v; argmax = i; }
	}
	return { nan, inf, max, argmax };
}

// ---- Validation ---------------------------------------------------------------

/**
 * @param {any} ort - module onnxruntime (node ou web)
 * @param {any} session - InferenceSession déjà créée
 * @param {any} meta - contenu de meta.json
 * @param {any} reference - contenu de reference.json
 * @param {(msg: string) => void} log
 * @param {{ f16Ctor?: any }} [opts] - Conteneur des tenseurs fp16 vides : onnxruntime-web
 *   accepte Float16Array, onnxruntime-node 1.30 exige encore Uint16Array.
 *   Container for empty fp16 tensors: onnxruntime-web accepts Float16Array,
 *   onnxruntime-node 1.30 still requires Uint16Array.
 */
export async function validate(ort, session, meta, reference, log = console.log, { f16Ctor = F16 ?? Uint16Array } = {}) {
	const result = { prefill: null, decode: null, timings_ms: {} };

	// Préremplissage / Prefill
	let t0 = performance.now();
	let outputs = await session.run(buildFeeds(ort, meta, reference.prompt_ids, 0, emptyPast(ort, meta, f16Ctor)));
	result.timings_ms.prefill = Math.round(performance.now() - t0);
	let logits = lastPositionLogits(meta, outputs.logits);
	const st = stats(logits);

	let maxAbsDiff = 0, meanAbsDiff = 0;
	for (const [id, refValue] of reference.prefill_top) {
		const d = Math.abs(logits[id] - refValue);
		if (Number.isNaN(d)) { maxAbsDiff = NaN; break; }
		maxAbsDiff = Math.max(maxAbsDiff, d);
		meanAbsDiff += d / reference.prefill_top.length;
	}
	// Rang, dans l'ONNX, du jeton que PyTorch met en tête.
	// Rank, in the ONNX output, of the token PyTorch ranks first.
	const refBest = logits[reference.prefill_argmax];
	let rankOfRefArgmax = 0;
	for (let i = 0; i < logits.length; i++) if (logits[i] > refBest) rankOfRefArgmax++;

	result.prefill = {
		prompt_tokens: reference.prompt_ids.length,
		nan: st.nan, inf: st.inf, max_logit: st.max,
		onnx_argmax: st.argmax, reference_argmax: reference.prefill_argmax,
		argmax_match: st.argmax === reference.prefill_argmax,
		rank_of_reference_argmax: rankOfRefArgmax,
		top_k_max_abs_diff: maxAbsDiff, top_k_mean_abs_diff: meanAbsDiff,
	};
	log(`[prefill] ${reference.prompt_ids.length} jetons en ${result.timings_ms.prefill} ms · NaN=${st.nan} inf=${st.inf} · argmax ${st.argmax} vs réf ${reference.prefill_argmax} (${result.prefill.argmax_match ? 'OK' : 'DIFFÉRENT'}) · écart top-k max ${maxAbsDiff.toFixed(3)}`);

	// Décodage glouton / Greedy decoding
	const generated = [];
	let matched = 0, diverged = false;
	let pastLength = reference.prompt_ids.length;
	let next = st.argmax;
	let past = presentToPast(meta, outputs);
	const eos = new Set(reference.eos_token_ids || []);
	t0 = performance.now();
	for (let step = 0; step < reference.greedy_ids.length; step++) {
		generated.push(next);
		if (!diverged && next === reference.greedy_ids[step]) matched++;
		else diverged = true;
		if (eos.has(next)) break;
		outputs = await session.run(buildFeeds(ort, meta, [next], pastLength, past));
		pastLength += 1;
		past = presentToPast(meta, outputs);
		logits = lastPositionLogits(meta, outputs.logits);
		const s = stats(logits);
		if (s.nan || s.inf) {
			log(`[decode] étape ${step + 1} : NaN=${s.nan} inf=${s.inf}, arrêt`);
			result.decode_nan_at_step = step + 1;
			break;
		}
		next = s.argmax;
	}
	result.timings_ms.decode = Math.round(performance.now() - t0);
	result.timings_ms.per_token = generated.length > 1 ? Math.round(result.timings_ms.decode / (generated.length - 1)) : null;
	result.decode = {
		steps: generated.length,
		matched_prefix: matched,
		reference_length: reference.greedy_ids.length,
		onnx_ids: generated,
		reference_ids: reference.greedy_ids,
		reference_pieces: reference.greedy_pieces,
		reference_text: reference.greedy_text,
	};
	log(`[decode] ${generated.length} jetons en ${result.timings_ms.decode} ms (${result.timings_ms.per_token} ms/jeton) · préfixe identique à la référence : ${matched}/${reference.greedy_ids.length}`);

	const stable = st.nan === 0 && st.inf === 0 && !result.decode_nan_at_step;
	result.verdict = !stable ? 'INSTABLE' : (result.prefill.argmax_match && matched >= Math.min(8, reference.greedy_ids.length)) ? 'OK' : 'DIVERGENT';
	log(`[verdict] ${result.verdict}`);
	return result;
}
