---
title: "Notes assistant: a control matrix before the prompt"
date: 2026-08-03
tags:
  - ai
  - security
summary: "A weekend notes-assistant sketch with a future send-email button on the whiteboard led me to a control matrix worth filling before prompt work. Three controls I would keep, plus honest residual risk in the table."
---

The trade-off every retrieve-then-generate sketch faces is speed versus boundaries: it is faster to write a system prompt and ship, and slower to draw who may read which file, where dangerous actions live, and what the model must never bind. We hit that wall on a whiteboard weekend project—a signed-in user, a question, paragraphs from a folder on disk, a hosted LLM API, formatted text in the browser, and a dashed-line “send this summary by email” for later. That dashed button is what stopped the prompt work. Until the trust picture looked like a home-box data-flow map—browser to app, app to docs, app to vendor, app to mail—we were one small PR away from `send_email` on the model because the change looked innocent.

Below: the toy with its boundaries, STRIDE-shaped questions at each edge, a matrix we can argue with, three controls we would not go live without, ACL as a sequence in the app, and what we would not treat as architecture.

## The toy, with boundaries drawn first

Picture the flow before any retrieval code exists:

- User signs in (something upstream already knows who they are).
- User types a question.
- The app may retrieve paragraphs from a notes folder on disk.
- The app calls a hosted LLM API.
- The answer renders as formatted text in the browser.
- Later: a “send this summary by email” button.

```text
user → app → document store
         → LLM API → app → user
                    → (later) email
```

Mark four boundaries: browser/app, app/docs, app/LLM vendor, app/email. Draw email dashed if it is not built. When email is missing from the diagram, it still shows up in production as “just a button”—and that is how tool schemas grow.

At each boundary, plain-language questions in a [STRIDE](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats) shape: who is the user, can retrieved text change behaviour, do we log prompts and retrieval IDs, can answers leak another audience’s documents, can huge pastes spike cost, can model text trigger mail or fetches the user is not allowed?

Two more rows belong on the whiteboard. **Vendor retention:** does the hosted API store prompts, for how long, in which region? **Log store:** prompts and retrieval IDs are a second document corpus. Who can read them, and when do they expire?

The [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) is a control catalogue, not a scorecard. Edition numbers move; the ideas do not. We care most about injection-as-architecture, output handling, excessive agency, and unbounded spend. If the answer to “who can bind send-email?” is a longer system prompt, that row is still open.

## A matrix you can argue with

When we sketch retrieve-then-generate toys, we want a table where “N/A” is allowed if the reason is written down.

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

## Three controls we would require

1. **ACL on retrieval, in the authenticated app**—not a prompt sentence, not a parameter the browser sets. Each note carries a label for who may see it before any ranking runs.
2. **No dangerous tools on the model.** Weather-style reads maybe. `send_email` and `delete_account` sit behind approval in *your* code.
3. **Output handling.** `textContent` or sanitized markdown. An eval that fails ungrounded answers on a frozen question set. Invented section numbers and fluent fake citations fail the same way: fluency is what training optimized; grounding and a refuse rule are the control.

## ACL enforced as a sequence, not a query param

The browser never sends `acl=private`. The session is the identity. The app maps guest → shared, owner → private. Retrieve runs with the audience the app just computed. Similarity runs only on matching chunks. The model never sees household rent text on a guest turn.

If retrieve accepts `acl` from the query string and the HTTP handler copies it through, we have not done this—we have a filter the caller can skip.

## What we would not pay for first

A vendor “injection filter” as the only control, and a longer system prompt. Both can be additive. Neither replaces the three above. A classifier that scores “this looks like an injection” still leaves retrieval without an ACL, `innerHTML` on the pane, and `send_email` bound to the model. Put the filter after the architecture, not instead of it.

Gaps we would not go live with: no retrieval ACL, `innerHTML` on the answer, and an email button that fires because the model said to. Vendor retention and log access sit beside those. Residual risk stays an honest column. Dual-step plus labelled channels plus a stern prompt still leaves a fluent model in the loop.

## Smoke tests before prompt tuning

Prompt work is cheap to iterate and expensive to trust. These checks run against a stub or staging build with fake notes on disk—they do not need a polished UI, but they must hit the real retrieval and render paths.

**ACL bypass attempt.** Sign in as guest, ask a question whose only honest answer requires a note tagged `owner`. The retrieval layer should return zero private chunks; the model must not quote rent or account numbers even if the user pastes “ignore previous instructions.” Repeat with `?acl=private` or a forged header if the API ever accepted client hints—it should not change the audience the app computes from the session.

**Tool binding.** Enable a mock `send_email` handler that logs payloads but never sends. Prompt the model aggressively to “email this summary now.” The log should stay empty unless a human clicks approve (or the tool is not registered on the model at all). If the handler fires from model text alone, the architecture row for “no dangerous tools” is still open.

**Output handling.** Feed a frozen adversarial answer that includes `<img onerror=...>` and a fake `[doc-12]` citation. The pane should show escaped text or sanitized markdown, not executable HTML. Run the ungrounded eval on the same frozen set after each model upgrade; a passing keyword eval with failing grounding is still a fail.

**Spend cap.** Send an oversized paste at the app’s max-input boundary and one byte over. The over-limit request should fail before the vendor API call; the at-limit request should log token counts you can reconcile with the bill.

Record pass/fail in the matrix’s residual column. Prompt tweaks come after these gates stay green—not instead of them.

## Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [STRIDE threat modeling](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats)
- Related: [Tool calling: the model does not get send_email](/me/blog/the-model-does-not-get-send-email/), [Prompt injection: the webpage is untrusted input](/me/blog/the-webpage-is-untrusted-input/), [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)
