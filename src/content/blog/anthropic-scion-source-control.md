---
title: "Anthropic Scion: source control for agent scale"
date: 2026-10-14
tags:
  - ai
  - programming
summary: "Anthropic’s engineering post on Scion: they outgrew git’s offline assumptions when merges jumped past 30k a day, and rebuilt VCS around always-online agents. What I’d steal, and what stays Anthropic-only."
---

Scion is Anthropic's in-house version control system for a monorepo where coding agents merge tens of thousands of times a day and almost every client is online by definition. Their [Redesigning source control](https://www.anthropic.com/engineering/redesigning-source-control) post is the design memo: git's offline-every-clone-is-a-peer model stopped matching traffic once shallow clones, mirrors, and promisor remotes could not keep up. I still spend most of my skepticism on the harness around the model ([Prompt, context, harness, loop, graph](/me/blog/prompt-context-harness-loop-graph/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/)). This piece is about the older wall underneath that harness.

In May 2026 they averaged about 2,500 merges a day into their monorepo. By September it was over 30,000. They call the latent demand for merging "practically infinite." Git assumes every clone is a full offline peer; agent-scale monorepos need a server that answers history, blame, diffs, and checkouts for clients that are online by definition. Their answer was Scion, an in-house VCS, plus Antique for review, code search, and a richer IAM story, shipped in about five months by a small team that also used Claude heavily to build it. Read it as a design memo. You cannot `brew install` Scion.

## Why git started to hurt

Their monorepo is the awkward size class: main history alone almost 100 GB, compressed working copy over 25 GB, on the order of 25 million CI checkouts a day before counting developer boxes, agent sandboxes, and research jobs. Naive fetch math in the post lands past 600 PB of git traffic per day.

They used the usual escapes: shallow clones, sparse checkouts, promisor remotes, internal mirrors (hundreds at peak), blob-store seeds. Those bought time. Seeds drifted from tip of main. Diff and blame on partial clones got fussier as merge rate rose. Mirrors quit scaling once the repo outgrew disk and memory.

Under the ops pain sits a simpler diagnosis. Like most companies, they already treated git as one authoritative remote. Almost every client was an agent or a job that never works offline. The decentralized "every clone is a server" design was fighting the actual traffic.

## Principles they shipped

Prior art they name: Google’s Piper, Meta’s Sapling. Scion’s own list:

Clients stay online. Fetch what you need from a reachable server instead of carrying a complete history for airplane mode.

Client and server are asymmetric. The server creates commits, merges, rebases, answers history and blame. The client keeps a bounded object cache, lays out a working tree, watches the filesystem, and talks ergonomics. It computes little on its own.

Source control is an API. Jobs that need "who last touched this line" or "how are these commits related" ask the service. Many tools skip a local repo entirely. Their automated bisect and revert pipelines depend on that.

Horizontal scale with no full materialization. No packfile-era maintenance cycle where one machine holds the whole repo. Data is content-addressed and spread out; servers are mostly caches that can compute derived data and write it back (they use Spanner).

Commits are cheap, incremental, and lock-free on the hot path. Create the change on the server; there is nothing to push. Cost should track the size of the change, not the size of the monorepo. They discourage casual refs because global pointers every server must agree on become a scaling tax. Main and release branches stay; sprawling personal branches are the smell.

Working copies are optional and sparse by design. Diff against merge base can be a server query. Sparse and virtualized checkouts mean you pay for what you read.

## How a changeset differs from a commit

In Scion the unit is a "changeset" in a write-ahead log. It stores what you'd expect from a commit, except instead of a full tree pointer it lists files changed relative to the first parent, with content-addressed blob pointers. High throughput: no packfile accept, no lock dance to land the object, refs moved separately via compare-and-swap on a Spanner row.

History and blame need more than that delta list, so they build "derived data" recursively from parents: blame structures, path history, skip lists on the commit graph, later copy detection and path search. Eager or deferred per type. Clients never see the internals, so they can swap indices without a client bump.

Checkout negotiation drops git's "tell the server what I already have" dance. The client asks for specific trees and blobs it wants, recursively. Same RPCs at daemon, regional cache, and authoritative server tiers. They report >99% cache hit rates per tier, a ~200x smaller CPU/memory footprint than the old git mirror farm, checkouts in seconds instead of minutes, and about 25% CI CPU capacity recovered.

## What they learned that is not a systems paper

A seven-person team built Scion and Antique while merge volume climbed 10x. Engineers still set constraints and say no when Claude violates them. Line-by-line review gives way to intent review, plus adversarial passes that can over-defend. They lean on hermetic simulations, fuzzing, and rate limits. Ops uses "superfans": Claudes in Slack channels glued to one component's telemetry, looking for weirdness that static alerts miss.

The merge-queue prior broke. Hundreds of changes can land while tests still run. They invested in post-merge and pre-deploy automation instead of a global lock, and treat concurrent conflicts as something Claude can often repair faster than a human can triage.

Security got directory-level permissions inside the monorepo and review rules that distinguish comment-only edits from sensitive logic, so humans spend attention where it matters. That rhymes with [Uber ADR](/me/blog/uber-adr-sensor-the-agent-session/) and [Controls I would require](/me/blog/controls-i-would-require/): you still need observability and policy when volume goes up.

## What I’d steal on a normal repo

Scion is not a git replacement for a normal team, and Anthropic says so. Migrating means review, search, and CI move with it. Their internal token spend for dogfooding is not a budget you should copy.

For a shop where agents help a lot but the monorepo still fits git, I would steal ideas inside git's model first: better server-side APIs for blame and ancestry, negotiation that looks more like content-addressed caches, sparse and shallow features that compose, fewer tools that clone the world to answer one metadata question. The post closes by asking GitHub, GitLab, and the OSS git community to move that way. That feels right.

If you *are* in Anthropic's size class, put these on the whiteboard before cloning the idea: who may land to main without a human, what "reviewed" means when the author is an agent, how post-merge breakage pages a human, and whether directory ACLs in the monorepo match how you segregate secrets and regulated code.

When agents merge all day, source control becomes the tax. I would read Anthropic's post for the principles and the CI/checkout architecture. For a small repo I would leave Scion alone and ask which of my CI jobs still clone a full history to answer a question the forge could answer over RPC.

## Sources

- [Redesigning source control at Anthropic](https://www.anthropic.com/engineering/redesigning-source-control) (Anthropic Engineering, Oct 13, 2026)
- Earlier notes: [Prompt, context, harness, loop, graph](/me/blog/prompt-context-harness-loop-graph/), [Uber ADR: sensing the agent session](/me/blog/uber-adr-sensor-the-agent-session/), [Controls I would require](/me/blog/controls-i-would-require/), [The model does not get send_email](/me/blog/the-model-does-not-get-send-email/)
