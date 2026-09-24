#!/usr/bin/env node
/**
 * Petit serveur statique pour la validation WebGPU : sert ce dossier (page,
 * cœur de validation, exports sous out/) et le build onnxruntime-web déjà
 * présent dans node_modules du projet sous /ort/.
 * Small static server for the WebGPU validation: serves this folder (page,
 * validation core, exports under out/) and the onnxruntime-web build already
 * present in the project's node_modules under /ort/.
 *
 * Usage : node serve.mjs [port]   (défaut 8765)
 *
 * Sert aussi out/<dépôt>/ sous /<org>/<dépôt>/resolve/main/, comme Hugging Face.
 * Also serves out/<repo>/ under /<org>/<repo>/resolve/main/, like Hugging Face.
 */
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ortDist = resolve(here, '../../node_modules/onnxruntime-web/dist');
const port = Number(process.argv[2] ?? 8765);

const types = {
	'.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript', '.js': 'text/javascript',
	'.json': 'application/json', '.jinja': 'text/plain; charset=utf-8', '.wasm': 'application/wasm', '.onnx': 'application/octet-stream',
};

createServer((req, res) => {
	const url = new URL(req.url, `http://localhost:${port}`);
	let path = decodeURIComponent(url.pathname);
	if (path === '/') path = '/validate_webgpu.html';
	// En-têtes cross-origin : l'application tourne sous COEP require-corp et
	// lit ces fichiers depuis une autre origine, comme elle lit Hugging Face.
	// Cross-origin headers: the app runs under COEP require-corp and reads
	// these files from another origin, as it reads Hugging Face.
	const cors = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Headers': '*',
		'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
		'Cross-Origin-Resource-Policy': 'cross-origin'
	};
	if (req.method === 'OPTIONS') { res.writeHead(204, cors); return res.end(); }
	let file;
	// Imitation de Hugging Face : /<org>/<dépôt>/resolve/<révision>/<fichier>
	// sert out/<dépôt>/<fichier>, pour tester un export dans l'application.
	// Hugging Face imitation: /<org>/<repo>/resolve/<revision>/<file> serves
	// out/<repo>/<file>, to test an export inside the app.
	const hf = /^\/[^/]+\/([^/]+)\/resolve\/[^/]+\/(.+)$/.exec(path);
	if (hf) file = join(here, 'out', normalize(hf[1]), normalize(hf[2]));
	else if (path.startsWith('/ort/')) file = join(ortDist, normalize(path.slice(5)));
	else file = join(here, normalize(path));
	if (!file.startsWith(here) && !file.startsWith(ortDist)) { res.writeHead(403, cors); return res.end(); }
	if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404, cors); return res.end(`404 ${path}`); }
	const size = statSync(file).size;
	const type = types[extname(file)] ?? 'application/octet-stream';
	if (req.method === 'HEAD') { res.writeHead(200, { ...cors, 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' }); return res.end(); }
	// Requêtes partielles : le navigateur lit les gros .data par tranches.
	// Range requests: the browser reads large .data files in slices.
	const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range ?? '');
	if (range) {
		const start = Number(range[1]);
		const end = range[2] ? Number(range[2]) : size - 1;
		res.writeHead(206, { ...cors, 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
		return createReadStream(file, { start, end }).pipe(res);
	}
	res.writeHead(200, { ...cors, 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes' });
	createReadStream(file).pipe(res);
}).listen(port, () => {
	console.log(`[serve] http://localhost:${port}/validate_webgpu.html?model=<nom>  (ort: ${ortDist})`);
});
