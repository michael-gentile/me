---
title: "OWASP LLM Top 10 as a review checklist"
date: 2026-08-08
tags:
  - llm
  - architecture
summary: "Notes against the OWASP list: one sentence of meaning, where it shows up in an enterprise assistant, the control I would require."
---

The acronyms used to freeze me in a vendor review. I'd sit there mapping LLM01 to a slide while the actual question was "who can bind send-email." The source is the [OWASP Top 10 for Large Language Model Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/). Numbers move between editions. If a row has been renamed, keep the idea and ask for the control anyway.

## The table I would bring

Invented enterprise assistant, not a particular employer. One sentence each.

| Idea | Meaning | Where it shows up | Control I would require |
| --- | --- | --- | --- |
| Prompt injection | Untrusted tokens change behaviour | User text and retrieved docs in one stream | Channels, quarantine, no tools on untrusted text |
| Sensitive information disclosure | Secrets in answers, logs, or prompts | Doc store, conversation log, pane | ACL, retention, redaction |
| Supply chain | Models, plugins, datasets you did not write | Vendor model, embedding service, prompt packs | Pin versions, know who trains what |
| Data / model poisoning | Bad data in training or in *your* index | Uploaded PDFs, ticket dumps in a vector store | Review what gets embedded |
| Improper output handling | Model text executed as code or markup | Chat pane, "copy to page" | `textContent` or sanitize |
| Excessive agency | Model text becomes a command | Email, delete, ticket-close | Least privilege, human approval |
| System prompt leakage | Hidden instructions end up in the answer | "Repeat your rules" | Do not put secrets in the system prompt |
| Vector / embedding weaknesses | Nearest ≠ true, nearest ≠ allowed | RAG over mixed corpora | Metadata ACL, thresholds, citations |
| Misinformation | Fluent falsehoods | Citations, hours, legal how-tos | Grounding, evals, UI that is not an oracle |
| Unbounded consumption | Tokens and dollars without a ceiling | Huge pastes, retry loops | Caps, quotas, timeouts |

## How I would use it

I wouldn't score a vendor against this table. I'd use it as procurement language: "Show me where retrieval ACL is enforced." "Show me the render path." "Show me who can bind send-email." If they answer with a longer system prompt, that row is still open.

I care most about injection-as-architecture, output handling, excessive agency, and unbounded spend. Misinformation is a product problem with evals. You don't buy a filter once and call that row closed.

## Three questions I would actually ask

**Prompt injection.** Show me the message array for a turn that retrieved a document. Where is the user text, where is the chunk, where are the tools? If those are one concatenated string, the row is open. If untrusted text can still trigger `send_email`, the row is open.

**Improper output handling.** Show me the render path. `textContent`, sanitized markdown, or `innerHTML`? Streamed HTML is still HTML. A CSP header is extra, not the control.

**Unbounded consumption.** What's the max prompt size, max retrieval chunks, max retries, and the dollar cap per user per day? A paste of a 200-page PDF plus a retry loop is a bill. Timeouts without a quota still let the next request in.

## Sources

- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
