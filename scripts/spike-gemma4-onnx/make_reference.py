#!/usr/bin/env python3
"""
Produit la référence PyTorch à laquelle l'ONNX sera comparé : les jetons du
prompt, les meilleurs logits de la dernière position après préremplissage, et
la suite de jetons obtenue par décodage glouton.
Produces the PyTorch reference the ONNX will be compared against: the prompt
tokens, the top logits of the last position after prefill, and the token
sequence obtained by greedy decoding.

Sortie / Output : out/<nom>/reference.json
"""

import argparse
import json
import sys
from pathlib import Path

import torch
import transformers
from transformers import AutoTokenizer

from export_decoder import DTYPES, load_model


def pick_device(requested):
	if requested != "auto":
		return requested
	if torch.backends.mps.is_available():
		return "mps"
	if torch.cuda.is_available():
		return "cuda"
	return "cpu"


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("--model", default="google/gemma-4-12B-it")
	ap.add_argument("--name", default=None)
	ap.add_argument("--dtype", choices=DTYPES, default="bf16", help="Précision de la référence / Reference precision")
	ap.add_argument("--device", default="auto")
	ap.add_argument("--prompt", default="Explique en deux phrases pourquoi le ciel est bleu.")
	ap.add_argument("--new-tokens", type=int, default=32)
	ap.add_argument("--top-k", type=int, default=50)
	ap.add_argument("--out", default="out")
	args = ap.parse_args()

	name = args.name or args.model.split("/")[-1]
	out_dir = Path(args.out) / name
	out_dir.mkdir(parents=True, exist_ok=True)
	device = pick_device(args.device)
	dtype = DTYPES[args.dtype]

	tokenizer = AutoTokenizer.from_pretrained(args.model)
	model, loader = load_model(args.model, dtype, "eager")
	model.to(device)

	messages = [{"role": "user", "content": args.prompt}]
	try:
		input_ids = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=False)
		if isinstance(input_ids, dict) or hasattr(input_ids, "input_ids"):
			input_ids = input_ids["input_ids"]
		templated = True
	except Exception:  # noqa: BLE001 - modèle sans gabarit de conversation
		input_ids = tokenizer(args.prompt, return_tensors="pt").input_ids
		templated = False
	input_ids = input_ids.to(device)
	attention_mask = torch.ones_like(input_ids)

	with torch.no_grad():
		out = model(input_ids=input_ids, attention_mask=attention_mask, use_cache=False)
		last = out.logits[0, -1].float()
		top = torch.topk(last, args.top_k)
		generated = model.generate(
			input_ids=input_ids, attention_mask=attention_mask,
			max_new_tokens=args.new_tokens, do_sample=False, num_beams=1,
		)
	new_ids = generated[0, input_ids.shape[1]:].tolist()

	reference = {
		"model": args.model,
		"loader": loader,
		"device": device,
		"dtype": args.dtype,
		"transformers": transformers.__version__,
		"prompt": args.prompt,
		"chat_template": templated,
		"prompt_ids": input_ids[0].tolist(),
		"prefill_argmax": int(last.argmax()),
		"prefill_top": [[int(i), float(v)] for v, i in zip(top.values.tolist(), top.indices.tolist())],
		"greedy_ids": new_ids,
		"greedy_pieces": tokenizer.convert_ids_to_tokens(new_ids),
		"greedy_text": tokenizer.decode(new_ids, skip_special_tokens=True),
		"eos_token_ids": [int(t) for t in (model.generation_config.eos_token_id if isinstance(model.generation_config.eos_token_id, list) else [model.generation_config.eos_token_id]) if t is not None],
	}
	(out_dir / "reference.json").write_text(json.dumps(reference, indent=2, ensure_ascii=False), encoding="utf-8")
	print(f"[reference] {len(new_ids)} jetons / tokens sur {device} : {reference['greedy_text']!r}")


if __name__ == "__main__":
	sys.exit(main())
