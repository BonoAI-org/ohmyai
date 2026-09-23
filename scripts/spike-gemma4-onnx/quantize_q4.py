#!/usr/bin/env python3
"""
Quantifie les MatMul d'un export en 4 bits par blocs (MatMulNBits), ce que
Transformers.js appelle q4f16 quand les activations restent en fp16. C'est la
précision qu'on livrerait, et celle dont il faut vérifier la stabilité.
Quantizes an export's MatMuls to 4-bit blocks (MatMulNBits), what
Transformers.js calls q4f16 when activations stay in fp16. It is the precision
we would ship, and the one whose stability must be checked.

Entrée / Input : out/<nom>/model.onnx   Sortie / Output : out/<nom>-q4/model.onnx
"""

import argparse
import json
import shutil
import sys
from pathlib import Path

import onnx


def main():
	ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
	ap.add_argument("name", help="Dossier source sous out/ / Source folder under out/")
	ap.add_argument("--block-size", type=int, default=32)
	ap.add_argument("--accuracy-level", type=int, default=4, help="4 = int8 activations dans le noyau, comme onnx-community")
	ap.add_argument("--out", default="out")
	args = ap.parse_args()

	src = Path(args.out) / args.name
	dst = Path(args.out) / f"{args.name}-q4"
	dst.mkdir(parents=True, exist_ok=True)
	for old in dst.glob("model.onnx*"):
		old.unlink()

	try:
		from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer as Quantizer
	except ImportError:
		from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer as Quantizer

	print(f"[q4] chargement / loading {src / 'model.onnx'}")
	model = onnx.load(str(src / "model.onnx"), load_external_data=True)
	quant = Quantizer(model, block_size=args.block_size, is_symmetric=True, accuracy_level=args.accuracy_level)
	quant.process()
	quant.model.save_model_to_file(str(dst / "model.onnx"), use_external_data_format=True)

	meta = json.loads((src / "meta.json").read_text(encoding="utf-8"))
	meta["quantization"] = {"weights": "q4", "block_size": args.block_size, "accuracy_level": args.accuracy_level}
	meta["files"] = {"model": "model.onnx", "external_data": sorted(p.name for p in dst.glob("model.onnx*") if p.name != "model.onnx")}
	(dst / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
	if (src / "reference.json").exists():
		shutil.copy(src / "reference.json", dst / "reference.json")
	total = sum(p.stat().st_size for p in dst.glob("model.onnx*"))
	print(f"[q4] écrit / written {dst} ({total / 1e9:.2f} Go)")


if __name__ == "__main__":
	sys.exit(main())
