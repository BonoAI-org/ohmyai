#!/usr/bin/env node
/**
 * Validation CPU avec onnxruntime-node. Sert à vérifier l'export lui-même,
 * indépendamment de WebGPU. Usage : bun run validate ../out/<nom>
 * CPU validation with onnxruntime-node. Verifies the export itself,
 * independently of WebGPU. Usage: bun run validate ../out/<name>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ort from 'onnxruntime-node';
import { validate } from '../validate-core.mjs';

const dir = resolve(process.argv[2] ?? '');
if (!process.argv[2]) {
	console.error('Usage: bun run validate ../out/<nom>  (node --no-js-float16array validate_node.mjs ../out/<nom>)');
	process.exit(2);
}
const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
const reference = JSON.parse(readFileSync(join(dir, 'reference.json'), 'utf8'));

console.log(`[node] ${meta.model} (${meta.dtype}, ${meta.exporter}) · onnxruntime ${ort.env.versions?.node ?? ''}`);
const t0 = performance.now();
const session = await ort.InferenceSession.create(join(dir, meta.files.model), {
	executionProviders: ['cpu'],
	graphOptimizationLevel: 'all',
});
console.log(`[node] session créée en ${Math.round(performance.now() - t0)} ms`);

const result = await validate(ort, session, meta, reference, console.log, { f16Ctor: Uint16Array });
result.runtime = { engine: 'onnxruntime-node', provider: 'cpu', version: ort.env.versions?.node ?? null };
writeFileSync(join(dir, 'result-node.json'), JSON.stringify(result, null, 2));
console.log(`[node] résultat écrit dans ${join(dir, 'result-node.json')}`);
process.exit(result.verdict === 'OK' ? 0 : 1);
