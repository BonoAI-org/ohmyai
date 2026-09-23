#!/usr/bin/env python3
"""
Exporte le décodeur texte d'un modèle causal Hugging Face en ONNX, avec cache
clé/valeur en entrée et en sortie, dans la disposition que Transformers.js et
onnxruntime attendent : input_ids, attention_mask, position_ids et un couple
past_key_values.{i}.{key,value} par couche.
Exports the text decoder of a Hugging Face causal model to ONNX, with the
key/value cache as inputs and outputs, in the layout Transformers.js and
onnxruntime expect: input_ids, attention_mask, position_ids and one
past_key_values.{i}.{key,value} pair per layer.

But du spike : savoir si Gemma 4 12B (google/gemma-4-12B-it, model_type
gemma4_unified) s'exporte avec les outils standard, et si le graphe obtenu
reste numériquement stable sur WebGPU. Le script est générique : on le valide
d'abord sur un petit modèle, puis on le lance sur le 12B.
Spike goal: find out whether Gemma 4 12B (google/gemma-4-12B-it, model_type
gemma4_unified) exports with standard tooling, and whether the resulting graph
stays numerically stable on WebGPU. The script is generic: validate it on a
small model first, then run it on the 12B.

Sortie / Output : out/<nom>/model.onnx (+ model.onnx.data) et out/<nom>/meta.json.
"""

import argparse
import json
import sys
from pathlib import Path

import torch
import transformers
from transformers import AutoConfig, AutoTokenizer, DynamicCache

DTYPES = {"fp32": torch.float32, "fp16": torch.float16, "bf16": torch.bfloat16}
ONNX_DTYPE_NAMES = {torch.float32: "float32", torch.float16: "float16", torch.bfloat16: "bfloat16"}

# Classes tentées dans l'ordre. Les modèles texte seuls répondent à la
# première ; les modèles unifiés (image/audio/texte) à l'une des suivantes.
# Classes tried in order. Text-only models answer the first; unified
# (image/audio/text) models answer one of the following.
MODEL_CLASSES = [
	"AutoModelForCausalLM",
	"AutoModelForImageTextToText",
	"AutoModelForMultimodalLM",
	"AutoModel",
]


def load_model(model_id, dtype, attn):
	last_error = None
	for name in MODEL_CLASSES:
		cls = getattr(transformers, name, None)
		if cls is None:
			continue
		try:
			model = cls.from_pretrained(model_id, dtype=dtype, attn_implementation=attn, low_cpu_mem_usage=True)
			print(f"[export] chargé avec / loaded with {name}")
			return model.eval(), name
		except Exception as e:  # noqa: BLE001 - on veut tenter la classe suivante
			last_error = e
			print(f"[export] {name} refusé / refused: {type(e).__name__}: {str(e)[:200]}")
	raise SystemExit(f"Aucune classe ne charge {model_id} / No class loads {model_id}: {last_error}")


def cache_layers(cache):
	"""Retourne [(keys, values)] quelle que soit la version de DynamicCache.
	Returns [(keys, values)] whatever the DynamicCache version."""
	if hasattr(cache, "layers"):
		return [(layer.keys, layer.values) for layer in cache.layers]
	return list(zip(cache.key_cache, cache.value_cache))


class DecoderWrapper(torch.nn.Module):
	"""Aplatit le cache en tenseurs nommés, comme le font optimum et onnx-community.
	Flattens the cache into named tensors, as optimum and onnx-community do."""

	def __init__(self, model, num_layers):
		super().__init__()
		self.model = model
		self.num_layers = num_layers

	def forward(self, input_ids, attention_mask, position_ids, past_key_values):
		cache = DynamicCache()
		for i in range(self.num_layers):
			cache.update(past_key_values[2 * i], past_key_values[2 * i + 1], i)
		out = self.model(
			input_ids=input_ids,
			attention_mask=attention_mask,
			position_ids=position_ids,
			past_key_values=cache,
			use_cache=True,
			return_dict=True,
		)
		present = []
		for keys, values in cache_layers(out.past_key_values):
			present.extend([keys, values])
		return (out.logits, *present)


def probe_cache_shapes(model, tokenizer):
	"""Un passage avant sur trois jetons pour lire la forme du cache de chaque
	couche : nombre de têtes KV et dimension de tête peuvent varier par couche
	(Gemma 4 : 256 en fenêtre glissante, 512 en attention globale).
	One forward pass on three tokens to read each layer's cache shape: KV head
	count and head dimension can vary per layer (Gemma 4: 256 on sliding
	layers, 512 on global ones)."""
	ids = tokenizer("Bonjour le monde", return_tensors="pt").input_ids[:, :3]
	with torch.no_grad():
		out = model(input_ids=ids, attention_mask=torch.ones_like(ids), past_key_values=DynamicCache(), use_cache=True)
	shapes = []
	for keys, values in cache_layers(out.past_key_values):
		shapes.append({
			"kv_heads": int(keys.shape[1]),
			"head_dim": int(keys.shape[3]),
			"value_head_dim": int(values.shape[3]),
		})
	return shapes, int(out.logits.shape[-1])


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("--model", default="google/gemma-4-12B-it")
	ap.add_argument("--name", default=None, help="Nom du dossier de sortie / Output folder name")
	ap.add_argument("--dtype", choices=DTYPES, default="fp16")
	ap.add_argument("--attn", default="eager", help="eager (recommandé pour l'export) ou sdpa")
	ap.add_argument("--opset", type=int, default=18)
	ap.add_argument("--legacy", action="store_true", help="Exportateur TorchScript au lieu de dynamo")
	ap.add_argument("--out", default="out")
	args = ap.parse_args()

	torch.manual_seed(0)
	dtype = DTYPES[args.dtype]
	name = args.name or args.model.split("/")[-1]
	out_dir = Path(args.out) / name
	out_dir.mkdir(parents=True, exist_ok=True)

	config = AutoConfig.from_pretrained(args.model)
	print(f"[export] model_type={config.model_type} transformers={transformers.__version__} torch={torch.__version__}")
	tokenizer = AutoTokenizer.from_pretrained(args.model)
	model, loader = load_model(args.model, dtype, args.attn)

	layer_shapes, vocab_size = probe_cache_shapes(model, tokenizer)
	num_layers = len(layer_shapes)
	print(f"[export] {num_layers} couches / layers, vocab {vocab_size}, head_dim par couche / per layer: "
		  f"{sorted({s['head_dim'] for s in layer_shapes})}")

	wrapper = DecoderWrapper(model, num_layers).eval()

	# Exemple avec un passé non vide : les dimensions dynamiques s'exportent
	# mieux quand l'exemple ne vaut ni 0 ni 1.
	# Sample with a non-empty past: dynamic dims export better when the sample
	# is neither 0 nor 1.
	batch, seq, past = 1, 3, 5
	input_ids = torch.randint(10, min(vocab_size, 1000), (batch, seq), dtype=torch.int64)
	attention_mask = torch.ones((batch, past + seq), dtype=torch.int64)
	position_ids = torch.arange(past, past + seq, dtype=torch.int64).unsqueeze(0)
	past_tensors = []
	for s in layer_shapes:
		past_tensors.append(torch.zeros((batch, s["kv_heads"], past, s["head_dim"]), dtype=dtype))
		past_tensors.append(torch.zeros((batch, s["kv_heads"], past, s["value_head_dim"]), dtype=dtype))
	past_tensors = tuple(past_tensors)

	input_names = ["input_ids", "attention_mask", "position_ids"]
	output_names = ["logits"]
	for i in range(num_layers):
		input_names += [f"past_key_values.{i}.key", f"past_key_values.{i}.value"]
		output_names += [f"present.{i}.key", f"present.{i}.value"]

	onnx_path = out_dir / "model.onnx"
	# Anciens artefacts : un export précédent laisserait des .data orphelins.
	# Old artifacts: a previous export would leave orphan .data files behind.
	for old in out_dir.glob("model.onnx*"):
		old.unlink()

	with torch.no_grad():
		if args.legacy:
			dynamic_axes = {
				"input_ids": {0: "batch", 1: "sequence"},
				"attention_mask": {0: "batch", 1: "total_sequence"},
				"position_ids": {0: "batch", 1: "sequence"},
				"logits": {0: "batch", 1: "sequence"},
			}
			for i in range(num_layers):
				dynamic_axes[f"past_key_values.{i}.key"] = {0: "batch", 2: "past_sequence"}
				dynamic_axes[f"past_key_values.{i}.value"] = {0: "batch", 2: "past_sequence"}
				dynamic_axes[f"present.{i}.key"] = {0: "batch", 2: "total_sequence"}
				dynamic_axes[f"present.{i}.value"] = {0: "batch", 2: "total_sequence"}
			torch.onnx.export(
				wrapper, (input_ids, attention_mask, position_ids, past_tensors), str(onnx_path),
				input_names=input_names, output_names=output_names, dynamic_axes=dynamic_axes,
				opset_version=args.opset, dynamo=False, do_constant_folding=True,
			)
		else:
			# Dim.AUTO laisse torch.export déduire les relations entre dimensions
			# (longueur du masque = passé + séquence) : l'addition explicite de deux
			# Dim n'est pas prise en charge.
			# Dim.AUTO lets torch.export infer the relations between dimensions
			# (mask length = past + sequence): adding two Dims explicitly is not
			# supported.
			AUTO = torch.export.Dim.AUTO
			dynamic_shapes = {
				"input_ids": {1: AUTO},
				"attention_mask": {1: AUTO},
				"position_ids": {1: AUTO},
				"past_key_values": tuple({2: AUTO} for _ in past_tensors),
			}
			program = torch.onnx.export(
				wrapper, (input_ids, attention_mask, position_ids, past_tensors),
				input_names=input_names, output_names=output_names, dynamic_shapes=dynamic_shapes,
				opset_version=args.opset, dynamo=True, external_data=True, optimize=True,
			)
			program.save(str(onnx_path), external_data=True)

	data_files = sorted(p.name for p in out_dir.glob("model.onnx*") if p.name != "model.onnx")
	meta = {
		"model": args.model,
		"loader": loader,
		"model_type": config.model_type,
		"dtype": ONNX_DTYPE_NAMES[dtype],
		"exporter": "torchscript" if args.legacy else "dynamo",
		"opset": args.opset,
		"attn_implementation": args.attn,
		"transformers": transformers.__version__,
		"torch": torch.__version__,
		"vocab_size": vocab_size,
		"num_layers": num_layers,
		"layers": layer_shapes,
		"input_names": input_names,
		"output_names": output_names,
		"files": {"model": "model.onnx", "external_data": data_files},
	}
	(out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
	total = sum(p.stat().st_size for p in out_dir.glob("model.onnx*"))
	print(f"[export] écrit / written {onnx_path} ({total / 1e9:.2f} Go) + meta.json")


if __name__ == "__main__":
	sys.exit(main())
