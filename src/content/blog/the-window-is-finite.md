---
title: "The context window is a token budget"
date: 2026-05-27
tags:
  - llm
  - tokens
summary: "Generation is one token at a time until a stop condition. Paste-the-whole-PDF isn't a retrieval strategy, and where a fact sits in a long prompt can change whether it is used."
---

A completion arrives one token at a time until something says stop: an end-of-sequence token, a stop string, or `max_tokens`. The prompt plus those tokens have to fit in a window. That window is a token budget. If the prompt already used 6,000 of an 8,192 window, you have 2,192 tokens left for the answer. `max_tokens=4096` on that call does not give you 4096. The API will stop at the window, or refuse the request before it starts.

## Checks

**Truncation is a stop condition.** Ask for two paragraphs with `max_tokens=16`. The answer stops mid-thought. That isn't the model "being concise." You cut the tape. The model would have kept sampling. The API hit the cap and returned `finish_reason=length` (or the vendor's name for it). Pin `max_tokens` next to the prompt in the eval log, the same way you pin temperature.

**The API will refuse a huge prompt.** A string like `"alpha " * 200_000` plus "Say OK" should error. Copy the message. That's the vendor enforcing the window. If it doesn't error, the window is larger than you thought; raise the multiplier until you get a clear failure, then stop. Don't keep doubling until the machine falls over.

**Fact position.** Hide one sentence (`The inventory code for the spare projector is PX-441.`) at the start, the middle, or the end of a padded facilities handbook. Ask the same question: what is the inventory code? Record which positions return `PX-441`.

Lost-in-the-middle is a published failure mode: models often use the beginning and the end of a long context more reliably than the middle. A given run may or may not show it. That's worth writing down. The design input is the same either way: position in the window isn't free.

```python
FACT = "The inventory code for the spare projector is PX-441."
QUESTION = "What is the inventory code for the spare projector?"
FILLER = ("The municipal facilities handbook covers booking, keys, and winter closures. " * 80)

def place(fact, position, filler):
    if position == "start":
        return fact + "\n\n" + filler
    if position == "end":
        return filler + "\n\n" + fact
    half = len(filler) // 2
    return filler[:half] + "\n\n" + fact + "\n\n" + filler[half:]

for position in ("start", "middle", "end"):
    document = place(FACT, position, FILLER)
    print(position, complete(f"Document:\n{document}\n\nQuestion: {QUESTION}"))
```

Count how often `PX-441` comes back. If middle is worse than start and end, you saw lost-in-the-middle on this model and this padding. If it isn't, write that down too. A single lucky middle hit is not a design.

## What not to do

Pasting the whole PDF into the prompt is a hope that the useful paragraph survives tokenization, the window, and attention. A 40-page policy with tables and URLs will spend the budget on the wrong pages. Chunk, retrieve, cite. If the fact has to be used, put it where the model actually looks, or don't bury it.

Short `max_tokens` on a classification is fine. Short `max_tokens` on "explain this policy" looks like a product that cannot finish a sentence. Pin the limit next to the prompt in the eval log, the same way you pin temperature.

## Sources

- Context windows as token budgets in vendor API docs
- Lost-in-the-middle as a documented long-context failure mode
