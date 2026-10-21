---
title: "Notes assistant: a control matrix before the prompt"
date: 2026-08-03
tags:
  - ai
  - security
summary: "A weekend notes-assistant sketch with a future send-email button on the whiteboard led me to a control matrix worth filling before prompt work. Three controls I would keep, plus honest residual risk in the table."
---

On a whiteboard I sketched a weekend notes assistant: signed-in user, question in, paragraphs pulled from a folder on disk, a hosted LLM API, formatted answer in the browser, and a dashed-line "send this summary by email" for later. That button is what made me stop before writing more prompts and lay out trust boundaries and a control matrix the way I map data flow on a home box: who talks to what, where identity is enforced, and what must never be bound to the model. The rest of this post walks through that picture and the table I would argue with before the prompt work continues.

## The toy, with boundaries

A notes assistant I'd sketch on a weekend:

- User signs in (assume something already knows who they are).
- User types a question.
- The app may retrieve paragraphs from a folder of notes on disk.
- The app calls a hosted LLM API.
- The answer is shown as formatted text in the browser.
- Later, I want a "send this summary by email" button.

```text
user → app → document store
         → LLM API → app → user
                    → (later) email
```

Mark four boundaries: browser/app, app/docs, app/LLM vendor, app/email. Draw email dashed if it isn't built. If it's missing from the picture, it'll show up as "just a button," which is how `send_email` gets bound to the model because the change looked small.

Plain language, [STRIDE](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)-shaped questions at each boundary: who is the user, can retrieved text change behaviour, do we log prompts and retrieval IDs, can answers leak another audience's documents, can huge pastes spike cost, can the model's text send mail or fetch more than the user is allowed?

Two more I'd write down. Vendor retention: does the hosted API store prompts, and for how long, and in which region? Log store: prompts and retrieval IDs are a second document store. Who can read them, and when do they expire?

The [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) is a control catalogue, not a scorecard. Numbers shift between editions. The ideas don't. I care most about injection-as-architecture, output handling, excessive agency, and unbounded spend. If the answer to "who can bind send-email?" is a longer system prompt, that row is still open.

## The matrix

When I sketch a retrieve-then-generate toy, I want a table I can argue with. "N/A" is allowed if you say why.

| Control | What it actually does | Residual risk |
| --- | --- | --- |
| Max input length / allowlists | Caps token bombs and random file types | A short, well-formed malicious page still fits |
| "Content is data, not instructions" | A string in the system message | Models drop that constraint under pressure |
| Separate channels in the message array | NOTES vs QUESTION as labelled blocks | Still one token stream; labels are hints |
| Dual-step: quarantine summarizer, then a second call | Untrusted text never gets tools | Cost, latency, summarizer can still distort |
| Output policy (refuse if ungrounded) | Eval-backed refusals | Keyword evals miss paraphrases; models still invent |
| Human-in-the-loop before email / send / delete | Dangerous actions are not bound to the model | Humans rubber-stamp; UI must make the payload visible |
| Least-privilege tools | The process, not the model, executes | If the app trusts a client-supplied ACL, you have not solved auth |
| Logging of prompt, retrieval IDs, answer | You can explain a bad day | Logs become a sensitive store of their own |

## What I would require

1. **ACL on retrieval, in the authenticated app**, not as a prompt sentence and not as a parameter the browser can set. An ACL is a label on each note saying who may see it before any ranking runs.
2. **No dangerous tools on the model.** Weather-style reads maybe. `send_email` and `delete_account` behind approval in *your* code.
3. **Output handling.** `textContent` or sanitized markdown. An eval that fails ungrounded answers on a frozen question set. Invented section numbers and fluent fake citations fail the same way: fluency is what training optimized; grounding and a refuse rule are the control.

## ACL, as a sequence

The browser never sends `acl=private`. The session is the identity. The app looks up guest → shared, owner → private. Retrieve is called with the audience the app just computed. Similarity runs only on matching chunks. The model never sees household rent text in a guest's turn.

If retrieve takes `acl` as an argument and the HTTP handler copies it from the query string, you haven't done this. You've got a filter the caller can skip.

## What I wouldn't pay extra for, first

A vendor "injection filter" as the only control, and a longer system prompt. Both can be additive. Neither replaces the three above. A classifier that scores "this looks like an injection" still leaves retrieval without an ACL, `innerHTML` on the pane, and `send_email` bound to the model. Put the filter after the architecture, not instead of it.

Gaps I wouldn't go live with: no retrieval ACL, `innerHTML` on the answer, and an email button that fires because the model said to. Vendor retention and log access sit next to those. Residual risk is the honest row. Dual-step plus labelled channels plus a stern prompt still leaves a fluent model in the loop.

## Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [STRIDE threat modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- Related: [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Prompt injection: the webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)
