---
title: "Similarity is not authorization"
date: 2026-07-13
tags:
  - llm
  - retrieval
summary: "A tiny retrieve-then-generate pipeline over two notes. Similarity will fetch HR for a recreation question. Authorization is a second filter."
---

Retrieve-then-generate is a search problem glued to a completion problem. Embed the question, embed the notes, take the nearest note, ask the model to answer from that note. The first version of that pipeline has an authorization bug even when the embedding is "right."

I built the smallest version that still shows it.

## Two notes

**Recreation.** Three indoor pools. Cedar is closed Mondays. Harbour is open daily including Mondays. Ridge is closed for construction. Admission prices.

**HR.** Staff pay dates are the 15th and the last business day of the month. Only HR may quote pay dates. The file says, in so many words, that it isn't a recreation policy.

Four questions, two modes:

| Question | Filter | What should happen |
| --- | --- | --- |
| When is staff payday? | none | HR note wins on similarity. That's the bug if this is a recreation assistant. |
| Is Cedar Pool open Mondays? | none | Recreation note should win. Retrieval can still work. |
| When is staff payday? | recreation only | HR is not in the corpus. The model should say it is not in the notes. |
| Is Cedar Pool open Mondays? | recreation only | Same recreation answer as before. |

The cosine step doesn't know about users. It knows vectors. "Staff payday" is closer to the payroll paragraph than to pool hours. A recreation chatbot that answers from `hr.md` leaked a document, not a clever prompt.

```python
corpus = [doc for doc in docs if allowed is None or doc["acl"] == allowed]
q_vec = embed([question])[0]
ranked = sorted(corpus, key=lambda doc: cosine(q_vec, embed([doc["text"]])[0]), reverse=True)
top = ranked[0]
```

The ACL line is the whole fix in this toy: drop disallowed notes *before* similarity. Don't retrieve everything and hope the model refuses. Don't put "do not mention payroll" in the system prompt and call it access control.

## Two filters

- **Nearest:** which chunk is about this question?
- **Allowed:** which chunks is this caller allowed to see?

Those aren't the same score. A better embedding makes the first filter sharper. It doesn't implement the second.

Other failure modes sit next to this one and are worth an eval row each:

- Wrong chunk: recreation question, HR retrieved (the no-ACL case)
- Ungrounded answer: question in neither note, model invents hours anyway
- Cross-doc leak: recreation user, HR fact in the completion

The generation prompt I used is strict on purpose: answer only from the retrieved notes; if they don't contain the answer, say so; cite the document id. That's output policy. If HR was retrieved, a dutiful model will quote the pay dates and cite `hr`.

## What to build first

Metadata on every chunk (system, audience, document id). Filter by audience, then rank. Log which id was retrieved, the score, and the ACL that was applied. If you cannot point at those three fields for a bad answer, you cannot tell retrieval failure from generation failure.

Similarity is a search index. Authorization is still authorization.

## Sources

- Retrieve-then-generate as two stages with two failure modes
- Access control on the corpus, not in the prompt
