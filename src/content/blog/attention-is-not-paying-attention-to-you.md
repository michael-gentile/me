---
title: "What attention actually computes"
date: 2026-06-03
tags:
  - llm
summary: "A CIO version and an engineer version of the same stack: frozen model, post-training, and the application layer. Attention is tokens looking at tokens."
---

You need a vocabulary that survives a room with a CIO *and* an engineer. Attention, layers, pretraining, post-training, system prompt. Those words get used as if they were one product feature. They aren't.

## Attach the words to numbers

GPT-2's published `config.json` is a useful sticker on the jargon:

| Knob | GPT-2 | What it is |
| --- | ---: | --- |
| `n_layer` | 12 | How many transformer blocks are stacked |
| `n_head` | 12 | Parallel attention heads per block |
| `n_embd` | 768 | Width of the residual stream |
| `n_positions` | 1024 | Context length in tokens |
| `vocab_size` | 50257 | How many token IDs exist |

A modern chat model is the same kind of object, scaled. The knobs get bigger. The job doesn't change: next-token prediction.

## Words that have to stay distinct

**Attention.** Tokens in the window look at other tokens to build the next representation. Each token's residual vector is projected into queries, keys, and values (`Q`, `K`, `V`). Scores are `Q Kᵀ` (scaled), then softmax, then a weighted sum of `V`. GPT-2's 12 heads split the 768-wide stream into 12 slices of 64. A "head" is that slice, run in parallel, concatenated back. There is no little person inside the product reading your ticket.

During training (and during a normal left-to-right decode) a causal mask zeros out scores for positions ahead of the current token, so the model cannot peek at the future. Bidirectional encoders drop that mask. Chat models you call as a completion API keep it.

**Layers / residual stream.** A stack of the same kind of block. Residual connections carry information forward so the stack can stay trainable. One sentence is enough. You don't need the derivation to use the word correctly.

**Pretraining.** Next-token prediction on a huge text crawl. That's where most of the "knowledge" texture comes from. There's no live database, and a bylaw passed last Tuesday isn't in the weights unless someone put it in later.

**Post-training.** Supervised fine-tuning on instruction examples; preference tuning so answers look more like what raters wanted. This changes style and refusal texture. Still next-token prediction. Still not a security kernel.

**System prompt.** Not training. Application layer. A string your software prepends. It can be ignored, leaked into logs, or overridden by other tokens. It's a control, and a weak one if it's the only control.

## Two versions of the same stack

CIO version: the product is a stack. Frozen model, plus our prompt, plus our data, plus our tools. The vendor slide that says "the model knows your policies" is selling the stack and naming one layer.

Engineer version: pretrain / SFT / preference / system prompt are different layers. Mixing them up is how you get a statement of work that says "tune the model" when you meant "retrieve the PDF."

Jay Alammar's illustrated transformer and 3Blue1Brown's attention video are enough reading. You don't need five papers to stop saying "the AI is thinking."

## Sources

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/): Jay Alammar
- [Attention in transformers](https://www.3blue1brown.com/lessons/attention): 3Blue1Brown
- Hugging Face `gpt2` `config.json`
