---
title: "Cuoco Piccolo: a tiny cook on a 16 GB Mac"
date: 2026-10-03
tags:
  - ai
  - programming
summary: "LoRA on Qwen2.5-0.5B-Instruct (4-bit) via MLX, BM25 recipe RAG from TheMealDB, and a router that returns markdown cards instead of letting a small model invent quantities."
---

Cuoco Piccolo means “tiny cook” in Italian. That is the whole brief. I wanted an end-to-end cooking specialist that fits a **16 GB Apple Silicon** Mac: fine-tune something small, retrieve real recipes, and ship a local chat UI I would actually click. Not another “wrap the ChatGPT API” demo.

The stack is **MLX** / `mlx-lm`, a **LoRA** on `Qwen2.5-0.5B-Instruct` in **4-bit**, **BM25** over a TheMealDB corpus plus a short technique KB, and a **deterministic router** in Python. FastAPI serves a single-page chat. The CLI shares the same `reply_to_message` path.

The design rule that mattered most: **the language model does not memorize cookbooks.** Technique, substitutes, and follow-ups can go through LoRA. Concrete recipes with quantities come from retrieval and formatting. A 0.5B model inventing “2 cups of soy sauce” for a casserole is how you get a bad dinner and a useless portfolio story.

<img
  src="/me/images/blog/cuoco-interface.webp"
  alt="Cuoco Piccolo chat UI: dark theme, New chat button, empty conversation pane, starter chips for chicken potato pasta buttermilk and steak, and an orange Send button."
  width="1199"
  height="1280"
  decoding="async"
  fetchpriority="high"
/>

## Why not “just ChatGPT”

| Constraint | Choice |
| --- | --- |
| Hardware | 16 GB unified memory → 0.5B + 4-bit + LoRA |
| Stack | Apple MLX, not CUDA |
| Data | License-first: curated Q&A + TheMealDB API — no scraped recipe blogs |
| Recipe fidelity | Retrieve and format cards; do not free-generate quantities |
| Surface | Local FastAPI SPA + CLI |

Closed cloud models are fine products. They teach you almost nothing about adapters, retrieval filters, session state, or why Gradio quietly skipped your router. This project was homework for that stack.

## The hybrid reply path

Most “give me a recipe” answers never ask the LM to write the card body.

```text
User message
    │
    ▼
ConversationState  (history, pending choices, active recipe id)
    │
    ├─ pending choice list? ──► parse "1" / name ──► markdown recipe card
    │
    ├─ recipe request? ───────► main-ingredient filter + BM25
    │                              ├─ 1 hit  → card
    │                              └─ many   → numbered choices (+ UI buttons)
    │
    ├─ follow-up + active recipe? ► LoRA + full recipe in prompt
    │
    └─ else ────────────────────► LoRA + BM25 technique/KB snippets
```

`respond.py` owns intent. `rag.py` owns BM25 and ~27 main-ingredient tags. `recipes.py` turns hits into markdown. `model.py` runs LoRA under a global MLX lock. Same function for the browser and the terminal.

I tried Gradio and Chainlit earlier. Gradio made it too easy to bypass the router. Chainlit’s static assets broke on the Python I was on. Both are gone. The product surface is FastAPI + CLI.

## What a session looks like

**1. Broad ask → choices.** “Give me a chicken recipe” hits the main-ingredient bucket, BM25 ranks inside it, and the UI draws clickable buttons. You can still type `1` or part of a title.

<img
  src="/me/images/blog/cuoco-choice.webp"
  alt="User asks for a chicken recipe. Cuoco Piccolo lists eight chicken dishes with matching numbered choice buttons below the message."
  width="1199"
  height="1280"
  decoding="async"
  loading="lazy"
/>

**2. Pick → card.** Selecting a dish renders a markdown card: title, area/category, main ingredients, ingredients list, numbered steps. That text is assembled by code from the retrieved MealDB row, not sampled token by token.

<img
  src="/me/images/blog/cuoco-recipe.webp"
  alt="Recipe card for Chicken Enchilada Casserole with ingredients and steps, and a Following up on status line above the conversation."
  width="1199"
  height="1280"
  decoding="async"
  loading="lazy"
/>

**3. Follow-ups stay grounded.** After a card, `active_recipe_id` is set. “How long?”, “Can I swap butter?”, “What’s step 3?” inject that card into the prompt so LoRA answers against the same quantities. Bare short asides and questions about a *different* main ingredient do not steal the active recipe. Follow-up detection wants an explicit cue.

History keeps full turns in the session, but the model only sees the last **six** pairs, with long cards compressed to a one-line stub so a 0.5B context window does not drown in casserole paste. **New chat** / `/reset` clears state. Reloading the page gets a new `session_id`.

## Data lineage

Rough counts after a full TheMealDB build:

| Artifact | Count | Role |
| --- | ---: | --- |
| Raw meals | ~790 | Official API (dev key `1`) |
| RAG docs | ~817 | Meals + ~27 local technique docs |
| MealDB chat SFT | ~3450 | How-to, ingredients, mains, choice→card turns |
| Train merge | ~3618 | Local synth Q&A + MealDB chat |
| Valid / test | ~344 each | Holdouts |
| Hand eval | 63 | Substitute, on-topic, safety humility |

Pipeline: fetch A–Z from TheMealDB → merge local KB into `rag_docs.jsonl` → templated Q&A (substitutions, methods, refusals, safety humility) plus MealDB chat into train/valid/test. Main-ingredient tags (chicken, potato, pasta, …) drive both retrieval filters and SFT examples.

Recipe **cards** in the live app always go through `format_recipe_card`. That is the accuracy lever. Training on chat rows that *look* like cards teaches style and routing behavior; it is not permission for the 0.5B weights to invent a new lasagna from scratch at serve time.

## Retrieval

`RecipeIndex` tokenizes with light stemming (`potatoes` → `potato`), strips weak tokens (`recipe`, `cook`, `minutes`), and ranks with BM25Okapi.

If the query names a tagged main, candidates are restricted to that bucket, then ranked inside it — so “spicy chicken” prefers a jerk-style dish over alphabetical noise. Choice and card paths require a structured recipe (`ingredients_block` + `instructions`, or TheMealDB source). Local technique snippets can still feed LoRA via `format_chunks`; they do not show up as fake recipes in the button list. Free BM25 without a main gets overlap gates so random weak hits stay out of the product path.

Same lesson as [similarity is not authorization](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/) and [the nearest chunk is not “true”](/me/blog/nearest-is-not-true/): retrieval is a search. The app decides what is allowed to become a “recipe.”

## Fine-tuning

Base: `mlx-community/Qwen2.5-0.5B-Instruct-4bit`. LoRA on attention `q/k/v/o`, rank 16, ~1500 iters, `max_seq_length` 1024, `mask_prompt` so loss sits on assistant tokens. Config lives in `configs/lora_qwen05.yaml`.

**LoRA is for:** cooking tone, substitute and technique patterns, domain refusal, follow-ups grounded by injected context.

**LoRA is not for:** trustworthy full recipes with quantities.

That split is the project. Fine-tuning without the router would just make a more confident hallucinator.

## Serving choices

The UI is one HTML page: Markdown via `marked` + `DOMPurify` ([never assign model output to `innerHTML` unwashed](/me/blog/never-assign-model-output-to-innerhtml/)), choice buttons from structured `options`, starter chips, and a “Following up on: …” line. Defaults: `temp=0.4`, `max_tokens=384` for freeform turns. Recipe cards are not generation-capped because they are not generated.

I did not expose token streaming. Most good answers never hit the LM. Generation sits behind a global MLX lock for thread safety; long-lived SSE adds cancel and backpressure for little gain on a blog-demo UI. Freeform answers get a “Cooking…” wait state instead.

Prompts keep the model on cooking/baking, ask for humility on allergens / canning / medical topics, and prefer matching the question type. RAG and active-recipe blocks prepend to the user turn when used.

## Evaluation, with a caveat

`eval/cooking_eval.jsonl` has 63 hand prompts. `05_eval.py` scores base vs adapter on substitutes, staying on-topic, and safety humility. Runs land under `eval/runs/`.

The harness still drives **raw generation** for those prompts. The **product** path is `reply_to_message` — choices, cards, follow-ups. When I ask whether the app feels right, I exercise the UI or CLI with RAG on, not only the eval script. Two different questions.

## What I would click

- Give me a potatoes / chicken / pasta recipe → pick a number
- After a card: How long? / Can I swap butter for oil? / What’s step 3?
- What can I use instead of buttermilk in pancakes?
- Best way to pan-cook a steak?
- Write me a Python web scraper *(should refuse)*

## Limitations

- Freeform advice can still wander when RAG misses.
- Not a food-safety authority. Allergens and preservation schedules need real sources.
- Domain refusal is prompt + SFT behavior, not a hard filter — same class of honesty as [the model does not get `send_email`](/me/blog/the-model-does-not-get-send-email/).
- Sessions are in-memory. No auth, no multi-user store.
- TheMealDB free API key `1` is for development/education; check their terms before anything public.

## Reproduce

On Apple Silicon, roughly:

```bash
cd cuoco-piccolo
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
python scripts/07_fetch_themealdb.py
python scripts/01_prepare_data.py
python scripts/02_build_synth_qa.py
python scripts/03_train_lora.py          # or --smoke first
python scripts/06_chat_ui.py --adapter-path adapters/cuoco-piccolo-qwen05
# open http://127.0.0.1:8000
```

Skip TheMealDB with `--no-themealdb` if you only want the technique synth set — recipe coverage will be thin.

Credit [TheMealDB](https://www.themealdb.com/) for recipe names, ingredients, and instructions. Base weights are Qwen / MLX community 4-bit builds — follow their licenses. This project does not scrape modern recipe websites into weights.

## What I would keep from the build

The useful artifact is not the 0.5B adapter alone. It is the **router + RAG gate + card formatter**, with LoRA in the leftover slots where style and grounded follow-ups live. That is the same instinct as [RAG I would actually ship](/me/blog/rag-i-would-actually-ship/): put structure around the model before you ask it to sound like a cook.

Fun project. Serious enough pipeline to learn the seams.

## Sources

- Project: `cuoco-piccolo` (local portfolio repo; MLX LoRA + FastAPI UI)
- [TheMealDB](https://www.themealdb.com/)
- [Qwen2.5](https://huggingface.co/Qwen) / [mlx-community/Qwen2.5-0.5B-Instruct-4bit](https://huggingface.co/mlx-community/Qwen2.5-0.5B-Instruct-4bit)
- [MLX LM](https://github.com/ml-explore/mlx-lm)
- Related: [RAG with ACLs, citations, and a threshold](/me/blog/rag-i-would-actually-ship/), [The nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), [Never assign model output to innerHTML](/me/blog/never-assign-model-output-to-innerhtml/)
