---
title: "PageIndex: retrieval without the vector DB"
date: 2026-09-29
tags:
  - ai
summary: "VectifyAI PageIndex builds a hierarchical tree index and uses an LLM to walk it for retrieval, without embedding search on the query path. How that compares to vector RAG and the nearest-chunk problems I have written about elsewhere."
---

On financial document QA, a vector RAG baseline can land near **50%** accuracy while a tree-walking retriever reports **98.7%** on the same benchmark—a gap wide enough that “nearest chunk” stops looking like a rounding error and starts looking like the wrong abstraction. [PageIndex](https://github.com/VectifyAI/PageIndex) from VectifyAI is an open-source vectorless RAG engine: it indexes documents as a tree of natural sections and uses an LLM to reason over that tree at query time instead of ranking fixed chunks by cosine similarity. Vector RAG remains the default stack—embed chunks, cosine the question, take the nearest paragraph, and hope the geometry meant relevance—but what if retrieval stops ranking by similarity at all?

Picture an analyst with a 200-page 10-K and a question about operating margin in a specific year. Vector search returns paragraphs that *sound* like the question; the liability note and the margin table may never meet in the same chunk window. PageIndex’s bet is navigation: build a table of contents the model can walk, open the liabilities section when the question demands it, follow “see Appendix G” when the text says so. Developer docs live at [docs.pageindex.ai](https://docs.pageindex.ai/).

## Similarity is not relevance

Vector RAG retrieves what *looks like* the question. PageIndex builds a hierarchical tree of natural sections, then asks an LLM to *reason* which nodes to open—closer to flipping through a table of contents than running a nearest-neighbour search.

Their line is blunt: **similarity ≠ relevance**. Similarity still has its place; relevance is a different job.

## Index once, walk at query time

1. **Index.** Generate a JSON tree for the document: titles, summaries, page ranges, child sections. Natural boundaries, not fixed 512-token windows.
2. **Retrieve.** Pass the tree (titles and summaries—small) to a chat model. The model picks node IDs. Load those sections and answer.

![Diagram titled Vectorless RAG with PageIndex: a document becomes a tree, then LLM reasoning walks a highlighted path through the tree from a query to an answer.](/me/images/blog/pageindex-vectorless-rag.webp)

*Document → tree → LLM tree search → answer. Figure from the [PageIndex GitHub README](https://github.com/VectifyAI/PageIndex) / docs cookbook art.*

No embedding model sits on the query path, and Pinecone or Chroma are not in the critical path for that document. The index is an in-context table of contents the model can navigate, including cross-reference pointers cosine rarely follows unless a graph sits on top. **Embeddings** here would map text chunks to fixed-length vectors so “near” in vector space approximates “similar wording”; PageIndex deliberately skips that step at query time and lets the chat model choose sections by title and summary instead.

## How that differs from ordinary vector RAG


|               | Vector RAG                    | PageIndex                                                      |
| ------------- | ----------------------------- | -------------------------------------------------------------- |
| Index         | Vectors of chunks             | Tree of sections                                               |
| Unit          | Fixed-size chunks             | Natural sections / pages                                       |
| Retrieval     | Semantic similarity           | LLM reasoning over the tree                                    |
| Trace         | Top-k chunk IDs, often opaque | Node / page references you can audit                           |
| Query context | Mostly the query embedding    | Can include chat history and domain hints in the search prompt |


Hard chunking is the quiet damage in the left column: mid-sentence cuts, split tables, orphaned “see above.” PageIndex’s pitch is that sections stay whole, and if a node is thin the agent can walk to a neighbour. That does not remove ACL work; it changes *which* failure appears when the wrong text is near the right words.

## Where the numbers show up

On FinanceBench (financial document QA), they report **98.7%** for a PageIndex-based system versus about **50%** for a vector RAG baseline in their chart. The gap is large enough that “tree search on filings” is worth a weekend on a real 10-K, not a shrug.

![Bar chart: FinanceBench accuracy. PageIndex 98.7 percent, Vector RAG 50 percent. Subtitle: reasoning-based retrieval, no vector database, SEC filings and earnings disclosures.](/me/images/blog/pageindex-financebench.webp)

*FinanceBench accuracy comparison from the [PageIndex README](https://github.com/VectifyAI/PageIndex). Their evaluation write-up: [Mafin2.5 / FinanceBench](https://vectify.ai/blog/Mafin2.5).*

They also publish local indexing cost (~$0.001/page with a cheap index model in their notes), query cost versus stuffing the whole PDF, and an OSS lookup benchmark. Index once and reuse the tree; chat model quality matters more on the search step than on summarising section titles at index time, which is a practical split.

## What still sits outside the retriever

PageIndex swaps the retriever; it does not replace the application around it.

- **ACL before content leaves the store.** Audience filter in the app still applies. Tree search that can see every node is still a leak if the tree spans audiences.
- **Citations.** Their design wants page/section refs. Keep that as an eval, not a hope.
- **Cost and latency.** Each tree walk is LLM calls. Fine for a long filing and a few questions; different economics than cosine over a million FAQ chunks.
- **Corpus scale.** Per-document trees shine on long professional PDFs. Millions of tiny notes still need a way to pick *which* document first (they describe a “PageIndex File System” layer for that). One table of contents does not solve a SharePoint tenancy by itself.

## When tree search beats cosine

Long, structured PDFs fit best: annual reports, manuals, handbooks with appendices, textbooks. Questions that need “look in the liabilities section” rather than “find sentences that sound like liabilities,” and follow-on turns that depend on where the session already was in the report.

Large, flat, heterogeneous corpora still want approximate nearest neighbour as a first cut—often with ACLs and a similarity threshold on the vector pass. A hybrid that uses metadata or a light vector pass to pick *documents*, then PageIndex-style tree search *inside* the winners, matches their multi-document notes.

## What I’d wire: local SDK shape

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

Cloud mode moves OCR and managed storage to them; chat can still use your model. MCP and agent SDK hooks are documented if tools beat a chat wrapper.

## Limits and what’s next

PageIndex treats retrieval as navigation—the right diagnosis for many cosine failures on long structured PDFs. It does not erase authorization, logging, or cost. A small folder of kitchen notes still fits ACL-filtered retrieve-then-generate; a fat operations manual is where walking a ToC beats trusting the nearest 800 tokens. Index one real filing, compare answers and citations against your current vector pipeline, then decide whether the LLM walk belongs in production or only on the document types that hurt today.

## Sources

- [VectifyAI/PageIndex](https://github.com/VectifyAI/PageIndex) (GitHub)
- [PageIndex developer docs](https://docs.pageindex.ai/)
- [PageIndex: Next-Generation Vectorless, Reasoning-based RAG](https://pageindex.ai/blog/pageindex-intro) (intro post)
- [Mafin2.5 / FinanceBench results](https://vectify.ai/blog/Mafin2.5)
- Related: [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)
