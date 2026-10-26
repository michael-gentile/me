---
title: "LEANN: 97% less vector storage on a laptop"
date: 2026-10-26
tags:
  - ai
summary: "LEANN keeps ANN retrieval but stores a pruned graph and recomputes embeddings on the search path—email-scale corpora shrink from gigabytes to tens of megabytes without giving up FAISS-class recall."
---

The ceiling for local RAG is often disk, not model quality: a laptop can run a small embedding model and a chat LLM offline, but a traditional HNSW index wants every float32 vector on disk and in RAM. On a 76 GB Wikipedia-scale text store, a paper baseline of HNSW sits around **188 GB** for vectors plus graph while answering a QA task at **25.5%** accuracy; [LEANN](https://github.com/StarTrail-org/LEANN) reports the **same 25.5%** at about **4 GB** of index storage, with search slower and end-to-end only about **10%** worse because generation still dominates ([arXiv:2506.08276](https://arxiv.org/abs/2506.08276), MLSys 2026 Best Paper). That is the trade this post is about: keep approximate nearest neighbour, stop paying to store every embedding.

This is not [PageIndex](/me/blog/pageindex-vectorless-rag/). PageIndex drops embeddings on the query path and walks a document tree. LEANN still does vector search; it changes *what you persist*. It also does not replace ACL-before-similarity ([nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)). Same geometry, smaller footprint.

## Laptop personal-knowledge disk budget

Picture a MacBook that should semantic-search a messy personal corpus without a cloud vector DB: PDFs and notes, years of mail, chat exports, browser history, maybe agent memory. Traditional FAISS-class HNSW stores a high-dimensional vector per chunk plus a proximity graph. LEANN’s README storage table (same embedding setup on their side) makes the budget concrete:

| Corpus | Traditional (e.g. FAISS) | LEANN | Savings |
| ------ | ------------------------ | ----- | ------- |
| Wiki 60M chunks | 201 GB | 6 GB | 97% |
| Email 780K | 2.4 GB | ~79 MB | 97% |
| Chat 400K | 1.8 GB | 64 MB | 97% |
| Browser 38K | 130 MB | 6.4 MB | 95% |

*Numbers from the [LEANN README](https://github.com/StarTrail-org/LEANN) storage comparison. Email/chat/browser rows are their personal-data demos; Wiki is the large public scale.*

<img
  src="/me/images/blog/leann-effects.webp"
  alt="Bar chart comparing traditional vector database storage to LEANN across several corpora, with LEANN bars much shorter."
  width="1280"
  height="880"
  decoding="async"
  fetchpriority="high"
/>

*Storage comparison figure from the LEANN GitHub README (MIT).*

At email scale, **2.4 GB → ~79 MB** is the difference between “I need a spare SSD for vectors” and “the index lives next to the Maildir.” At wiki scale, **201 GB → 6 GB** is the difference between “not on this laptop” and “fits.” Apps in the repo wrap Apple Mail, Chrome history, WeChat, ChatGPT/Claude exports, and MCP live sources; the post’s measured numbers below use their public `data/` folder so nothing private leaves the machine.

## Graph ANN only touches a fraction of nodes

Proximity-graph search (HNSW, DiskANN) does not score every vector. A query walks a small subset of the graph. LEANN’s bet:

1. **Selective recomputation.** Do not store every embedding. Keep the graph (pruned). When search needs a node’s vector, run the same encoder that built the index and recompute that embedding.
2. **High-degree preserving pruning.** Hub nodes matter more for traversal; drop low-utility edges so adjacency metadata shrinks without wrecking recall.
3. **Latency budget from RAG.** In the paper’s Table 1 setup, response generation is ~21 s and HNSW search is tens of milliseconds. Spending a couple of seconds recomputing on the search path still leaves end-to-end in the same ballpark.

<img
  src="/me/images/blog/leann-arch.webp"
  alt="LEANN architecture diagram: pruned graph on disk, embedding server recomputes vectors for nodes on the search path, then results go to the LLM."
  width="1280"
  height="338"
  decoding="async"
  loading="lazy"
/>

*Architecture figure from the LEANN README: pruned graph plus on-demand embedding recompute (MIT).*

Backends: **HNSW** (default, maximum storage savings via full recompute) and **DiskANN** (PQ-assisted traversal with real-time rerank when you want more search speed). Compact index builds stay under a storage budget even while constructing large graphs.

## What we measured on the public demo corpus

On an Apple Silicon Mac, `uv pip install leann`, then index the repo’s public `data/` set (LEANN paper PDFs, Pride and Prejudice, a Chinese technical report)—**1,126** chunks of size 256 with 20 overlap, embedding model `sentence-transformers/all-MiniLM-L6-v2` (384-d). Same chunks for both sides.

| Artifact | On-disk size |
| -------- | ------------ |
| FAISS `IndexHNSWFlat` (vectors inside the index) | **1.89 MiB** |
| LEANN CSR-pruned graph (`index.index`) | **0.10 MiB** |
| Shared-ish passage text (LEANN `passages.jsonl`) | ~1.0 MiB |
| LEANN default BM25 sidecar (SQLite FTS) | ~1.9 MiB |

The ANN blob alone is about **eighteen times smaller** on this tiny corpus (~95% off the FAISS HNSW file). Absolute savings look modest in megabytes because 1,126 MiniLM vectors are only ~1.65 MiB of float32; the README email/wiki rows are where gigabytes disappear. Query latency: FAISS returned in about **1 ms**; LEANN’s first search after spawning the embedding server was about **5.0 s** (warmup plus recompute on the path). That matches the paper’s framing: search gets slower; generation still owns the wall clock for chat-style RAG.

Cold start dominates this micro-bench. Production LEANN setups keep an embedding server warm and can cache hub-node embeddings when disk allows. Do not treat 5 s as the steady-state number for every machine.

## What you can build

Minimal API shape from their docs: build a compact recompute index, then search.

```python
from leann import LeannBuilder, LeannSearcher

builder = LeannBuilder(
    backend_name="hnsw",
    embedding_model="sentence-transformers/all-MiniLM-L6-v2",
    embedding_mode="sentence-transformers",
    is_compact=True,
    is_recompute=True,
)
builder.add_text("LEANN stores a pruned graph and recomputes embeddings on the search path.")
builder.build_index("./my_index.leann")

searcher = LeannSearcher("./my_index.leann")
hits = searcher.search("How does LEANN save storage?", top_k=5)
```

Install path is `uv pip install leann` (CPU extra on Linux if needed). Their `apps.document_rag` and email/browser demos are thicker wrappers around the same builder. For coding agents, LEANN also ships an MCP semantic-search service aimed at Claude Code; on ContextBench (30 SWE-Bench Pro tasks, fixed model/tools/8,192-token retrieval budget) they report **2.1×** initial relevant-code recall versus BM25 (24.2% vs 11.4%), higher post-exploration coverage, and slightly fewer agent tokens. Better retrieval does not guarantee issue resolution—their own caveat.

<img
  src="/me/images/blog/leann-contextbench.webp"
  alt="Bar charts comparing LEANN to BM25 on ContextBench: relevant-code recall, exploration coverage, and agent token usage."
  width="1280"
  height="560"
  decoding="async"
  loading="lazy"
/>

*ContextBench LEANN vs BM25 figure from the LEANN README (MIT). Reproduce via their `benchmarks/contextbench/` notes.*

## Limits

- **ACL still comes first.** Shrinking the index does not decide which chunks a guest may see. Filter before retrieve.
- **Not a substitute for tree search on long filings.** When the failure mode is “wrong section, right-sounding prose,” PageIndex-style navigation still wins on structure.
- **Recompute needs the encoder at query time.** CPU/GPU/MPS cost returns every search; DiskANN on macOS wants a heavier native toolchain than plain HNSW.
- **“No accuracy loss” is vs their ANN baselines at target recall**, not a free win over BM25 on every corpus. PQ can beat LEANN on size only by giving up downstream accuracy—their Table 1 PQ row drops to BM25-like QA scores.
- **Small corpora hide the win.** Under a few thousand short chunks, graph metadata and passage text dominate; the 97% headline is a large-N story.

## What’s next

If local RAG is blocked by disk before it is blocked by model quality, index the same folder twice: FAISS (or Chroma) HNSW with stored vectors, then LEANN compact recompute. Compare index bytes and a handful of queries you care about. Keep PageIndex (or similar) for fat structured PDFs, and keep ACL outside the retriever. Portable personal indices that fit next to the raw text are the product LEANN is actually selling—not a new similarity metric.

## Sources

- [StarTrail-org/LEANN](https://github.com/StarTrail-org/LEANN) (GitHub, MIT)
- [LEANN: A Low-Storage Vector Index](https://arxiv.org/abs/2506.08276) (arXiv)
- Micro-bench: LEANN public `data/` → 1,126 chunks, MiniLM-L6-v2, FAISS `IndexHNSWFlat` vs LEANN HNSW compact recompute, Apple Silicon, 2026-10-26
- Related: [PageIndex: retrieval without the vector DB](/me/blog/pageindex-vectorless-rag/), [Vector RAG: the nearest chunk is not the allowed chunk](/me/blog/the-nearest-chunk-is-not-the-allowed-chunk/)
