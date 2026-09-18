---
title: "From matrices to a sampled token"
date: 2026-08-13
tags:
  - llm
  - architecture
summary: "Tokens and matrices, pretraining, SFT and preference, adapters versus prompts, then inference with a KV cache and speculative decoding. Same job the whole way: next-token prediction."
---

Product talk jumps layers. This is the object underneath, in order: what a GPT-style model *is*, how the weights get there, what "tuning" actually changes, and what happens at inference (including the trick that makes coding assistants feel instant).

One job. Predict the next token. Everything else is how you get that prediction, and what you wrap around it.

```text
text → tokens → vectors → transformer blocks
                       → logits → sample → text
         embeddings, QKV, MLP: matrices
```

## Tokens, then matrices

Text isn't what the network sees. A tokenizer chops a string into integer IDs from a fixed vocabulary. Those IDs index **rows of an embedding matrix**: vocab size by hidden size. Token `42` isn't the word "the." It's row 42.

From there, almost every learned piece is a matrix multiply plus a nonlinearity:

- **Attention.** Each token's vector is projected into queries, keys, and values (`Q`, `K`, `V`). Scores are `Q Kᵀ` (scaled, masked so you cannot look into the future during training), then softmax, then a weighted sum of `V`. Several heads do this in parallel and concatenate. "Attention" means tokens in the window mixing information with other tokens in the window. It doesn't mean the model is paying attention to you.
- **MLP / feed-forward.** A bigger matrix (expand), a nonlinearity, a matrix back down to the residual width. This is most of the parameter count in a typical block.
- **Residual stream.** Each sub-layer adds its output back onto the incoming vector. That highway is why you can stack 12 or 96 of the same block without the signal dying.
- **Unembedding.** A last matrix maps the final vector to one score per vocabulary item. Softmax turns those scores into a probability distribution over the next token.

GPT-2's published knobs are a useful sticker if you want numbers: 12 layers, 12 heads, 768-wide residual, 1024-token window, 50,257-token vocabulary. A modern chat model is the same kind of object, scaled. Mixture-of-experts changes *which* matrices fire. It doesn't change the job.

You don't need the derivation to use this in a review. Stop treating "the model" as a person and start treating it as stacked linear maps over a token window.

## Pretraining

Pretraining is next-token prediction on a huge text crawl. Show the model tokens 1…t, ask it for token t+1, measure how wrong the distribution was (cross-entropy), push the matrices a little with backpropagation. Repeat.

That's where most of the "knowledge" texture comes from: statistics of how tokens followed other tokens in the crawl. There's no live database in there. A bylaw passed last Tuesday isn't in the weights unless it was in the data, or someone put it in later.

Compute is the scarce resource. Data mix, sequence length, and batch size are the product decisions. The loss going down isn't the same as the model becoming a reliable clerk.

## Post-training: SFT, then preference

A base model completes internet-shaped text. A chat product needs to follow instructions, refuse some classes of request, and sound like an assistant. That's a second training stage, still next-token prediction, on a different distribution.

**Supervised fine-tuning (SFT).** Human-written (or distilled) prompt–response pairs. The model is trained to emit the response tokens given the prompt tokens. This is ordinary supervised learning. It teaches format and the *habit* of answering.

**Preference / RL.** Raters (or another model) compare two answers. Those comparisons train a **reward model**, or they are used directly.

- **RLHF** (the InstructGPT-shaped loop): sample answers, score them with the reward model, update the policy with an RL algorithm (PPO is the famous one) so high-reward tokens become more likely. A KL penalty keeps the policy from wandering so far from the SFT model that it collapses into reward hacking.
- **DPO** and cousins skip the explicit RL loop. They train on preferred vs rejected pairs as a classification-shaped objective over the same policy. Same intent: move probability mass toward answers people (or a judge) liked.
- **RLAIF** swaps human raters for a model judge. Cheaper. The judge's biases become the policy's biases.

This stage changes style, refusal texture, and how often the model emits tool-call JSON. It doesn't install a boundary between instructions and data. The network is still sampling tokens.

## "Tuning" is several different jobs

People say "we will tune the model" when they mean four different interventions. Only one of them writes new weights into the base network.

| They said | What actually moves | When I would use it |
| --- | --- | --- |
| Full fine-tune | All (or most) weights | You own the training stack and have a large, clean domain corpus |
| LoRA / adapters | Small low-rank matrices beside frozen weights | Domain style or format; you still want the base model intact |
| System prompt / few-shot | No weights. Tokens prepended at inference | Instructions, tone, output schema. Weak if it is the only control |
| Retrieval / tools | No weights. Extra tokens and an application loop | Facts that change, documents with ACLs, actions that need a gate |

LoRA is the one worth naming. Freeze the pretrained matrices. Learn a pair of thin matrices whose product is added into selected layers. You ship a small adapter file, not a second 70B checkpoint. Merge at serve time if you want one set of weights.

A prompt isn't tuning. Retrieval isn't tuning. Both are the application layer. Mixing them up is how a statement of work says "fine-tune" when the need was "fetch the current PDF and do not let recreation users retrieve HR."

## Inference: prefill, decode, sample

Training is batched and parallel over the sequence (with a causal mask). Serving a chat turn is mostly sequential.

1. **Tokenize** the message array (system, retrieved blocks, user, prior assistant turns) into one ID list.
2. **Prefill.** Run the prompt through the stack once. Build a **KV cache**: the keys and values for every layer, every token so far. This is the expensive step for a long prompt.
3. **Decode.** For each new token: one forward pass that only needs the new query against the cached keys/values, then sample, then append. Repeat until an end token, a stop string, or `max_tokens`.
4. **Detokenize** into text (or into tool-call JSON your process may refuse to execute).

Sampling is a draw from the softmax distribution. Temperature stretches it. Top-p cuts the tail. Temperature 0 is "take the argmax," and vendors still aren't always bit-identical. Pin the knobs in production. Don't call the knob creativity.

The KV cache is why "just paste the whole PDF" is a cost and latency problem, not only a quality problem. You pay prefill on every new prompt that isn't a prefix of the last one. Prefix caching helps when the system prompt is stable. It doesn't make an unbounded dump a retrieval strategy.

## Speculative decoding

Autoregressive decode is slow because each token waits on a full forward pass of the large model. **Speculative decoding** (the name in the papers; people say "speculative coding" when the product is a coding assistant) splits the work:

- A **cheap drafter** (a smaller model, a distilled head, or even n-gram guesses) proposes several future tokens.
- The **large model** checks those tokens in one parallel pass over the draft.
- Accept the prefix that matches what the large model would have sampled. Reject at the first mismatch, sample a real token there, and draft again.

The user-visible stream is still from the large model's distribution if the accept/reject rule is right. You're buying latency, not a different personality. When the draft is good (boilerplate, obvious syntax, the next line of a function the model has already started), accept rates are high and the assistant feels instant. When the next token is genuinely uncertain, the draft is waste and you fall back to ordinary decode.

Coding products love this because code is locally predictable: brackets, identifiers, the rest of a `for` loop. Some stacks also speculate on the next *edit* or tool call and throw it away if the user types something else. Same shape. Cheap proposal, expensive check.

It's an inference optimization. It doesn't make the answer more true.

## Layers

If you can point at which layer a vendor is selling (matrices, a pretrained checkpoint, an SFT/preference recipe, an adapter, a prompt, a retriever, a decode-time trick), you can stop arguing with the word "AI."

The model is the matrices and the loop that samples from them. The product is everything around that loop. The application is still where policy lives.

## Sources

- [The Illustrated Transformer](https://jalammar.github.io/illustrated-transformer/): Jay Alammar
- [Attention in transformers](https://www.3blue1brown.com/lessons/attention): 3Blue1Brown
- Vaswani et al., *Attention Is All You Need* (2017)
- Ouyang et al., *Training language models to follow instructions with human feedback* (InstructGPT / RLHF)
- Rafailov et al., *Direct Preference Optimization* (DPO)
- Hu et al., *LoRA: Low-Rank Adaptation of Large Language Models*
- Leviathan, Kalman, and Matias, *Fast Inference from Transformers via Speculative Decoding*
