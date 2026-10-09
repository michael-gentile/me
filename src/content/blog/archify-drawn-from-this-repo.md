---
title: "Archify, drawn from this repo"
date: 2026-10-05
tags:
  - web
summary: "I pointed Archify at this Astro site and got a source-backed architecture diagram for the push → build → Pages path."
---

[Archify](https://github.com/tt-a1i/archify) is an agent skill that turns a small typed JSON document into a self-contained HTML diagram. Architecture, workflow, sequence, data flow, lifecycle. Schema validation and layout checks run before the file replaces the last good output. For a real repository the agent pins a commit, attaches line-range `sources` on the nodes, and passes `--repo-root` so the claims have to match the tree.

You install the skill once, then ask an agent that can load skills. No separate clone of the Archify repo:

```sh
npx skills add tt-a1i/archify -g
```

I did that, opened this site's working tree, and asked for a source-backed architecture of **this** site: markdown in git, Astro on Node 22, GitHub Actions, GitHub Pages under `/me`, plus the agent discovery files and the theme toggle.

## What came out

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

[Open the interactive HTML](/me/archify/me-site.html) if you want dark mode, export, or the SRC badges that jump to the cited lines. The still image above is the light capture from Archify's `visual-check`.

## Why this fit the site

Most of my notes about this repo are prose tables. That is fine for "what shipped." It is weaker for "what talks to what." The diagram makes the two audiences share a host explicit: readers and agents both HTTPS GET GitHub Pages; agents then hit the static catalog (`llms.txt`, `posts.json`, OpenAPI, per-post `.md`) instead of a live search API. The only client script that matters for the drawing is the theme toggle writing `localStorage` and flipping `dark` on `<html>`.

Source evidence is the part I care about. Each box carries paths like `.github/workflows/deploy.yml`, `astro.config.mjs`, `src/content.config.ts`, and `src/layouts/BaseLayout.astro` with line ranges. If I invent a Redis cache on this site, `finalize` does not magically invent one either; the schema and the repo check keep the story honest.

## How the skill run went

The agent wrote a candidate under `.archify/architecture-me-site-…/candidate.json`, ran the skill's `finalize` against this repo root, and left a showcase HTML beside it. I copied that HTML to `/me/archify/me-site.html` for the site. Against commit `723fbbf7…`.

`finalize` is validate → deliver → provenance check → Chrome browser-check. First pass cleared the gates with a note that the markdown→Astro edge had too many bends. The agent moved the blog collection above the Astro build so they share a column, reran, and the receipt came back clean. Then `visual-check` wrote the PNG I converted to WebP for this post.

If you ever need the CLI by hand, it ships inside the installed skill as `bin/archify.mjs`. The usual path is still: install the skill, ask the agent, read the HTML it delivers.

## Alternatives I still use

Mermaid in a markdown file is faster when the audience is a PR description and nobody needs SRC links. A hand-drawn Excalidraw board is better when the topology is still fuzzy. Archify earns its keep when the diagram has to survive as a shareable HTML artifact and stay pinned to a revision of the tree.

I am not replacing the stack post with this drawing. The drawing is for the shape. The stack post is still where fonts, colour, and the `/me` base path live.
