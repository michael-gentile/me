---
title: "Vector RAG: the nearest chunk is not the allowed chunk"
date: 2026-07-13
tags:
  - ai
  - security
summary: "I kept seeing retrieve-then-generate pipelines return the closest embedding neighbor that was wrong, out of date, or private; this post is the ACL-before-similarity and citation checks I would ship first."
---

The trade-off every embedding retriever hides is geometry versus permission: cosine similarity answers “which direction is closest?” not “which paragraph is true?” and not “which file may this caller read?” We kept seeing both failures in the same laptop-sized notebook—paraphrase clusters and “bank” false friends on one side, guest sessions pulling household rent on the other. Below: nearest is not true, nearest is not allowed, and the order of operations we would actually ship.

## Nearest is not true

Embeddings are geometry. Paraphrases of the same rule cluster, and the word “bank” clusters too, so a retriever fetches the wrong paragraph without anyone hacking anything.

Some sentences are paraphrases of a remote-work rule. Some use “bank” in different senses. Some are unrelated.

1. Staff may work from home two days a week.
2. Employees can telework a couple of days each week.
3. Remote work is limited to two days per week.
4. The river bank flooded after the storm.
5. The bank approved a small business loan.
6. Please reset the user password.
7. The park closes at dusk.
8. I deposited cash at the bank this morning.
9. Telecommuting two days weekly is allowed.
10. The shoreline path is closed for repairs.

Embed each one. Cosine similarity of 1.00 means identical direction.

- **Paraphrase-similar:** (1), (2), (3), (9) should score high with each other.
- **False friend:** (4), (5), (8) share “bank” and will often sit closer than they deserve.
- **Unrelated:** (6) and (7) should sit low against the work-from-home cluster.

If a retriever used this space, which wrong chunk would it fetch for “Can I work from home?” A shoreline closure and a remote-work rule can share outdoor-ish vocabulary, and “bank” can win against the wrong bank.

```python
def cosine(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    return dot / ((sum(a * a for a in left) ** 0.5) * (sum(b * b for b in right) ** 0.5))
```

The model name matters. `text-embedding-3-small` and `nomic-embed-text` will not print the same matrix. Record which one you used, and do not compare scores across vendors. Cosine is `dot(a, b) / (||a|| ||b||)`. Retrievers usually store L2-normalized embeddings so cosine collapses to a dot product. The geometry still has no idea that river-bank and lender-bank are different words in English.

A 4×4 slice, invented, so the shape is visible:

|  | wfh | river bank | lender | dusk |
| --- | ---: | ---: | ---: | ---: |
| wfh | 1.00 | 0.11 | 0.08 | 0.14 |
| river bank | 0.11 | 1.00 | 0.62 | 0.21 |
| lender | 0.08 | 0.62 | 1.00 | 0.09 |
| dusk | 0.14 | 0.21 | 0.09 | 1.00 |

The 0.62 between river bank and lender is the false friend. Closest is not allowed, current, or the chunk a human would pick. Lexical overlap is a feature of the geometry. A better embedding makes nearest sharper; it still does not know who the caller is.

## Nearest is not allowed

Picture two files on disk.

**Shared (`kitchen.md`).** Sourdough starter gets fed every Sunday. Fridge inventory day is Saturday. Nothing secret.

**Private (`household.md`).** Rent is due on the 1st. Only the owner may quote that date.

An ACL is a label on each note saying who may see it: `shared` or `private`. Similarity that never reads that label will leak.

| Question | Filter | What should happen |
| --- | --- | --- |
| When is rent due? | none | Household note wins on similarity. That's the bug if this is a shared kitchen assistant. |
| Do I feed the starter on Sundays? | none | Kitchen note should win. |
| When is rent due? | shared only | Household is not in the corpus. Say it is not in the notes. |
| Do I feed the starter on Sundays? | shared only | Same kitchen answer as before. |

```python
corpus = [doc for doc in docs if allowed is None or doc["acl"] == allowed]
q_vec = embed([question])[0]
ranked = sorted(corpus, key=lambda doc: cosine(q_vec, embed([doc["text"]])[0]), reverse=True)
top = ranked[0]
```

Drop disallowed notes *before* similarity. Do not retrieve everything and hope the model refuses, and do not put “do not mention rent” in the system prompt and call it access control.

Two filters, both required:

- **Nearest:** which chunk is about this question?
- **Allowed:** which chunks is this caller allowed to see?

## Order of operations we would ship

1. Authenticate. You already know who this is.
2. Map user → audience in the app. Guest is `shared`. Owner is `private`.
3. Filter the store to chunks whose metadata matches that audience. Then similarity.
4. If the best cosine is below a threshold you wrote down, return “Not in the notes.” Do not call the chat model.
5. Generate with the surviving chunks and require a document id in the answer.

**Metadata ACL is required.** No `allowed_acl=None` path in the function you would ship. Client-supplied `acl=private` is never an input.

**Citations required.** Fail the eval if the answer has no document id. A fluent paragraph with no id is ungrounded.

**Refuse if ungrounded.** Write the threshold down; it will be wrong the first time. 0.75 on one embedding model is not 0.75 on another. A threshold of 0 is “always generate.”

```text
| Failure                    | Control              | Still possible? |
| Guest sees rent            | ACL before similarity | If ACL is a query param, yes |
| Answer with no citation    | Eval on doc id        | If you skip the check, yes |
| Low-similarity chunk used  | Threshold, no chat    | Threshold will be wrong once |
| User string forged         | Authn in the app      | If Python trusts the caller, yes |
```

If ACL is only checked in retrieve and the caller can pass `acl="private"`, you have not solved authorization. A unit test that calls `retrieve(question, acl="private")` will look green and still be the production bug.

You can still retrieve the wrong kitchen paragraph. You can still refuse a question a human would answer. You can still log sensitive questions. What we would write down is narrower: guests cannot retrieve private chunks, answers cite an id, and low scores do not call the model. Log which id was retrieved, the score, and the ACL that was applied. If you cannot point at those three for a bad answer, you cannot tell retrieval failure from generation failure.

## Sources

- [OpenAI embeddings](https://platform.openai.com/docs/guides/embeddings)
- [LangChain: Q&A with RAG](https://python.langchain.com/docs/tutorials/rag/)
- [OWASP LLM Top 10 — Sensitive Information Disclosure](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- Related: [Policy CLI: a tiny assistant I would actually sketch](/me/blog/a-tiny-policy-assistant-i-would-actually-sketch/)
