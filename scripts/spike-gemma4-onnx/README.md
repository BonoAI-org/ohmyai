# Spike : Gemma 4 12B en ONNX pour le navigateur / Gemma 4 12B as ONNX for the browser

Question posée / Question asked : le décodeur texte de `google/gemma-4-12B-it`
(`model_type: gemma4_unified`) s'exporte-t-il en ONNX avec l'outillage standard,
et le graphe obtenu reste-t-il numériquement stable sur WebGPU en fp16 et en q4 ?
Does the text decoder of `google/gemma-4-12B-it` export to ONNX with standard
tooling, and does the resulting graph stay numerically stable on WebGPU in fp16
and q4?

Contexte : aucun port navigateur du 12B n'existe (voir `docs/MODELES.md`, section
7 bis). Un contributeur rapportait qu'un export « aux opérateurs décomposés »
tournait sur CPU mais divergeait sur WebGPU. Ce spike mesure cela plutôt que de
le supposer.
Context: no browser port of the 12B exists (see `docs/MODELES.md`, section
7 bis). A contributor reported that a "decomposed operators" export ran on CPU
but diverged on WebGPU. This spike measures that rather than assuming it.

## Étapes / Steps

```bash
cd scripts/spike-gemma4-onnx
uv venv .venv && uv pip install -r requirements.txt
(cd node && bun install)

# 1. Export du décodeur (input_ids + cache clé/valeur -> logits + cache), fp16, dynamo
#    Decoder export (input_ids + key/value cache -> logits + cache), fp16, dynamo
.venv/bin/python export_decoder.py --model google/gemma-4-12B-it --name gemma-4-12b-fp16 --dtype fp16

# 2. Référence PyTorch (bf16 sur Metal) : logits du préremplissage + 32 jetons gloutons
#    PyTorch reference (bf16 on Metal): prefill logits + 32 greedy tokens
.venv/bin/python make_reference.py --model google/gemma-4-12B-it --name gemma-4-12b-fp16

# 3. Quantification 4 bits des MatMul (le q4f16 de Transformers.js)
#    4-bit MatMul quantization (Transformers.js's q4f16)
.venv/bin/python quantize_q4.py gemma-4-12b-fp16

# 3 bis. Découpage des données externes en tranches de moins de 2 Go : un navigateur
#        n'alloue pas 8 Go d'un bloc et son cache refuse les entrées au-delà de 2 Go
#        Split external data into sub-2 GB shards: a browser will not allocate 8 GB in
#        one block and its cache rejects entries above 2 GB
.venv/bin/python shard_external_data.py gemma-4-12b-fp16-q4

# 4. Validation CPU (facultative, vérifie l'export indépendamment de WebGPU)
#    CPU validation (optional, checks the export independently of WebGPU)
(cd node && bun run validate ../out/gemma-4-12b-fp16-q4)

# 5. Validation WebGPU : lancer le serveur puis ouvrir la page
#    WebGPU validation: start the server then open the page
node serve.mjs 8765
# http://localhost:8765/validate_webgpu.html?model=gemma-4-12b-fp16-q4&auto=1
```

Les scripts sont génériques : `--model HuggingFaceTB/SmolLM2-135M-Instruct` permet
de valider la chaîne en quelques minutes avant d'y passer le 12B.
The scripts are generic: `--model HuggingFaceTB/SmolLM2-135M-Instruct` validates
the chain in a few minutes before spending it on the 12B.

## Ce que chaque script produit / What each script produces

| Fichier / File | Contenu / Content |
|---|---|
| `out/<nom>/model.onnx` + `model.onnx.data` | graphe et poids / graph and weights |
| `out/<nom>/meta.json` | dtype, exportateur, forme du cache par couche (têtes KV, dimension de tête, qui varie par couche sur Gemma 4), noms d'entrées et sorties / dtype, exporter, per-layer cache shape (KV heads, head dim, which varies per layer on Gemma 4), input and output names |
| `out/<nom>/reference.json` | jetons du prompt, top-50 logits PyTorch de la dernière position, jetons gloutons / prompt tokens, PyTorch top-50 logits of the last position, greedy tokens |
| `out/<nom>/result-node.json`, `window.__spikeResult` | verdict `OK`, `DIVERGENT` ou `INSTABLE`, NaN, écarts de logits, préfixe de jetons identique / verdict, NaNs, logit gaps, identical token prefix |

## Verdicts / Verdicts

- `INSTABLE` : NaN ou infinis dans les logits. C'est le symptôme WebGPU rapporté
  pour Gemma 4 ; s'il apparaît, l'étape de fusion des opérateurs
  (`SimplifiedLayerNormalization`, `RotaryEmbedding`, `GroupQueryAttention`) devient
  obligatoire / NaN or infinities in the logits. The WebGPU symptom reported for
  Gemma 4; if it shows up, the operator fusion step becomes mandatory.
- `DIVERGENT` : stable, mais l'argmax ou les premiers jetons diffèrent de
  PyTorch. À interpréter avec l'écart de logits : q4 déplace les logits de
  plusieurs unités sans changer le classement / stable, but the argmax or the
  first tokens differ from PyTorch. Read alongside the logit gap: q4 shifts
  logits by several units without changing the ranking.
- `OK` : même argmax et au moins huit jetons gloutons identiques / same argmax and
  at least eight identical greedy tokens.

## Résultats du 19 septembre 2026 / Results of September 19, 2026

Machine : MacBook Pro M1 Max, 64 Go, Chrome 153, onnxruntime-web 1.31 (build du
14 septembre livré avec Transformers.js 4.3), onnxruntime-node 1.30, transformers
5.17, torch 2.14. Prompt : « Explique en deux phrases pourquoi le ciel est bleu. »,
24 jetons avec le gabarit de conversation, 32 jetons gloutons.
Machine: MacBook Pro M1 Max, 64 GB, Chrome 153, onnxruntime-web 1.31 (September 14
build shipped with Transformers.js 4.3), onnxruntime-node 1.30, transformers 5.17,
torch 2.14. Prompt: "Explique en deux phrases pourquoi le ciel est bleu.", 24 tokens
with the chat template, 32 greedy tokens.

| Export | Poids / Weights | Où / Where | NaN | Argmax | Jetons identiques / Identical tokens | Écart top-50 / Top-50 gap | ms/jeton | Verdict |
|---|---|---|---|---|---|---|---|---|
| SmolLM2 135M fp32 | 0,55 Go | WebGPU | 0 | = | 6/6 | 0,00004 | 107 | OK |
| SmolLM2 135M fp16 | 0,27 Go | WebGPU | 0 | = | 6/6 | 0,30 | 76 | OK |
| SmolLM2 135M q4 | 0,12 Go | WebGPU | 0 | = | 6/6 | 6,7 | 55 | OK |
| Gemma 4 12B q4 | 8,15 Go, 4 tranches / shards | WebGPU | 0 | = | 8/32 | 3,6 | 374 | OK |
| Gemma 4 12B q4 | 8,15 Go | CPU (Node) | 0 | = | 8/32 | 4,2 | 159 | OK |
| Gemma 4 12B fp16 | 23,8 Go, 12 tranches / shards | WebGPU | — | — | — | — | — | non chargeable : Chrome refuse d'allouer au-delà d'environ 8 Go de tampons par page / not loadable: Chrome refuses to allocate beyond about 8 GB of buffers per page |
| Gemma 4 12B fp16 | 23,8 Go | CPU (Node) | 0 | = | 32/32 | 0,20 | 614 | OK |

Lecture / Reading:

- **Pas d'instabilité sur WebGPU.** Le 12B exporté avec les opérateurs décomposés,
  sans aucune fusion, ne produit ni NaN ni infini en fp16 q4, au préremplissage
  comme sur 32 pas de décodage. La fusion d'opérateurs n'est donc pas une condition
  de stabilité, contrairement à ce que la discussion communautaire laissait
  craindre / **No instability on WebGPU.** The 12B exported with decomposed
  operators, with no fusion at all, produces neither NaN nor infinity in fp16 q4,
  during prefill and across 32 decoding steps. Operator fusion is therefore not a
  stability requirement, unlike what the community discussion suggested.
- **L'export est exact** : en fp16 non quantifié sur CPU, les 32 jetons gloutons sont ceux de PyTorch et les logits s'écartent de 0,2 au plus / **The export is exact**: in unquantized fp16 on CPU, all 32 greedy tokens are PyTorch's and the logits differ by at most 0.2.
- **La divergence après huit jetons vient de la quantification, pas du moteur** :
  CPU et WebGPU divergent au même jeton, et la suite produite reste un français
  correct sur le même sujet (« … la lumière du soleil, composée de toutes les
  couleurs de l'arc-en-ciel, traverse l'atmosphère terrestre. ») / **The divergence
  after eight tokens comes from quantization, not the engine**: CPU and WebGPU
  diverge at the same token, and the produced continuation stays correct French on
  the same topic.
- **La vitesse est le vrai chantier** : 374 ms par jeton, soit environ 2,7 jetons
  par seconde, avec une attention décomposée et un cache clé/valeur qui fait
  l'aller-retour vers le CPU à chaque pas. C'est là que les opérateurs fusionnés
  (`GroupQueryAttention`) et `preferredOutputLocation: 'gpu-buffer'` apporteront
  leur gain / **Speed is the real work**: 374 ms per token, about 2.7 tokens per
  second, with decomposed attention and a key/value cache round-tripping to the CPU
  at every step. That is where fused operators (`GroupQueryAttention`) and
  `preferredOutputLocation: 'gpu-buffer'` will pay off.
- **Le budget mémoire d'une page Chrome plafonne vers 8 Go de tampons** sur cette
  machine : le q4 passe, le fp16 non. Transformers.js contourne cela en livrant les
  tranches une à une au moteur ; à reproduire dans la version livrable / **A Chrome
  page's memory budget caps around 8 GB of buffers** on this machine: q4 passes,
  fp16 does not. Transformers.js works around this by handing shards to the engine
  one at a time; to be reproduced in the shippable version.

## Limites connues / Known limits

- Le cache exporté est un `DynamicCache` sans configuration : les couches à
  fenêtre glissante gardent tout leur passé au lieu de le tronquer à 1024. Correct
  pour des contextes courts, mais le graphe livrable devra reproduire la troncature
  / The exported cache is an unconfigured `DynamicCache`: sliding-window layers
  keep their whole past instead of cropping it to 1024. Correct for short
  contexts, but the shippable graph will have to reproduce the cropping.
- Texte seul : `embed_tokens` reste dans le décodeur, contrairement à la
  disposition Transformers.js qui le sépare pour injecter les images / Text only:
  `embed_tokens` stays inside the decoder, unlike the Transformers.js layout that
  splits it out to inject images.
- `onnxruntime-node` 1.30 ne reconnaît pas le `Float16Array` natif de Node 24,
  d'où `--no-js-float16array` dans `bun run validate` / `onnxruntime-node` 1.30
  does not recognise Node 24's native `Float16Array`, hence `--no-js-float16array`
  in `bun run validate`.
- L'export dynamo charge le modèle en fp16 sur CPU : 24 Go de poids, comptez le
  double pendant l'export / The dynamo export loads the model in fp16 on CPU:
  24 GB of weights, expect twice that during the export.
