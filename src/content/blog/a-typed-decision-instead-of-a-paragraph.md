---
title: "A typed decision instead of a paragraph"
date: 2026-09-16
tags:
  - llm
summary: "Notes on Diogo Almeida's TypeSafe launch: Jev returns typed probabilities instead of tokens."
---

Diogo Almeida's first line in [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) is the same itch these notes keep hitting: models have been superhuman at chat for years, so where is all the automation?

Chat is a string a person can rewrite. A program needs a value it can branch on, and a confidence it can threshold. Of the four prompt patterns I ran on an invented parks policy, JSON was the only one I'd hand to another process, and even then `json.loads` can throw. Almeida's claim is that they stopped generating the string.

Jev is TypeSafe's first public System One model. Early access started 15 September 2026. The interface they describe is unstructured state in, typed probabilistic decisions out. They gave up string generation, sampling is parallel (every answer in one query), and training is Reinforcement Learning for Calibrated Decisions (RLCD). The probabilities are supposed to track accuracy, not a rater's preferred writeup.

The names are in the FAQ. System One from Kahneman's fast half of *Thinking, Fast and Slow*. Jev from William Stanley Jevons: cheaper intelligence, more demand.

## Numbers they published


|            | Chat models (their column) | Jev                                        |
| ---------- | -------------------------- | ------------------------------------------ |
| Input      | $0.20 to $10 / MTok        | $0.042 / MTok ($42 per billion)            |
| Output     | about 5x the input price   | free                                       |
| End-to-end | 3 to 329 seconds           | 70ms to 500ms                              |
| Sampling   | one token at a time        | all outputs in one query                   |
| Shape      | strings you parse          | values defined in advance, plus confidence |


They say the speed evals were mostly run from laptops on the West Coast, where the service currently lives. On price: they can't prove it isn't subsidized.

"Can't hallucinate" in that post means the output can't leave the schema. Type errors are, they say, mathematically impossible. The answer can still be wrong. The control they offer for that is calibration: higher confidence should mean higher accuracy, so your code can threshold instead of hoping the paragraph was honest.

## Workflows

They score models inside a fixed compute graph. Every model gets the same workflow. The reference answer is the average of GPT-6 Astra and Fable 5.1. Jev sits on the cheap end of a Pareto line they draw across four workflows.

<img
  src="/me/images/blog/typesafe-jev-workflow-evals.webp"
  alt="Scatter plot of accuracy versus cost per workflow on a log scale. Jev is on the far left near 68 percent accuracy, with a grey Pareto line running through Luna, Terra, and Sol."
  width="1280"
  height="703"
  decoding="async"
  fetchpriority="high"
/>

*Accuracy vs cost on four workflows. Figure from Diogo Almeida, [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe, 15 September 2026.*

The homepage multipliers (193.6x faster, 444.6x cheaper) come from this setup. They expect those to be on the high end of real-world gains. The workflows weren't in the training distribution. They were still written by people on the model-capabilities team. The LLM baselines go through TypeSafe's own System One wrapper, which they say is the most accurate way to get decisions out of a chat model and also slower than asking without probabilities.

The simplest workflow they published is an incident path: triage, disposition, containment, playbook. Independent questions in the middle. Discrete branching at the end.

<img
  src="/me/images/blog/typesafe-jev-workflow-diagram.webp"
  alt="Four-stage incident workflow: triage readings of an alert, disposition into close queue or act, containment as eleven readings of incident state, and a playbook that takes the first matching action group."
  width="1280"
  height="440"
  decoding="async"
  loading="lazy"
/>

*The simplest of the four published workflows. Same source.*

That's the shape I'd sketch for a policy assistant: decompose the question, score each piece, let code decide what fires. A chat model can be wrapped into that graph. Jev is built as if the graph were the product.

## Zero type errors, as a guarantee

They plot structured-output error rates and tool-call error rates from OpenRouter for the chat models. Jev is drawn at 0% on both. That zero isn't a measured hallucination rate. Schema matching is guaranteed, so they put a zero on the chart.

<img
  src="/me/images/blog/typesafe-jev-type-errors.webp"
  alt="Two bar charts. Left: structured output error rate, Jev at 0 percent, other models from under 1 percent up to Haiku 4.5 at 45.5 percent. Right: tool call error rate, Jev at 0 percent, other models up to Sol at 17 percent."
  width="1280"
  height="396"
  decoding="async"
  loading="lazy"
/>

*Structured-output and tool-call error rates. Same source. The LLM bars are OpenRouter traffic; TypeSafe says the Jev zeros are not empirical.*

A hallucinated tool call is annoying in an agent. Several layers down a pipeline with a latency budget, it's a crash. I've been writing that fluency isn't a control and that the application owns the message array. A sampler that can't emit a key you didn't declare still leaves you with a decision that can be false, which is the part I'd actually try to measure.

## Some interesting use cases

Since Jev's release I've been bumping into little tools and experiments people wired up around a typed decision, and they're all the same itch: pick a label, threshold the confidence, let code do the rest.

- Super fast browser use
- Classification of files that are safe to delete versus ones that aren't
- A slop detector that tagged X posts as "SLOP" when it was confident enough
- A malicious URL classifier
- A buy or sell asset pair trading program
- An LLM tool call scorer

## Sources

- Diogo Almeida, [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), TypeSafe, 15 September 2026. Figures reproduced from that post.
