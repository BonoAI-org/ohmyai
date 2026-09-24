#!/usr/bin/env python3
"""
Produit un dépôt Gemma 4 texte seul au format attendu par Transformers.js, à
partir des poids de Google.
Builds a text-only Gemma 4 repository in the layout Transformers.js expects,
from Google's weights.

Disposition produite / Produced layout (celle du port 26B et d'E2B/E4B en texte seul) :

  config.json                         model_type "gemma4", Gemma4ForConditionalGeneration,
                                      transformers.js_config (dtype, tranches, cache fp16)
  generation_config.json, tokenizer.json, tokenizer_config.json, chat_template.jinja
  onnx/embed_tokens_fp16.onnx         input_ids -> inputs_embeds (échelle √hidden incluse)
  onnx/decoder_model_merged_fp16.onnx inputs_embeds, attention_mask, position_ids,
                                      past_key_values.{i}.{key,value}
                                      -> logits (dernière position seulement), present.{i}.*
  onnx/decoder_model_merged_q4f16.onnx  le même, MatMul quantifiés en 4 bits par blocs

Pourquoi ce contrat / Why this contract : Transformers.js 4.3 charge un modèle
dont `architectures[0]` vaut Gemma4ForConditionalGeneration via
Gemma4ForCausalLM en mode texte seul, avec deux sessions : embed_tokens puis
decoder_model_merged. Le cache vide initial est construit d'après les formes
déclarées dans le graphe, donc des couches de formes différentes (têtes de 256
en fenêtre glissante, de 512 en attention globale) sont prises en charge. Seuls
les logits de la dernière position sont lus par la génération : le décodeur ne
calcule qu'eux (logits_to_keep=1), ce qui évite un tenseur de 512 Ko par jeton
de prompt.
Transformers.js 4.3 loads a model whose `architectures[0]` is
Gemma4ForConditionalGeneration through Gemma4ForCausalLM in text-only mode,
with two sessions: embed_tokens then decoder_model_merged. The initial empty
cache is built from the shapes declared in the graph, so layers of different
shapes (256-wide heads on sliding layers, 512 on global ones) are supported.
Generation only reads the last position's logits: the decoder computes only
those (logits_to_keep=1), avoiding a 512 KB tensor per prompt token.

Le 12B déclare model_type "gemma4_unified", inconnu de Transformers.js. Le
config.json produit le présente comme "gemma4" : côté JavaScript, ce type ne
sert qu'à choisir les sessions et les noms du cache, tout le calcul étant dans
les graphes.
The 12B declares model_type "gemma4_unified", unknown to Transformers.js. The
produced config.json presents it as "gemma4": on the JavaScript side, that type
only selects the sessions and the cache names, all the computation being in
the graphs.
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import torch
from huggingface_hub import snapshot_download
from transformers import AutoTokenizer, DynamicCache

from export_decoder import DTYPES, cache_layers, load_model, probe_cache_shapes
from shard_external_data import shard

TOKENIZER_FILES = ["tokenizer.json", "tokenizer_config.json", "chat_template.jinja", "generation_config.json"]


class EmbedWrapper(torch.nn.Module):
	def __init__(self, embedding):
		super().__init__()
		self.embedding = embedding

	def forward(self, input_ids):
		return self.embedding(input_ids)


class DecoderWrapper(torch.nn.Module):
	"""inputs_embeds + cache aplati -> logits de la dernière position + cache.
	inputs_embeds + flattened cache -> last-position logits + cache."""

	def __init__(self, model, num_layers):
		super().__init__()
		self.model = model
		self.num_layers = num_layers

	def forward(self, inputs_embeds, attention_mask, position_ids, past_key_values):
		cache = DynamicCache()
		for i in range(self.num_layers):
			cache.update(past_key_values[2 * i], past_key_values[2 * i + 1], i)
		out = self.model(
			inputs_embeds=inputs_embeds,
			attention_mask=attention_mask,
			position_ids=position_ids,
			past_key_values=cache,
			use_cache=True,
			logits_to_keep=1,
			return_dict=True,
		)
		present = []
		for keys, values in cache_layers(out.past_key_values):
			present.extend([keys, values])
		return (out.logits, *present)


def export(module, args, path, input_names, output_names, dynamic_shapes, opset):
	for old in path.parent.glob(path.name + "*"):
		old.unlink()
	with torch.no_grad():
		program = torch.onnx.export(
			module, args, input_names=input_names, output_names=output_names,
			dynamic_shapes=dynamic_shapes, opset_version=opset, dynamo=True,
			external_data=True, optimize=True,
		)
	program.save(str(path), external_data=True)
	# torch nomme les données externes <fichier>.data ; le découpage les
	# réécrit au nommage de Transformers.js.
	# torch names external data <file>.data; sharding rewrites them to the
	# Transformers.js naming.
	print(f"[tjs] écrit / written {path.name}")


def quantize_q4(src, dst, block_size=32, accuracy_level=4):
	import onnx
	try:
		from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer as Quantizer
	except ImportError:
		from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer as Quantizer
	for old in dst.parent.glob(dst.name + "*"):
		old.unlink()
	model = onnx.load(str(src), load_external_data=True)
	quant = Quantizer(model, block_size=block_size, is_symmetric=True, accuracy_level=accuracy_level)
	quant.process()
	quant.model.save_model_to_file(str(dst), use_external_data_format=True)
	print(f"[tjs] quantifié / quantized {dst.name}")


def build_config(source_config, num_chunks, model_id):
	"""config.json lisible par Transformers.js / config.json readable by Transformers.js."""
	cfg = json.loads(source_config.read_text(encoding="utf-8"))
	# Un modèle texte classique n'a pas de text_config : utile pour tester la
	# chaîne sur un petit modèle.
	# A plain text model has no text_config: handy to test the chain on a small model.
	text = dict(cfg.get("text_config", cfg))
	text["model_type"] = "gemma4_text"
	out = {
		"architectures": ["Gemma4ForConditionalGeneration"],
		"model_type": "gemma4",
		"text_config": text,
		"tie_word_embeddings": cfg.get("tie_word_embeddings", True),
		"transformers.js_config": {
			"dtype": {"embed_tokens": "fp16", "decoder_model_merged": "q4f16"},
			"use_external_data_format": num_chunks,
			"kv_cache_dtype": {"q4f16": "float16", "fp16": "float16"},
		},
		# Provenance, pour qu'un lecteur du dépôt sache d'où vient ce graphe.
		# Provenance, so a reader of the repository knows where this graph comes from.
		"_source": {"model": model_id, "model_type": cfg.get("model_type"), "architectures": cfg.get("architectures")},
	}
	for key in ("bos_token_id", "eos_token_id", "pad_token_id"):
		if key in cfg:
			out[key] = cfg[key]
		elif key in text:
			out[key] = text[key]
	return out


def embed_chat_template(repo):
	"""Inscrit chat_template.jinja dans tokenizer_config.json.
	Writes chat_template.jinja into tokenizer_config.json.

	AutoTokenizer de Transformers.js, qu'utilise pipeline('text-generation'),
	ne lit le gabarit que dans tokenizer_config.json ; seuls les processeurs
	multimodaux lisent chat_template.jinja. Sans cela, l'application échoue
	sur « tokenizer.chat_template is not set ».
	Transformers.js's AutoTokenizer, used by pipeline('text-generation'), only
	reads the template from tokenizer_config.json; only multimodal processors
	read chat_template.jinja. Without this, the app fails on
	"tokenizer.chat_template is not set"."""
	template = repo / "chat_template.jinja"
	config_path = repo / "tokenizer_config.json"
	if not template.exists() or not config_path.exists():
		return
	config = json.loads(config_path.read_text(encoding="utf-8"))
	if config.get("chat_template"):
		return
	config["chat_template"] = template.read_text(encoding="utf-8")
	config_path.write_text(json.dumps(config, indent=2, ensure_ascii=False), encoding="utf-8")
	print("[tjs] gabarit de conversation inscrit dans tokenizer_config.json")


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("--model", default="google/gemma-4-12B-it")
	ap.add_argument("--name", default="gemma-4-12B-it-ONNX")
	ap.add_argument("--opset", type=int, default=18)
	ap.add_argument("--max-shard-gb", type=float, default=1.9)
	ap.add_argument("--keep-fp16-decoder", action="store_true", help="Garde le décodeur fp16 (22 Go) pour la validation CPU")
	ap.add_argument("--out", default="out")
	args = ap.parse_args()

	torch.manual_seed(0)
	repo = Path(args.out) / args.name
	onnx_dir = repo / "onnx"
	onnx_dir.mkdir(parents=True, exist_ok=True)
	source = Path(snapshot_download(args.model, allow_patterns=["*.json", "*.jinja"]))

	tokenizer = AutoTokenizer.from_pretrained(args.model)
	model, loader = load_model(args.model, DTYPES["fp16"], "eager")
	layer_shapes, vocab_size = probe_cache_shapes(model, tokenizer)
	num_layers = len(layer_shapes)
	hidden = model.get_input_embeddings().weight.shape[1]
	print(f"[tjs] {loader}, {num_layers} couches, vocab {vocab_size}, hidden {hidden}")

	AUTO = torch.export.Dim.AUTO

	# 1. embed_tokens
	embed_path = onnx_dir / "embed_tokens_fp16.onnx"
	ids = torch.randint(10, 1000, (1, 5), dtype=torch.int64)
	export(EmbedWrapper(model.get_input_embeddings()).eval(), (ids,), embed_path,
		["input_ids"], ["inputs_embeds"], {"input_ids": {1: AUTO}}, args.opset)

	# 2. decoder_model_merged (fp16)
	batch, seq, past = 1, 3, 5
	embeds = torch.randn((batch, seq, hidden), dtype=torch.float16)
	attention_mask = torch.ones((batch, past + seq), dtype=torch.int64)
	position_ids = torch.arange(past, past + seq, dtype=torch.int64).unsqueeze(0)
	past_tensors = []
	for s in layer_shapes:
		past_tensors.append(torch.zeros((batch, s["kv_heads"], past, s["head_dim"]), dtype=torch.float16))
		past_tensors.append(torch.zeros((batch, s["kv_heads"], past, s["value_head_dim"]), dtype=torch.float16))
	input_names = ["inputs_embeds", "attention_mask", "position_ids"]
	output_names = ["logits"]
	for i in range(num_layers):
		input_names += [f"past_key_values.{i}.key", f"past_key_values.{i}.value"]
		output_names += [f"present.{i}.key", f"present.{i}.value"]
	decoder_fp16 = onnx_dir / "decoder_model_merged_fp16.onnx"
	export(DecoderWrapper(model, num_layers).eval(), (embeds, attention_mask, position_ids, tuple(past_tensors)),
		decoder_fp16, input_names, output_names,
		{"inputs_embeds": {1: AUTO}, "attention_mask": {1: AUTO}, "position_ids": {1: AUTO},
		 "past_key_values": tuple({2: AUTO} for _ in past_tensors)}, args.opset)
	del model

	# 3. q4f16 puis découpage / q4f16 then sharding
	decoder_q4 = onnx_dir / "decoder_model_merged_q4f16.onnx"
	quantize_q4(decoder_fp16, decoder_q4)
	chunks = {
		"embed_tokens_fp16.onnx": len(shard(onnx_dir, embed_path.name, args.max_shard_gb)),
		"decoder_model_merged_q4f16.onnx": len(shard(onnx_dir, decoder_q4.name, args.max_shard_gb)),
	}
	if args.keep_fp16_decoder:
		chunks["decoder_model_merged_fp16.onnx"] = len(shard(onnx_dir, decoder_fp16.name, args.max_shard_gb))
	else:
		for f in onnx_dir.glob(decoder_fp16.name + "*"):
			f.unlink()

	# 4. Fichiers de configuration / Configuration files
	(repo / "config.json").write_text(json.dumps(build_config(source / "config.json", chunks, args.model), indent=2), encoding="utf-8")
	for name in TOKENIZER_FILES:
		if (source / name).exists():
			shutil.copy(source / name, repo / name)
	embed_chat_template(repo)
	meta = {"layers": layer_shapes, "num_layers": num_layers, "vocab_size": vocab_size, "hidden_size": hidden,
		"external_data_chunks": chunks, "torch": torch.__version__}
	(repo / "export_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
	print(f"[tjs] dépôt prêt / repository ready: {repo} ({chunks})")


if __name__ == "__main__":
	sys.exit(main())
