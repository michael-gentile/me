---
title: "RAG with ACLs, citations, and a threshold"
date: 2026-07-18
tags:
  - llm
  - retrieval
summary: "After the nearest-chunk failure: required ACLs, citations, a similarity threshold, per-user mapping. Residual risk includes the caller forging the audience."
---

The first retrieve-then-generate pipeline fetched HR pay dates for a recreation question because similarity doesn't know about users. This is the version I'd actually require, still tiny, still invented documents.

Order of operations, on purpose:

1. Authenticate. You already know who this is.
2. Map user → audience in the app. Alex is recreation. Sam is HR.
3. Filter the store to chunks whose metadata matches that audience. Then similarity.
4. If the best cosine is below the threshold you wrote down, return "Not in the notes." Don't call the chat model.
5. Generate with the surviving chunks and require a document id in the answer.

Similarity never runs on the whole corpus. Client-supplied `acl=hr` is never an input. If the HTTP handler forwards a query parameter into retrieve, skip this design and fix that first.

## Additions, one at a time

**Metadata ACL is required.** No `allowed_acl=None` path in the function you'd ship. If you can't name the audience, you don't retrieve.

**Citations required.** The answer must include the document id. Fail the eval if it doesn't. A fluent paragraph with no id is an ungrounded paragraph you can't audit.

**Refuse if ungrounded.** If cosine is below a threshold you pick (write the number down; it'll be wrong the first time), don't call the chat model. Return "Not in the notes." 0.75 on one embedding model isn't 0.75 on another, which is the afternoon you burn retuning after a vendor swap. A threshold of 0 is "always generate."

**Per-user mapping.** Invent two users: Alex (recreation) and Sam (HR). Map user → acl in the app that already authenticated them. Never let the client pass `acl=hr`.

Re-run payday and "is Cedar open Mondays" as both users. Alex must not see pay dates. Sam may. Monday hours still work for Alex.

```text
| Failure                    | Control              | Still possible? |
| Recreation user sees payday | ACL before similarity | If ACL is a query param, yes |
| Answer with no citation    | Eval on doc id        | If you skip the check, yes |
| Low-similarity chunk used  | Threshold, no chat    | Threshold will be wrong once |
| User string forged         | Authn in the app      | If Python trusts the caller, yes |
```

The last row is the honest one. If ACL is only checked in the retrieve function and the caller can pass `acl="hr"`, you haven't solved authorization. Authorization belongs in the app that already knows who signed in. A unit test that calls `retrieve(question, acl="hr")` will look green and still be the production bug.

## Residual risk

You can still retrieve the wrong recreation paragraph. You can still refuse a question that a human would answer from Harbour's hours. You can still log questions that are sensitive. What I'd write down is narrower: recreation users can't retrieve HR chunks, answers cite an id, and low scores don't call the model.

## Sources

- Retrieve-then-generate with required audience metadata
- Citations and thresholds as eval-backed product rules
