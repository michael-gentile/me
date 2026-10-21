---
title: "Anthropic Scion: source control for agent scale"
date: 2026-10-14
tags:
  - ai
  - programming
summary: "Anthropic’s engineering post on Scion: they outgrew git’s offline assumptions when merges jumped past 30k a day, and rebuilt VCS around always-online agents. What I’d steal, and what stays Anthropic-only."
---

When merge volume climbs from about **2,500** a day to more than **30,000** in a few months, shallow clones and mirror farms stop being optimizations and start being the bottleneck—and naive fetch math on Anthropic’s monorepo lands past **600 PB** of git traffic per day before developer laptops enter the picture. Scion is their in-house version control system for a repo where coding agents merge at that pace and almost every client is online by definition. The [Redesigning source control](https://www.anthropic.com/engineering/redesigning-source-control) post is the design memo: git’s offline-every-clone-is-a-peer model stopped matching traffic once promisor remotes and hundreds of mirrors could not keep up. They call latent demand for merging “practically infinite.” Read it as architecture, not a product you can install—Scion shipped in about five months with Antique for review, code search, and richer IAM, built by a small team that also used Claude heavily on the implementation.

Picture a CI farm that needs blame, diff, and checkout twenty-five million times a day while agents land changesets continuously. Each job that clones “enough history to answer one metadata question” pays the full monorepo tax. Scion’s answer is asymmetric: the server owns commits, merges, and derived indices; clients keep a bounded cache and ask over RPC.

## Why git’s peer model fights agent traffic

Their monorepo sits in the awkward size class: main history alone almost **100 GB**, compressed working copy over **25 GB**, on the order of **25 million** CI checkouts a day before counting developer boxes, agent sandboxes, and research jobs.

They used the usual escapes: shallow clones, sparse checkouts, promisor remotes, internal mirrors (hundreds at peak), blob-store seeds. A **promisor remote** in git is a server that promises to send missing blobs later—clients clone trees and commit metadata without downloading every large object up front, then fetch blobs on demand. That keeps CI checkouts smaller until merge volume makes even “metadata + on-demand blobs” too chatty. Those tricks bought time. Seeds drifted from tip of main. Diff and blame on partial clones got fussier as merge rate rose. Mirrors quit scaling once the repo outgrew disk and memory.

Under the ops pain sits a simpler diagnosis. Like most companies, they already treated git as one authoritative remote. Almost every client was an agent or a job that never works offline. The decentralized “every clone is a server” design was fighting the actual traffic.

## Principles they shipped

Prior art they name: Google’s Piper, Meta’s Sapling. Scion’s own list:

Clients stay online. Fetch what you need from a reachable server instead of carrying a complete history for airplane mode.

Client and server are asymmetric. The server creates commits, merges, rebases, answers history and blame. The client keeps a bounded object cache, lays out a working tree, watches the filesystem, and talks ergonomics. It computes little on its own.

Source control is an API. Jobs that need “who last touched this line” or “how are these commits related” ask the service. Many tools skip a local repo entirely. Their automated bisect and revert pipelines depend on that.

Horizontal scale with no full materialization. No packfile-era maintenance cycle where one machine holds the whole repo. Data is content-addressed and spread out; servers are mostly caches that can compute derived data and write it back (they use Spanner).

Commits are cheap, incremental, and lock-free on the hot path. Create the change on the server; there is nothing to push. Cost should track the size of the change, not the size of the monorepo. They discourage casual refs because global pointers every server must agree on become a scaling tax. Main and release branches stay; sprawling personal branches are the smell.

Working copies are optional and sparse by design. Diff against merge base can be a server query. Sparse and virtualized checkouts mean you pay for what you read.

## How a changeset differs from a commit

In Scion the unit is a “changeset” in a write-ahead log. It stores what you'd expect from a commit, except instead of a full tree pointer it lists files changed relative to the first parent, with content-addressed blob pointers. High throughput: no packfile accept, no lock dance to land the object, refs moved separately via compare-and-swap on a Spanner row.

History and blame need more than that delta list, so they build “derived data” recursively from parents: blame structures, path history, skip lists on the commit graph, later copy detection and path search. Eager or deferred per type. Clients never see the internals, so they can swap indices without a client bump.

Checkout negotiation drops git's “tell the server what I already have” dance. The client asks for specific trees and blobs it wants, recursively. Same RPCs at daemon, regional cache, and authoritative server tiers. They report **>99%** cache hit rates per tier, a **~200×** smaller CPU/memory footprint than the old git mirror farm, checkouts in seconds instead of minutes, and about **25%** CI CPU capacity recovered.

## What breaks when humans are not the only authors

A seven-person team built Scion and Antique while merge volume climbed **10×**. Engineers still set constraints and say no when Claude violates them. Line-by-line review gives way to intent review, plus adversarial passes that can over-defend. They lean on hermetic simulations, fuzzing, and rate limits. Ops uses “superfans”: Claudes in Slack channels glued to one component's telemetry, looking for weirdness that static alerts miss.

The merge-queue prior broke. Hundreds of changes can land while tests still run. They invested in post-merge and pre-deploy automation instead of a global lock, and treat concurrent conflicts as something Claude can often repair faster than a human can triage.

Security got directory-level permissions inside the monorepo and review rules that distinguish comment-only edits from sensitive logic, so humans spend attention where it matters. Volume still demands observability and policy at the forge layer—not only in the agent harness above it.

## What a normal repo can steal

Scion is not a git replacement for a typical team, and Anthropic says so. Migrating means review, search, and CI move with it. Their internal token spend for dogfooding is not a budget to copy blindly.

For a shop where agents help a lot but the monorepo still fits git, the portable ideas live inside git's model first: better server-side APIs for blame and ancestry, negotiation that looks more like content-addressed caches, sparse and shallow features that compose, fewer tools that clone the world to answer one metadata question. The post closes by asking GitHub, GitLab, and the OSS git community to move that way.

If the org *is* in Anthropic's size class, whiteboard these before cloning the idea: who may land to main without a human, what “reviewed” means when the author is an agent, how post-merge breakage pages a human, and whether directory ACLs in the monorepo match how secrets and regulated code are segregated.

## Limits and what’s next

When agents merge all day, source control becomes the tax underneath the harness. Anthropic's post is worth reading for the principles and the CI/checkout architecture; a small repo should leave Scion alone and ask which CI jobs still clone full history for questions the forge could answer over RPC. Audit one pipeline that only needs blame or ancestry—if it materializes the whole tree, that job is the experiment surface before anyone talks about replacing git.

## Sources

- [Redesigning source control at Anthropic](https://www.anthropic.com/engineering/redesigning-source-control) (Anthropic Engineering, Oct 13, 2026)
- Related: [Agent stack: prompt, context, harness, loop, graph](/me/blog/prompt-context-harness-loop-graph/), [Uber ADR: sensing the agent session](/me/blog/uber-adr-sensor-the-agent-session/)
