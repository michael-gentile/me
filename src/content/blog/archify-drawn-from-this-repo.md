---
title: "Archify: drawn from this repo"
date: 2026-10-05
tags:
  - web
summary: "I pointed Archify at this Astro site and got a source-backed architecture diagram for the push → build → Pages path."
---

Prose tables answer "what shipped." They go thin when the question is "what talks to what"—readers, GitHub Actions, the Astro build, and agent discovery files all share one host, and a paragraph list hides the edges. [Archify](https://github.com/tt-a1i/archify) is an agent skill that turns a typed JSON document into a self-contained HTML architecture diagram with line-range sources pinned to the repo. Schema validation and layout checks run before output replaces the last good file; on a real tree the agent pins a commit, attaches `sources` on nodes, and passes `--repo-root` so claims have to match the tree.

**Architecture diagram**, in this context, means a directed graph: boxes (components), boundaries (trust or deployment zones), and edges (data or control flow). **Source-backed** means each box can cite a file path and line range in the repository at a pinned commit—not a hand-wavy label like "CDN" with no file to inspect. **Provenance** is that commit hash plus the validation receipt: if the cited lines do not exist or do not support the claim, the pipeline rejects the candidate instead of shipping fiction.

Install once, then ask an agent that can load skills—no separate clone of the Archify repo:

```sh
npx skills add tt-a1i/archify -g
```

With this site's working tree open, the ask was a source-backed architecture of **this** site: markdown in git, Astro on Node 22, GitHub Actions, GitHub Pages under `/me`, agent discovery files, and the theme toggle.

## The diagram names both audiences on one host

The candidate is ordinary JSON. Nodes for the author, Actions, the Astro build, the blog collection, Pages, `BaseLayout`, post pages, discovery routes, and the client theme script. Boundaries for "build on push" and "published under `/me/`". Edges for `push main`, `npm build`, content collection, artifact upload, and HTTPS GET from readers and agents.

<a href="/me/archify/me-site.html">
  <img
    src="/me/images/blog/archify-me-site.webp"
    alt="Archify architecture diagram of michael-gentile/me: author pushes to GitHub Actions, Astro builds markdown into GitHub Pages under /me, readers and agents GET HTML and discovery files, theme toggle uses localStorage."
    width="2048"
    height="1320"
    decoding="async"
    fetchpriority="high"
  />
</a>

[Open the interactive HTML](/me/archify/me-site.html) for dark mode, export, or SRC badges that jump to cited lines. The still image above is the light capture from Archify's `visual-check`.

### Worked example: one edge, one citation

Take the edge from "push to `main`" to "GitHub Actions workflow runs." A honest Archify node for Actions should carry `sources` like `.github/workflows/deploy.yml` with a line range that includes the `on: push` trigger and the job that invokes `npm run build`. A reader clicking SRC in the HTML should land in the workflow file, not in a README that merely mentions CI. If the agent instead cites `package.json` for "deploy," validation should fail or the human should reject the candidate—deploy orchestration lives in the workflow, not in scripts alone.

Another edge: "reader GET `/me/blog/slug`." The post page node should cite `src/pages/blog/[slug].astro` and the content collection config (`src/content.config.ts` or equivalent) so the diagram shows how markdown becomes HTML at build time, not at request time. Static hosting means there is no origin server executing Astro on each GET; the diagram must not imply one unless the repo actually has it.

## Source evidence keeps invented boxes out

Readers and agents both HTTPS GET GitHub Pages; agents then hit the static catalog (`llms.txt`, `posts.json`, OpenAPI, per-post `.md`) instead of a live search API. The only client script that matters for the drawing is the theme toggle writing `localStorage` and flipping `dark` on `<html>`.

Each box carries paths like `.github/workflows/deploy.yml`, `astro.config.mjs`, `src/content.config.ts`, and `src/layouts/BaseLayout.astro` with line ranges. Invent a Redis cache on this site and `finalize` does not magically invent one either—the schema and repo check keep the story honest.

**Schema validation** checks the JSON shape: required fields on nodes and edges, allowed relationship types, and layout constraints so the renderer does not produce overlapping junk. **Repo check** (provenance) verifies that cited paths exist under `--repo-root` and that line ranges are in bounds. Together they are the difference between "diagram as illustration" and "diagram as audit artifact."

## What a skill run looks like end to end

The agent wrote a candidate under `.archify/architecture-me-site-…/candidate.json`, ran the skill's `finalize` against this repo root, and left showcase HTML beside it. That HTML was copied to `/me/archify/me-site.html` for the site, against commit `723fbbf7…`.

`finalize` is validate → deliver → provenance check → Chrome browser-check. First pass cleared the gates with a note that the markdown→Astro edge had too many bends. Moving the blog collection above the Astro build so they share a column, rerunning, and the receipt came back clean. Then `visual-check` wrote the PNG converted to WebP for this post.

For hand CLI use, `bin/archify.mjs` ships inside the installed skill. The usual path remains: install the skill, ask the agent, read the HTML it delivers.

### Verification steps you can repeat

1. Open the interactive HTML and click several SRC badges. Each should open the cited file at the cited lines in the pinned commit (or the current tree if you deliberately regenerated without pinning—then note the drift).
2. Diff the candidate JSON against the rendered graph: every node with a `sources` array should appear in the diagram with a badge; orphan citations or nodes without sources are a smell.
3. Re-run `finalize` locally with `--repo-root` set to this repository. A clean receipt after a intentional bad citation (edit one path to `fake/redis.conf`) should **not** pass—if it does, your provenance gate is misconfigured.
4. Run `visual-check` after layout changes. Routing edges across boundaries is easy to get wrong in JSON; the PNG catches unreadable crossings before you embed the image in a blog post.

### Limits: what Archify is not

- **Not a live topology probe.** It documents what the repo says should happen (workflows, config, routes), not packet captures or Cloudflare trace logs. If Pages misconfiguration serves 404s, the diagram can still be "correct" relative to git.
- **Not automatic discovery of every dependency.** The agent (or author) must choose nodes. A forgotten `postcss.config` or a secret env var in Actions will not appear unless someone models it.
- **Not a substitute for threat modeling.** Boundaries can show "build zone" versus "public web," but they do not assign STRIDE categories or rate controls—that stays in security docs.
- **Agent variance.** Two runs with different prompts may produce different layouts or granularity. Pin the commit and keep the last good `candidate.json` under version control if the diagram is part of release notes.
- **Browser-check dependency.** `finalize`'s Chrome step needs a headless browser environment. CI without Chrome may skip or fail that stage; know your runner.

## Mermaid is fast; Archify is pinned

Mermaid in markdown is faster when the audience is a PR description and nobody needs SRC links. Excalidraw is better when topology is still fuzzy. Archify earns its keep when the diagram must survive as shareable HTML and stay tied to a revision of the tree.

When choosing tooling: if the diagram will live only in git markdown and never be cited in an incident postmortem, Mermaid wins on edit cost. If you expect "show me the line that proves Actions uploads the artifact" six months later, Archify's SRC model is the point.

## Operational notes for this repo

This site's public path prefix `/me` affects every edge labeled "reader GET." The diagram should cite `astro.config.mjs` `base` and the `withBase()` helper (or equivalent) so agents do not confuse "site root" with "repository root." Discovery routes (`llms.txt`, machine-readable post lists) are first-class nodes because this blog documents agent-readable static sites—not an optional appendix.

Regenerate the diagram when the deploy workflow changes Node version, when content collection schema changes, or when new client-side scripts ship. A theme toggle is small; a new analytics script or service worker would be a new node with new sources.

## Sources

- [Archify](https://github.com/tt-a1i/archify) (agent skill that builds the HTML diagram)
- [Interactive diagram](/me/archify/me-site.html) (shipped HTML for this repo)
- Related: [Astro: the stack behind this site](/me/blog/the-stack-behind-this-site/), [Static sites: helping agents discover yours](/me/blog/helping-agents-discover-a-static-site/)
