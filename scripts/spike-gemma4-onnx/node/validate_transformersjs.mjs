#!/usr/bin/env node
/**
 * Charge un dépôt produit par export_transformersjs.py avec la vraie
 * bibliothèque Transformers.js (celle de l'application, sous Node et
 * onnxruntime-node), puis compare sa génération gloutonne à la référence
 * PyTorch. C'est le contrat de l'application qui est vérifié : lecture du
 * config.json, choix des sessions, cache initial, boucle de génération.
 * Loads a repository produced by export_transformersjs.py with the real
 * Transformers.js library (the app's, under Node and onnxruntime-node), then
 * compares its greedy generation with the PyTorch reference. What gets checked
 * is the app's contract: config.json parsing, session choice, initial cache,
 * generation loop.
 *
 * Usage : node validate_transformersjs.mjs <dossier du dépôt> <reference.json> [decoder_dtype]
 *   decoder_dtype : q4f16 (défaut, ce que charge l'application) ou fp16
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { AutoModelForCausalLM, env } from '@huggingface/transformers';

const [repoArg, refArg, decoderDtype = 'q4f16'] = process.argv.slice(2);
if (!repoArg || !refArg) {
	console.error('Usage: node validate_transformersjs.mjs <dépôt> <reference.json> [q4f16|fp16]');
	process.exit(2);
}
const repo = resolve(repoArg);
const reference = JSON.parse(readFileSync(resolve(refArg), 'utf8'));

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = dirname(repo) + '/';
const modelId = basename(repo);

const t0 = performance.now();
// Même classe que celle qu'instancie pipeline('text-generation') dans l'application.
// Same class pipeline('text-generation') instantiates in the app.
const model = await AutoModelForCausalLM.from_pretrained(modelId, {
	device: 'cpu',
	dtype: { embed_tokens: 'fp16', decoder_model_merged: decoderDtype }
});
const loadMs = Math.round(performance.now() - t0);
console.log(`[tjs] ${model.constructor.name} chargé en ${loadMs} ms · sessions : ${Object.keys(model.sessions).join(', ')}`);

const { Tensor, AutoTokenizer } = await import('@huggingface/transformers');
const ids = reference.prompt_ids;

// Le gabarit de conversation, tel que l'application l'applique, doit produire
// exactement les jetons du prompt de référence.
// The chat template, as the app applies it, must produce exactly the
// reference prompt's tokens.
let templateMatches = null;
if (reference.chat_template) {
	const tokenizer = await AutoTokenizer.from_pretrained(modelId);
	const templated = tokenizer.apply_chat_template([{ role: 'user', content: reference.prompt }], {
		add_generation_prompt: true,
		tokenize: true,
		return_tensor: false
	});
	// tokenize: true renvoie { input_ids, attention_mask } ; on accepte aussi un tableau.
	// tokenize: true returns { input_ids, attention_mask }; an array is accepted too.
	const tokens = Array.isArray(templated) ? templated : templated?.input_ids;
	templateMatches = Array.isArray(tokens) && tokens.length === ids.length && tokens.every((t, i) => Number(t) === ids[i]);
	console.log(`[tjs] gabarit de conversation : ${templateMatches ? 'jetons identiques à la référence' : 'DIFFÉRENT de la référence'}`);
	if (!templateMatches) process.exitCode = 1;
}
const input_ids = new Tensor('int64', BigInt64Array.from(ids, BigInt), [1, ids.length]);
const attention_mask = new Tensor('int64', new BigInt64Array(ids.length).fill(1n), [1, ids.length]);

const t1 = performance.now();
const out = await model.generate({
	input_ids,
	attention_mask,
	max_new_tokens: reference.greedy_ids.length,
	do_sample: false
});
const genMs = Math.round(performance.now() - t1);
const generated = Array.from(out.data.slice(ids.length), Number);

let matched = 0;
while (matched < generated.length && generated[matched] === reference.greedy_ids[matched]) matched++;
const result = {
	model: modelId,
	decoder_dtype: decoderDtype,
	class: model.constructor.name,
	sessions: Object.keys(model.sessions),
	prompt_tokens: ids.length,
	chat_template_matches: templateMatches,
	generated,
	reference_ids: reference.greedy_ids,
	matched_prefix: matched,
	reference_length: reference.greedy_ids.length,
	load_ms: loadMs,
	generate_ms: genMs,
	ms_per_token: Math.round(genMs / Math.max(generated.length, 1))
};
console.log(`[tjs] ${generated.length} jetons en ${genMs} ms · préfixe identique à la référence : ${matched}/${reference.greedy_ids.length}`);
writeFileSync(join(repo, `result-transformersjs-${decoderDtype}.json`), JSON.stringify(result, null, 2));
await model.dispose();
process.exit(matched > 0 && templateMatches !== false ? 0 : 1);
