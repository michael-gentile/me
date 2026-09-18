---
title: "Temperature is not creativity"
date: 2026-05-30
tags:
  - llm
  - sampling
summary: "Ten runs of the same prompt at three temperatures. Sampling is a draw from a distribution. Evals have to pin the knobs."
---

Model demos often look perfect in a hallway and messy in a meeting. One of the boring reasons is sampling. The next token is drawn from a distribution. Temperature, top-p, and (sometimes) a seed change that draw. "Creativity" is marketing copy for the same knob.

I ran a table, not a vibe: one prompt, ten runs, three temperatures.

The next token is a draw from `softmax(logits / T)`. The logits are a vector the size of the vocabulary. Temperature `T` stretches or squashes that vector before the softmax. `T` near 0 makes one token dominate. `T` above 1 flattens the distribution so the tail gets sampled more often. "Creativity" is marketing copy for that knob.

`top_p` is a different cut: sort the distribution, keep the smallest prefix whose probabilities sum to `p`, renormalize, then sample. Temperature changes the shape. `top_p` throws away the far tail. Pin both. You don't need a second sweep if temperature already made the shape visible.

## Setup

Prompt: `Name one Canadian province. Reply with the province name only.`

Ten completions at temperature `0.0`, `0.7`, and `1.2`. Same model, `max_tokens=20`, answers collapsed on whitespace so `"Ontario"` and `"Ontario "` count as one string. The number that matters is **unique answers out of ten**.

| Temperature | What to look for |
| --- | --- |
| 0.0 | Collapse toward one or two strings. If it still fans out, the provider isn't fully deterministic. That's a result. |
| 0.7 | A small set of plausible names, not a new country. |
| 1.2 | More unique strings, more spelling drift, more "answers" that aren't provinces. |

I didn't invent a filled results table here. The point of the harness is to fill it against the model you actually call. Temperature 0 *should* collapse. If your vendor still varies, you cannot treat a single golden answer as a regression test. Causes I have seen in docs and in other people's logs: the API still samples, a load balancer hits two replicas, or "temperature 0" is implemented as a very small epsilon. Copy the response headers. Ask whether they claim bit-identical output.

Optional extra: call twice with `temperature=0` and `seed=1`. If the two strings differ, `seed` is documentation, not a guarantee. Read whether the API even claims bit-identical reproducibility.

```python
from collections import Counter

PROMPT = "Name one Canadian province. Reply with the province name only."
TEMPERATURES = (0.0, 0.7, 1.2)

for temperature in TEMPERATURES:
    answers = [
        " ".join(complete(PROMPT, temperature=temperature).split())
        for _ in range(10)
    ]
    print(temperature, len(Counter(answers)), Counter(answers))
```

## Why a demo lies

A slide deck generated at temperature 0 is a mode of the model. The default in a chat UI is often 0.7 or 1.0. Same prompt, same system text, a different draw.

Evals that don't record `temperature`, `top_p`, `seed`, and the model id aren't comparable across days. A "regression" might be sampling. A "fix" might be luck.

If you need one answer (a classification, a JSON field, a permit yes/no), set temperature to 0, constrain the schema, and still treat the string as untrusted. Sampling doesn't make the output true. It only changes how often you see the same lie.

## What to pin

- Model id, not a marketing name
- Temperature and top-p
- Whether the vendor honours `seed`
- Token limits, because a short `max_tokens` looks like "being concise"

The harness is a dozen lines. The discipline is putting those fields next to every recorded answer.

## Sources

- Provider docs for temperature, top-p, and seed (they don't all mean the same thing)
- Sampling as next-token draws, not as a creativity personality
