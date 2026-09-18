---
title: "Twenty questions that keep me honest"
date: 2026-06-23
tags:
  - llm
  - evals
summary: "A fixed pool schedule, twenty questions, two system prompts, keyword scoring. Crude on purpose. A prompt change is a regression test."
---

I was arguing from vibes. The fix is boring: keep the questions still, change the prompt, watch the score move.

## The bar

Invented recreation notes. Cedar closed Mondays. Harbour open daily including Mondays. Ridge closed until 1 November. Resident admission $4.50. Twenty questions in a JSON file, each with `must_include` strings. The strings are the bar, not the full meaning. "Is Cedar Pool open on Mondays?" must include `closed`. "Resident admission price?" must include `4.50`.

Two system prompts on the same twenty items:

- **Loose:** be helpful, answer the question.
- **Grounded:** answer only from the notes; if it isn't there, say so; don't invent hours.

Keyword scoring, not an LLM-as-judge. Keyword scoring is crude and that's the lesson. Even a crude harness beats "it looked good." Expect `grounded` to refuse more cleanly on gaps and `loose` to invent or ramble. Your numbers will differ by model. Write them down anyway.

Two items, so the file shape is obvious:

```json
[
  {
    "id": "cedar-monday",
    "q": "Is Cedar Pool open on Mondays?",
    "must_include": ["closed"]
  },
  {
    "id": "resident-price",
    "q": "Resident admission price?",
    "must_include": ["4.50"]
  }
]
```

The scorer lowercases and looks for the substring. "Closed Mondays." should pass `closed`. "Cedar does not open on Monday." should pass too. "It's shut." will fail even if the model was right: that is the scorer being unfair, so you add `shut` or you mark the item as a paraphrase and fix the key. "Yes, 9 to 5" on Cedar Monday is the model being wrong. Do not "fix" that by deleting the question.

An LLM-as-judge is a second model grading the first. Use it later, if at all, on items where keywords cannot see a good paraphrase. Start here. A judge you have not eval'd is another vibe.

```text
| Prompt   | Pass / 20 |
| loose    |           |
| grounded |           |
| Delta    |           |
```

Open the CSV. Pick two FAIL rows. Decide whether the scorer was unfair (keyword missed a good paraphrase) or the model was wrong. Both happen. If "Closed Mondays." fails because the key was `closed` in lowercase, fix the scorer. If the model said Cedar is open Mondays, fix the prompt or the retrieval, not the scorer.

Change one line of the grounded prompt and rerun. Note the delta. If the score went up because you added the answer to the prompt, that is not a better prompt. That is the test leaking.

## What this is for

A prompt is application logic. Application logic gets tests. You don't need a vendor eval platform on day one. You need twenty frozen questions, a pass bar you could explain, and a file that turns red when you "improve" the wording.

Later you can put the same assertions in CI. The habit starts here: stop shipping a prompt because the demo was friendly. Twenty questions in a JSON file is enough to catch the "helpful" rewrite that invented Harbour's Monday hours.

## Sources

- Keyword evals as a deliberately crude baseline
- Golden questions as a regression set, not a benchmark leaderboard
