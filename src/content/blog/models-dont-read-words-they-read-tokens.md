---
title: "Models don't read words. They read tokens."
date: 2026-05-21
tags:
  - llm
  - tokens
summary: "The same sentences through two tokenizers, and why word-count limits are the wrong unit for cost, context, and input size."
---

Chat products talk about prompts as if the model were reading English. The real interface is a list of integer IDs. Same text, two encodings, visible splits.

## Two encodings

A short Python script encodes the same samples with:

- tiktoken `cl100k_base`: the OpenAI GPT-3.5 / GPT-4 family encoding
- Hugging Face GPT-2: an older byte-pair vocabulary, useful as a contrast

Invented sentences, plus a line of JavaScript, a public Ontario URL, French, and messy whitespace. Nothing from a real inbox.

| Sample | Words (split) | cl100k | GPT-2 |
| --- | ---: | ---: | ---: |
| "The bylaw requires a permit before you alter the shoreline." | 10 | 12 | 13 |
| `tokenization vs token+ization` | 3 | 6 | 6 |
| One line of JavaScript | 8 | 13 | 17 |
| `https://www.ontario.ca/page/conservation-authorities` | 1 | 13 | 16 |
| "La municipalité doit protéger les renseignements personnels." | 7 | 15 | 16 |

A concatenated prompt of the English sentence + the code + the URL was **20 whitespace-split words** and **38 cl100k tokens**. Using a published GPT-4o-mini-style list price ($0.15 / 1M input, $0.60 / 1M output) and a 400-token completion, that one call is about **$0.00025**. The dollar amount is deliberately boring. The multiply is the lesson: **tokens × price**, not words × price.

## What the splits look like

`bylaw` isn't one token. Both vocabularies emit `by` + `law`. GPT-2 also split `shoreline` into `shore` + `line`; `cl100k_base` kept it whole. Domain jargon that is rare on the open web costs extra pieces.

The word `tokenization` is already two tokens (`token` + `ization`) even without the `token+ization` trick. The model never sees the word I typed. It sees pieces that happen to reconstruct it.

Code and URLs explode. `handleSubmit` is one token in `cl100k_base` and three in GPT-2. A single Ontario.ca URL was 13–16 tokens. Paste a stack trace or a CDN link into a "short" prompt and you've already spent a paragraph of budget.

French paid an accent tax. `municipalité` and `protéger` fractured around `é`. A bilingual paragraph isn't "the same length" as its English counterpart once it hits a mostly-English tokenizer.

Whitespace is data. Extra spaces and blank lines became their own tokens. GPT-2 spent a token on *each* extra space; `cl100k_base` packed the run into one. Copy-paste from Word and "pretty" JSON both change the bill.

Token IDs are just integers (`law` was `20510` in cl100k and `6270` in GPT-2). There's no shared universal ID space. Counts are meaningless across vendors unless you say which encoding you used.

## The unit you actually have

Limits written in **words** or **characters** ("prompts shall not exceed 2,000 words," "log the last 500 characters") are the wrong unit.

- Context windows are token windows. A "small" chunk full of URLs and tables can crowd out the prose you meant to keep.
- Cost and rate limits are token-shaped. A bilingual, URL-heavy transcript is more expensive than a word count suggests.
- Length filters that count characters miss token bombs: minified code, encoded blobs, non-English text. If you need a limit, enforce it with the **same tokenizer the model uses**.
- Logs and evals should record tokens in and out. Otherwise you cannot explain an invoice or a truncated answer.

```python
import tiktoken

enc = tiktoken.get_encoding("cl100k_base")
print(len(enc.encode("The bylaw requires a permit.")))
print(enc.decode_tokens_bytes(enc.encode("bylaw")))
```

## Sources

- [tiktoken](https://github.com/openai/tiktoken) (`cl100k_base`)
- [Hugging Face tokenizers](https://huggingface.co/docs/tokenizers) with the [GPT-2](https://huggingface.co/gpt2) vocabulary
