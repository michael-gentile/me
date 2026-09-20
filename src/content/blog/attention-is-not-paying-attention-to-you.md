---
title: "What attention actually computes"
date: 2026-06-03
tags:
  - llm
summary: "A CIO version and an engineer version of the same stack: frozen model, post-training, and the application layer. Attention is tokens looking at tokens."
---

I keep ending up in rooms where "attention," "layers," "pretraining," "post-training," and "system prompt" get used as if they were one product feature. They're not, and the mix-up is how you get a statement of work that says "tune the model" when you meant "retrieve the PDF." You need a vocabulary that survives a room with a CIO *and* an engineer, because there's no little person inside the product reading your ticket.

## Attach the words to numbers

GPT-2's published `config.json` is a useful sticker on the jargon:

| Knob | GPT-2 | What it is |
| --- | ---: | --- |
| `n_layer` | 12 | How many transformer blocks are stacked |
| `n_head` | 12 | Parallel attention heads per block |
| `n_embd` | 768 | Width of the residual stream |
| `n_positions` | 1024 | Context length in tokens |
| `vocab_size` | 50257 | How many token IDs exist |

A modern chat model is the same kind of object, scaled. The knobs get bigger. The job doesn't change: next-token prediction. When a slide says the model "knows your policies," none of these knobs is a live database of this year's amendment.

## Words that have to stay distinct

**Attention.** Tokens in the window look at other tokens to build the next representation. Each token's residual vector is projected into queries, keys, and values (`Q`, `K`, `V`). Scores are `Q Kᵀ` (scaled), then softmax, then a weighted sum of `V`. GPT-2's 12 heads split the 768-wide stream into 12 slices of 64. A "head" is that slice, run in parallel, concatenated back. That's the mixing step. It's not a staff member reading a ticket, and it's not a retrieval ACL.

During training (and during a normal left-to-right decode) a causal mask zeros out scores for positions ahead of the current token, so the model can't peek at the future. Bidirectional encoders drop that mask. Chat models you call as a completion API keep it, which is why pasting a 200-page handbook and hoping the useful paragraph "gets attended to" is a hope about position in a window, not a search.

**Layers / residual stream.** A stack of the same kind of block. Residual connections carry information forward so the stack can stay trainable. One sentence is enough. You don't need the derivation to use the word correctly in a review, and you don't need it to stop someone writing "more layers" when the need was "fetch the current bylaw."

**Pretraining.** Next-token prediction on a huge text crawl. That's where most of the "knowledge" texture comes from. There's no live database, and a bylaw passed last Tuesday isn't in the weights unless someone put it in later.

**Post-training.** Supervised fine-tuning on instruction examples; preference tuning so answers look more like what raters wanted. This changes style and refusal texture. It's still next-token prediction, so a nicer refusal in the training data isn't a gate in front of HR chunks.

**System prompt.** Not training. Application layer. A string your software prepends. It can be ignored, leaked into logs, or overridden by other tokens. It's a control, and a weak one if it's the only control, which is the version of "tune the model" that is actually a paragraph in a config file.

## Two versions of the same stack

CIO version: the product is a stack. Frozen model, plus our prompt, plus our data, plus our tools. The vendor slide that says "the model knows your policies" is selling the stack and naming one layer.

Engineer version: pretrain / SFT / preference / system prompt are different layers. Mixing them up is how you get a statement of work that says "tune the model" when you meant "retrieve the PDF." If the bylaw changed last Tuesday, I want the PDF in the retriever, not another training run.

Jay Alammar's illustrated transformer and 3Blue1Brown's attention video are enough reading if you want the pictures behind QKV. I'd rather walk out of the meeting having agreed which layer owns the PDF.

## Sources

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/): Jay Alammar
- [Attention in transformers](https://www.3blue1brown.com/lessons/attention): 3Blue1Brown
- Hugging Face `gpt2` `config.json`
