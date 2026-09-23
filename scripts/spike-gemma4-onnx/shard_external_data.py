#!/usr/bin/env python3
"""
Découpe le fichier de données externes d'un export en tranches d'au plus
--max-gb, en réécrivant les références (fichier, décalage) de chaque tenseur
dans model.onnx. Même disposition que les dépôts onnx-community
(model.onnx_data, model.onnx_data_1, ...).
Splits an export's external data file into shards of at most --max-gb,
rewriting each tensor's (file, offset) reference in model.onnx. Same layout as
onnx-community repositories (model.onnx_data, model.onnx_data_1, ...).

Pourquoi / Why : un navigateur n'alloue pas un ArrayBuffer de 8 Go, et le cache
navigateur (Cache API) refuse les entrées de plus de 2 Go. Un tenseur seul plus
gros que la limite occupe sa propre tranche.
A browser will not allocate an 8 GB ArrayBuffer, and the browser cache (Cache
API) rejects entries above 2 GB. A single tensor larger than the limit gets its
own shard.
"""

import argparse
import json
import sys
from pathlib import Path

import onnx
from onnx.external_data_helper import ExternalDataInfo


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("name", help="Dossier sous out/ / Folder under out/")
	ap.add_argument("--max-gb", type=float, default=1.9)
	ap.add_argument("--out", default="out")
	args = ap.parse_args()

	folder = Path(args.out) / args.name
	model_path = folder / "model.onnx"
	limit = int(args.max_gb * 1024 ** 3)
	model = onnx.load(str(model_path), load_external_data=False)

	# Tenseurs externes, triés par fichier puis décalage pour lire séquentiellement.
	# External tensors, sorted by file then offset for sequential reads.
	entries = []
	for tensor in model.graph.initializer:
		if tensor.data_location != onnx.TensorProto.EXTERNAL:
			continue
		info = ExternalDataInfo(tensor)
		entries.append((info.location, int(info.offset or 0), int(info.length or 0), tensor))
	entries.sort(key=lambda e: (e[0], e[1]))
	sources = sorted({e[0] for e in entries})
	if any(s.startswith("model.onnx_data") for s in sources):
		raise SystemExit("Déjà découpé / Already sharded")

	handles = {s: open(folder / s, "rb") for s in sources}
	shard_idx, shard_size, shard = 0, 0, None
	shard_names = []

	def open_shard():
		nonlocal shard, shard_idx, shard_size
		if shard:
			shard.close()
			shard_idx += 1
		name = "model.onnx_data" if shard_idx == 0 else f"model.onnx_data_{shard_idx}"
		shard = open(folder / name, "wb")
		shard_names.append(name)
		shard_size = 0
		return name

	current = open_shard()
	for location, offset, length, tensor in entries:
		if shard_size > 0 and shard_size + length > limit:
			current = open_shard()
		src = handles[location]
		src.seek(offset)
		remaining = length
		while remaining:
			chunk = src.read(min(remaining, 256 * 1024 ** 2))
			shard.write(chunk)
			remaining -= len(chunk)
		del tensor.external_data[:]
		for key, value in (("location", current), ("offset", str(shard_size)), ("length", str(length))):
			entry = tensor.external_data.add()
			entry.key, entry.value = key, value
		shard_size += length
	shard.close()
	for h in handles.values():
		h.close()

	onnx.save_model(model, str(model_path))
	for s in sources:
		(folder / s).unlink()

	meta_path = folder / "meta.json"
	meta = json.loads(meta_path.read_text(encoding="utf-8"))
	meta["files"]["external_data"] = shard_names
	meta_path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
	sizes = [(folder / n).stat().st_size / 1e9 for n in shard_names]
	print(f"[shard] {len(shard_names)} tranches / shards : " + ", ".join(f"{s:.2f} Go" for s in sizes))


if __name__ == "__main__":
	sys.exit(main())
