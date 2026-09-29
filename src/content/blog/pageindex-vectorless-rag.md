---
title: "PageIndex: retrieval without the vector DB"
date: 2026-09-29
tags:
  - llm
  - retrieval
  - architecture
summary: "VectifyAI’s PageIndex builds a tree index and lets an LLM walk it. Similarity search is optional. Notes on how that sits next to the nearest-chunk RAG I’ve been writing about."
---

I’ve been writing about vector RAG as the default stack: embed chunks, cosine the question, take the nearest paragraph, hope the geometry meant relevance. My posts, [The word bank fools a retriever](/me/blog/nearest-is-not-true/) and [Similarity is not authorization](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/) still stand but leave a hole. What if you stop ranking by similarity at all?

[PageIndex](https://github.com/VectifyAI/PageIndex) (VectifyAI) is an open-source, vectorless RAG engine built around that bet. You can find more information in their Docs at [docs.pageindex.ai](https://docs.pageindex.ai/). 

## The claim in one sentence

Vector RAG retrieves what *looks like* the question. PageIndex builds a hierarchical tree of natural sections, then asks an LLM to *reason* which nodes to open. It's akin to flipping through a table of contents versus a nearest-neighbour search.

Their line is blunt: **similarity ≠ relevance**. Similarity still has it's place. Relevance is a different job.

## Two steps

1. **Index.** Generate a JSON tree for the document: titles, summaries, page ranges, child sections. Natural boundaries, not fixed 512-token windows.
2. **Retrieve.** Pass the tree (titles and summaries—small) to a chat model. The model picks node IDs. You load those sections and answer.

![Diagram titled Vectorless RAG with PageIndex: a document becomes a tree, then LLM reasoning walks a highlighted path through the tree from a query to an answer.](/me/images/blog/pageindex-vectorless-rag.webp)

*Document → tree → LLM tree search → answer. Figure from the [PageIndex GitHub README](https://github.com/VectifyAI/PageIndex) / docs cookbook art.*

No embedding model on the query path. No Pinecone/Chroma in the critical path for that document. The index is an in-context table of contents the model can navigate, including following “see Appendix G” style pointers when the text says so. This is something cosine rarely does unless you build a graph on top.

## Next to ordinary vector RAG


|               | Vector RAG                    | PageIndex                                                      |
| ------------- | ----------------------------- | -------------------------------------------------------------- |
| Index         | Vectors of chunks             | Tree of sections                                               |
| Unit          | Fixed-size chunks             | Natural sections / pages                                       |
| Retrieval     | Semantic similarity           | LLM reasoning over the tree                                    |
| Trace         | Top-k chunk IDs, often opaque | Node / page references you can audit                           |
| Query context | Mostly the query embedding    | Can include chat history and domain hints in the search prompt |


Hard chunking is the quiet damage in the left column. Mid-sentence cuts, split tables, orphaned “see above.” PageIndex’s pitch is that sections stay whole, and if a node is thin the agent can walk to a neighbour. That does not remove ACL work. It changes *which* failure you get when the wrong text is near the right words.

## Where the numbers show up

On FinanceBench (financial document QA), they report **98.7%** for a PageIndex-based system versus about **50%** for a vector RAG baseline in their chart. The gap is large enough that “tree search on filings” is worth a weekend on a real 10-K, not a shrug.

![Bar chart: FinanceBench accuracy. PageIndex 98.7 percent, Vector RAG 50 percent. Subtitle: reasoning-based retrieval, no vector database, SEC filings and earnings disclosures.](/me/images/blog/pageindex-financebench.webp)

*FinanceBench accuracy comparison from the [PageIndex README](https://github.com/VectifyAI/PageIndex). Their evaluation write-up: [Mafin2.5 / FinanceBench](https://vectify.ai/blog/Mafin2.5).*

They also publish local indexing cost (~$0.001/page with a cheap index model in their notes), query cost vs stuffing the whole PDF, and an OSS lookup benchmark. Index once; reuse the tree. Chat model quality matters more on the search step than on summarising section titles at index time. It's a practical split.

## What I would still wire myself

PageIndex swaps the retriever. It does not replace the application around it.

- **ACL before content leaves the store.** Audience filter in the app, same as [RAG with ACLs](/me/blog/rag-i-would-actually-ship/). Tree search that can see every node is still a leak if the tree spans audiences.
- **Citations.** Their design wants page/section refs. Keep that as an eval, not a hope.
- **Cost and latency.** Each tree walk is LLM calls. Fine for a long filing and a few questions. Different economics than cosine over a million FAQ chunks.
- **Corpus scale.** Per-document trees shine on long professional PDFs. Millions of tiny notes still need a way to pick *which* document first (they describe a “PageIndex File System” layer for that). Do not pretend one ToC solves a SharePoint tenancy.



## When I would reach for it

Long, structured PDFs: annual reports, manuals, bylaws with appendices, textbooks. Questions that need “look in the liabilities section” rather than “find sentences that sound like liabilities.” Follow-on turns that depend on where you already were in the report.

I would keep vector RAG (with ACLs and a threshold) for large, flat, heterogeneous corpora where approximate nearest neighbour is the right first cut. The interesting enterprise setup might be hybrid: metadata or a light vector pass to pick *documents*, PageIndex-style tree search *inside* the winners—same spirit as their multi-document notes.

## Quickstart shape

Local mode in their SDK: your LLM key, index on disk, chat model for tree search.

```python
from pageindex import PageIndexClient

client = PageIndexClient(
    index="gpt-5.6-luna",  # cheaper model OK for tree build
    chat="gpt-5.6-sol",    # stronger model for search
)
doc_id = client.submit_document("report.pdf")["doc_id"]
answer = client.chat("What was the 2023 operating margin?", doc_id=doc_id)
```

Cloud mode moves OCR and managed storage to them; chat can still use your model. MCP and agent SDK hooks are documented if you want tools instead of a chat wrapper.

## Bottom line

PageIndex is a serious attempt to treat retrieval as navigation, not vibes. That is the right diagnosis for the failures I’ve been documenting with cosine. It does not erase authorization, logging, or cost. For parks policy notes in a folder, I would still start with ACL-filtered retrieve-then-generate. For a 200-page financial statement or a fat operations manual, I would rather an agent walk a ToC than trust the nearest 800 tokens.

## Sources

- [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex) (GitHub)
- [PageIndex developer docs](https://docs.pageindex.ai/)
- [PageIndex: Next-Generation Vectorless, Reasoning-based RAG](https://pageindex.ai/blog/pageindex-intro) (intro post)
- [Mafin2.5 / FinanceBench results](https://vectify.ai/blog/Mafin2.5)
- Earlier notes: [The word bank fools a retriever](/me/blog/nearest-is-not-true/), [Similarity is not authorization](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/), [RAG with ACLs, citations, and a threshold](/me/blog/rag-i-would-actually-ship/)

