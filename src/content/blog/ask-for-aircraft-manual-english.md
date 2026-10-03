---
title: "Ask for aircraft-manual English"
date: 2026-10-03
tags:
  - llm
  - prompts
summary: "Karpathy's tip: explain it in ASD-STE100. Controlled English from aerospace manuals. Short sentences, one meaning per word, and why models often sound clearer under that constraint."
---

[Andrej Karpathy](https://x.com/karpathy/status/2105819303471976479) posted a short list of ways to spend less time fighting model prose. The first tip is the one I kept: ask the model to explain something in **ASD-STE100**.

That is [Simplified Technical English](https://asd-ste100.org/), a controlled language built for aerospace maintenance documentation. Airlines needed manuals that readers with limited English could follow without guessing which meaning of "close" or "replace" the writer meant. The writing rules and dictionary are public from ASD. The goal was fewer misunderstandings on the hangar floor. The side effect, for chat, is text that is hard to pad.

## What the specification actually is

STE is not "write simply." It has two parts:

1. **Writing rules** — short sentences, active voice in procedures, one instruction per step, tight noun clusters, limits on paragraph length.
2. **A dictionary** — on the order of **900 approved words**, each with **one** approved meaning and part of speech. Unapproved words come with approved replacements (`commence` → `START`, `ensure` → `MAKE SURE`, `prior to` → `BEFORE`).

Procedural sentences top out around 20 words. Descriptive ones around 25. Progressive tense and passive voice in procedures are out. Same thing gets the same name every time.

A common before/after from STE teaching material looks like this:

> It is imperative that the operator ensures the hydraulic reservoir is replenished prior to commencing operation.

> Make sure that the hydraulic reservoir is full before you start the operation.

<img
  src="/me/images/blog/asd-ste100-overview.webp"
  alt="One-page overview of ASD-STE100: writing rules, dictionary of about 900 approved words, sentence length limits, approved verb forms, and a short history from AECMA Simplified English to the ASD standard."
  width="1024"
  height="512"
  decoding="async"
  loading="lazy"
/>

## Why this works well with LLMs

Models are good at sounding smart. They are also good at stacking clauses, swapping synonyms for the same object, and burying the action in the middle of a sentence. STE fights that style by construction.

**One word, one job.** If "close" is only a verb meaning shut, the model cannot quietly use it as "near." Homonyms are a common source of mushy explanations. A controlled dictionary removes a lot of that room.

**Length caps.** A 20-word procedure sentence leaves less space for hedging and filler. You still have to check the facts. You spend less time unpacking the sentence.

**Active, named actors.** "Make sure… before you start…" puts the doer and the action up front. That is easier to scan than "it is imperative that…"

Karpathy's claim is practical: models have seen enough of this style in training that they can imitate it, and he finds the result more readable. I buy the readability part. I would not claim the output is certified STE. Without the real dictionary open as a lookup, you get **STE-flavored** English — short, imperative, consistent-ish — not a compliance pass.

## The "80%" dial

The full specification is harsh for everyday chat. Karpathy sometimes asks for **"80% of the way to ASD-STE100"** so the tone softens without inviting the usual essay voice back in. That percentage is a style knob, not a score from ASD.

A prompt shape that matches the spirit without pretending to own the word list:

```text
Explain this using the writing principles of ASD-STE100 Simplified Technical English.
Use short sentences and active voice.
One action per procedural step.
Use the same name for the same thing every time.
Prefer common words. Avoid filler and stacked clauses.
```

If the topic is not a procedure, ask for descriptive STE limits instead of fake command lists.

## A skill for agent-facing English

Karpathy's tip is a prompt. [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill) turns the same idea into a Claude Code skill aimed at text another machine has to parse: tool descriptions, error messages, system prompts, instructions between agents. Their analogy matches the hangar: no human on the line to ask "did you mean X or Y?"

Two modes matter for how honest the rewrite can be:

- **Strict** — procedures, errors, tool specs. Hard length caps and one-word-one-meaning discipline.
- **STE-flavored** — READMEs, PR notes, explanations. Same sentence habits; lexical lockdown treated as advisory.

That split lines up with the caveat above. The skill encodes Issue 9 rule *categories* and a structural checklist (active voice, no phrasal verbs, no semicolons, noun clusters ≤3 words, and so on). It does **not** ship ASD's ~900-word approved dictionary. The README is clear why: the standard is free to *get*, not free to *redistribute*. So you get principle-level rewrites and an optional `scripts/ste-lint.py` for mechanical checks, not a compliance stamp.

Install from a project root with the skills CLI:

```bash
npx skills add danyuchn/asd-ste100-skill
```

Or clone into `~/.claude/skills/` if you want a live checkout. Ask it to disambiguate a tool description, or to "apply ASD-STE100" to a pasted error string. Default output is the rewrite alone; add "show the diff" when you want the rule table.

One line from their boundaries is worth keeping next to any STE prompt: short and empty is still empty. The form got fixed. The substance did not.

## Where it sits in his ladder

Writing is only the first rung in that post. He prefers diagrams when a figure would parse faster, HTML when interactivity helps, and custom explainer videos when the topic needs motion. The shared idea is the same as the STE tip: change the packaging of understanding, because more of the job is reviewing what the model produced.

For chat, the cheap experiment is still one sentence in the prompt. For agent plumbing — tool schemas, error strings, handoffs — the skill is the packaged version of that ask, with modes that admit when dictionary compliance is out of reach.

## Sources

- [Andrej Karpathy on X](https://x.com/karpathy/status/2105819303471976479) (ASD-STE100 tip and related output formats)
- [ASD-STE100 / STEMG](https://asd-ste100.org/)
- [danyuchn/asd-ste100-skill](https://github.com/danyuchn/asd-ste100-skill)
- Related: [A fluent citation can still be fake](/me/blog/fluency-is-not-a-control/)
