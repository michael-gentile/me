---
title: "Never assign model output to innerHTML"
date: 2026-07-23
tags:
  - llm
  - html
summary: "LLM text is untrusted the same way any other user-influenced string is. innerHTML makes the model an HTML author for your origin."
---

If you assign a completion to `innerHTML`, you turned the model into an HTML author for your origin. Same class of bug as assigning a comment field to `innerHTML`. The model is just another way untrusted text arrives.

## Two pages

A harmless string, `Hours: 7:00 to dusk.`, on both. The difference is the API.

```javascript
// do not
document.getElementById("out").innerHTML = sample

// do
document.getElementById("out").textContent = sample
```

`textContent` writes a text node. The characters `<` and `>` stay characters. `innerHTML` parses a fragment: tags, attributes, then the tree is inserted into your document. If the model ever emitted a `script` tag, an `<img onerror=...>` , or an `<a href="javascript:...">`, the unsafe page would treat that as markup for your origin. The safe page would show the characters.

The happy path looks like formatting (bold, lists, a link), which is why people miss it. A model that "knows HTML" is a model that can author HTML.

## What the parser will take

You do not need a full XSS cookbook. Three shapes are enough to remember why `innerHTML` is the wrong sink:

- A `<script>` element. Some browsers will not run a script inserted via `innerHTML`. Do not take comfort in that. The next two still fire.
- An element with an event handler attribute: `<img src=x onerror="...">`. Setting `innerHTML` creates the node and can run the handler.
- A URL that the browser will execute: `javascript:` in `href` or `src`, depending on how the node is used.

Streamed UIs make it tempting to `insertAdjacentHTML` as tokens arrive. Same parser, smaller pieces. A partial tag across two chunks is its own mess. Buffer the string, then `textContent`, or run a sanitizer on a finished string.

`innerHTML += chunk` is worse. Each assignment re-parses the whole prefix.

## Markdown is a product decision

If the pane is supposed to show headings and lists, compile markdown with a sanitizing renderer (DOMPurify after a markdown library, or a pipeline that only emits a tag allowlist). That is a deliberate HTML author with a filter. Raw HTML from a next-token model is not.

I would fail a vendor demo that does `element.innerHTML = await llm.complete(...)`. I would also fail a demo that runs markdown with the default HTML-passthrough on, then assigns the result to `innerHTML` with no sanitizer. The second one looks professional and has the same sink.

CSP (`script-src`, `default-src`) is defense in depth. It can block some inline handlers depending on the policy. It does not make `innerHTML` a safe API. A missing CSP header, a `unsafe-inline`, or a CDN the policy allows, and you are back to the parser. Write the text node first. Add CSP anyway.

## Why this keeps getting missed

Output handling is LLM05 in the OWASP catalogue, and it's older than LLMs: XSS with a new author. Chat products want rich text. The sample in the slide is `**bold**` or a table. The production string is whatever the model sampled, including whatever was in the retrieved chunk or the user's paste.

This site's blog body is markdown compiled at build time, by me, not by a model at request time. Different trust. A chat pane isn't a static site.

## Sources

- `textContent` vs `innerHTML` in the DOM
- OWASP LLM improper output handling
