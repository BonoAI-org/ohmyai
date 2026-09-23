/**
 * Retire du build Cloudflare les fichiers que Pages refuse : la plateforme
 * limite chaque fichier à 25 Mio, et le déploiement entier échoue au premier
 * dépassement.
 * Removes from the Cloudflare build the files Pages rejects: the platform caps
 * each file at 25 MiB, and the whole deployment fails on the first overrun.
 *
 * Seul cas connu : le runtime WebAssembly d'onnxruntime, embarqué par
 * Transformers.js et émis par Vite parce que le code le référence via
 * `import.meta.url`. Il n'est jamais téléchargé depuis notre origine :
 * Transformers.js fixe `env.backends.onnx.wasm.wasmPaths` sur le CDN jsdelivr
 * à l'initialisation, avec la version exacte d'onnxruntime-web. Le retirer ne
 * change donc rien à l'exécution.
 * Only known case: onnxruntime's WebAssembly runtime, bundled by
 * Transformers.js and emitted by Vite because the code references it through
 * `import.meta.url`. It is never fetched from our origin: Transformers.js sets
 * `env.backends.onnx.wasm.wasmPaths` to the jsdelivr CDN at initialization,
 * with the exact onnxruntime-web version. Removing it changes nothing at
 * runtime.
 *
 * Tout autre fichier trop gros fait échouer le script : un nouveau dépassement
 * doit être compris, pas supprimé en silence.
 * Any other oversized file fails the script: a new overrun must be understood,
 * not silently deleted.
 */

import { readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const OUTPUT_DIR = '.svelte-kit/cloudflare';
const PAGES_MAX_FILE_BYTES = 25 * 1024 * 1024;
const PRUNABLE = /^ort-wasm-.*\.wasm$/;

function walk(dir, out = []) {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) walk(path, out);
		else out.push({ path, name: entry.name, size: statSync(path).size });
	}
	return out;
}

const oversized = walk(OUTPUT_DIR).filter((f) => f.size > PAGES_MAX_FILE_BYTES);
const unexpected = oversized.filter((f) => !PRUNABLE.test(f.name));

if (unexpected.length > 0) {
	console.error('[prune] Fichiers de plus de 25 Mio non prévus / Unexpected files over 25 MiB:');
	for (const f of unexpected) console.error(`  ${(f.size / 1048576).toFixed(1)} MiB  ${f.path}`);
	console.error('[prune] Cloudflare Pages les refusera. Décider quoi en faire dans scripts/prune-oversized-assets.js.');
	process.exit(1);
}

for (const f of oversized) {
	unlinkSync(f.path);
	console.log(`[prune] retiré / removed ${(f.size / 1048576).toFixed(1)} MiB  ${f.path}`);
}
if (oversized.length === 0) console.log('[prune] aucun fichier de plus de 25 Mio / no file over 25 MiB');
