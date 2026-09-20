---
title: "The word bank fools a retriever"
date: 2026-05-24
tags:
  - llm
  - retrieval
summary: "Embeddings are geometry. Paraphrases cluster. The word bank also clusters. A retriever will fetch the wrong paragraph without anyone hacking anything."
---

Later retrieve-then-generate systems decide "this chunk is about the question" with vectors. That's geometry. Ten sentences, a cosine matrix, a false friend, and the comedy version is a staff member asking "Can I work from home?" and getting a shoreline closure because both sentences sound outdoorsy.

## Ten sentences

Some are paraphrases of a remote-work rule. Some use the word "bank" in different senses. Some are unrelated.

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

Embed each one. Cosine similarity of 1.00 means identical direction. You don't need the full matrix to know what to look for:

- **Paraphrase-similar:** (1), (2), (3), (9) should score high with each other. Different words, same rule.
- **False friend:** (4), (5), (8) share "bank" and will often sit closer than they deserve. River bank isn't a lender.
- **Unrelated:** (6) and (7) should sit low against the work-from-home cluster.

The question to take away: if a retriever used this space, which wrong chunk would it fetch for "Can I work from home?" A shoreline closure and a remote-work rule can share outdoor-ish vocabulary. A password-reset sentence shouldn't win. "Bank" will win against the wrong bank.

```python
def cosine(left, right):
    dot = sum(a * b for a, b in zip(left, right))
    return dot / ((sum(a * a for a in left) ** 0.5) * (sum(b * b for b in right) ** 0.5))
```

The model name matters. `text-embedding-3-small` and `nomic-embed-text` won't print the same matrix. Record which one you used. Don't compare scores across vendors.

Cosine is `dot(a, b) / (||a|| ||b||)`. Two vectors pointing the same way score 1. Opposite ways, -1. Orthogonal, 0. Retrievers usually store L2-normalized embeddings so cosine collapses to a dot product, which is why "nearest" is a cheap sort. The geometry still has no idea that river-bank and lender-bank are different words in English. They co-occur with overlapping contexts in the crawl, so their vectors sit closer than a human would put them.

A 4×4 slice, invented, so the shape is visible. Not a real model. I made these numbers up so you can see the 0.62 without waiting on an API.

|  | wfh | river bank | lender | dusk |
| --- | ---: | ---: | ---: | ---: |
| wfh | 1.00 | 0.11 | 0.08 | 0.14 |
| river bank | 0.11 | 1.00 | 0.62 | 0.21 |
| lender | 0.08 | 0.62 | 1.00 | 0.09 |
| dusk | 0.14 | 0.21 | 0.09 | 1.00 |

The 0.62 between river bank and lender is the false friend. A question about "the bank's hours" can fetch the shoreline chunk. Write the embedding model id next to that table when you fill it for real.

## What a retriever actually does

It's asking which stored vector is closest to this question vector. Closest isn't allowed, current, or the chunk a human would pick. Lexical overlap is a feature of the geometry.

That's why a later retrieve-then-generate pipeline needs a second filter (audience, system, document id) *before* similarity. A better embedding makes nearest sharper. It still doesn't know that Alex is recreation-only.

## Sources

- Cosine similarity on embedding vectors as a retrieval score
- "Bank" as the textbook polysemy example, because it keeps showing up
