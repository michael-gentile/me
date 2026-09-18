---
title: "Threat-model the chatbot first"
date: 2026-06-28
tags:
  - llm
  - architecture
summary: "A staff policy assistant: SSO, a question box, a document store, a hosted model, a future send-email button. Trust boundaries first, OWASP names as a catalogue."
---

Draw the system before you write more prompts. Same habit as any enterprise review: data flow, trust boundaries, questions at each boundary.

## The toy

A staff-facing policy assistant:

- User signs in (assume SSO exists).
- User types a question.
- The app may retrieve paragraphs from an internal document store.
- The app calls a hosted LLM API.
- The answer is shown as formatted text in the browser.
- Later, someone wants a "send this summary by email" button.

```text
user → app → document store
         → LLM API → app → user
                    → (later) email
```

Mark four boundaries: browser/app, app/docs, app/LLM vendor, app/email. Email is optional today and still belongs on the diagram, because someone will ask for the button. Draw it dashed if it is not built. If it is missing from the picture, it will show up in a sprint as "just a button."

## Questions at each boundary

Plain language, STRIDE-shaped:

- **Spoofing:** who is the user, and does the model get that identity, or just a blob of text?
- **Tampering:** can retrieved text or the user question change behaviour the app did not intend?
- **Repudiation:** do we log prompts, retrieval IDs, and answers?
- **Information disclosure:** can answers include another team's documents, or vendor texture presented as our policy?
- **Denial of service:** huge prompts, huge retrieval, cost spikes.
- **Elevation of privilege:** can the model's text cause the app to send mail or fetch more docs than the user is allowed?

Two more I would write on the whiteboard. Vendor retention: does the hosted API store prompts, and for how long, and in which region? That is information disclosure at the app/LLM boundary even when the answer pane is clean. Some vendors offer zero-retention endpoints. Ask which one you are on. Log store: prompts and retrieval IDs are now a second document store. Who can read them, and when do they expire? Repudiation wants logs. Disclosure wants them locked down. Both can be true.

## Rows I wouldn't skip

The [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/) is a control catalogue, not a CTF. Numbers shift between editions. The ideas don't.

| Idea | Where it shows up here | Control I would require |
| --- | --- | --- |
| Prompt injection | User text and retrieved docs share a token stream | Separate channels; untrusted text does not get tools |
| Sensitive info disclosure | Docs + logs + answer pane | ACL on retrieval; redaction in logs |
| Improper output handling | Rendering the answer in HTML | `textContent` or sanitized markdown |
| Excessive agency | The future send-email button | Human approval; model cannot bind `send_email` |

Gaps I wouldn't go live with: no retrieval ACL, `innerHTML` on the answer, and an email button that fires because the model said to. Vendor retention and log access sit next to those. The prompt can wait.

## Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- STRIDE as questions, not as a scorecard
