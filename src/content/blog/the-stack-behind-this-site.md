---
title: "Astro: the stack behind this site"
date: 2026-05-15
tags:
  - web
summary: "Astro 7, markdown posts, Tailwind 4, GitHub Pages. Push to main and it ships—plus agent-readable surfaces and build-time OG cards."
---

A personal site that grows as notes should not accumulate a CMS, a form backend, and a deploy ritual every time someone publishes a paragraph. The ceiling here is maintenance surface: if adding a post is anything harder than a `.md` file and a push to `main`, the stack is wrong for the job. This repo is a static Astro blog on GitHub Pages—markdown posts, Tailwind, GitHub Actions rebuilding on push—so the live site is mostly HTML on a CDN, with a thin client layer for theme preference, soft page transitions, and a few progressive enhancements that degrade cleanly without JavaScript.

No database, no contact-form endpoint, no admin UI. Publishing is frontmatter, body, and green CI.

Below: routes and config, the stack table, how a page compiles, discovery surfaces, design choices, deploy, and the post contract.

## Four routes and one config file

The public HTML surface is four routes plus shared config.

- Home: a short introduction, avatar, and the latest post
- Blog: dated markdown posts, with optional client-side title/tag filter (`?q=` / `?tag=`)
- Stats: build-time archive, tag, and stack inventory (not live analytics)
- Contact: LinkedIn first, this repository’s GitHub second

Templates read name, tagline, and links from `src/config.ts` so strings do not scatter through markdown. Nav is Blog, Stats, Contact, and the theme control.

Posts live in `src/content/blog/`. Frontmatter is the contract: `title`, `date`, `summary`, optional `tags`. The filename is the URL slug. Astro checks that shape at build time—a missing date fails the build instead of shipping a broken page. Reading time is computed at build from the markdown word count (200 words per minute). Each post page gets a collapsible table of contents from headings, up to three related posts by shared tags, older/newer links, a reading progress bar, a copy-link control, and a build-time Open Graph PNG under `/me/og/{slug}.png`.

## Small stack, explicit tradeoffs

| Piece     | Choice                                      | Why                                                                                   |
| --------- | ------------------------------------------- | ------------------------------------------------------------------------------------- |
| Generator | [Astro](https://astro.build) 7              | Pages compile to static HTML. JavaScript only where needed.                           |
| Markdown  | Sätteri + content collections               | Astro 7’s default processor; frontmatter validated at build.                          |
| Posts     | Markdown in `src/content/blog/`             | A new post is a new `.md` file. No admin UI, no database.                             |
| Styling   | Tailwind CSS 4 (`@tailwindcss/vite`)        | One palette, utility classes, no growing CSS architecture.                            |
| Type      | Newsreader + Source Sans 3                  | Serif for titles, sans for body. Editorial, not a dashboard.                          |
| Fonts     | Astro `Font` (Google at build) + fontsource | Pages self-host; fontsource `.woff` files feed Satori for OG PNGs.                    |
| OG cards  | Satori + `@resvg/resvg-js`                  | One PNG per slug at build; default card at `/me/og/default.png`.                      |
| Colour    | Cream paper, teal accent                    | Light and dark share the same tokens; dark is a class on `<html>`, not a second site. |
| Hosting   | GitHub Pages                                | HTTPS and a CDN-shaped host. Deploy is an Action on push to `main`.                   |
| Contact   | LinkedIn (GitHub second)                    | No form endpoint to run or abuse.                                                     |

This remains a GitHub Pages *project* site until a custom domain attaches. The public URL sits under `/me`. Astro's `base` is `'/me'` and internal links go through a small `withBase()` helper so CSS, the favicon, and routes resolve on Pages. Locally: `http://localhost:4321/me/`. Node 22.23.4+ matches Astro 7.4’s Maintenance LTS floor.

With a custom domain later: `site` becomes that URL, `base` becomes `'/'`, a `CNAME` file lands in `public/`. The rest of the tree stays the same.

## Build time owns the page graph

Astro renders `.astro` templates at build time. `BaseLayout.astro` is the shell: fonts, metadata, header, footer, paper background, JSON-LD, and alternate links for RSS, sitemap, and `llms.txt`. Each route fills the middle. Soft navigation uses Astro View Transitions (`ClientRouter`); the theme boot script re-applies after `astro:after-swap` so a client-side route change does not flash the wrong theme. `prefers-reduced-motion` is respected.

There is no hand-written page type per post. `src/pages/blog/[slug].astro` asks the collection for every markdown file; `getStaticPaths` emits one HTML file per post. The body is ordinary markdown inside a `prose` column in the `max-w-4xl` shell. A parallel route writes `/me/blog/{slug}.md` so agents can fetch the source without scraping HTML.

Dates in frontmatter are UTC. `2026-05-10` means that calendar day—not "midnight UTC which is still yesterday in Ontario." The formatter uses `en-CA` and UTC so the date in the file is the date on the page.

Client scripts stay small and optional: theme toggle (and its inline boot), View Transitions, blog index filter, reading progress, and copy-link. Without JS, the prerendered blog list is unfiltered, progress and copy-link are absent, and theme still follows the OS via the inline boot when possible. No accounts.

## Discovery surfaces agents can fetch

The same writing ships as files crawlers and agents can GET. GitHub Pages is static, so there is no search API and no MCP endpoint—filter locally, then fetch markdown.

| Surface | Path | Role |
| ------- | ---- | ---- |
| Curated index | `/me/llms.txt` | llms.txt v2, scoped to this project path |
| Catalog | `/me/posts.json` | title, date, tags, HTML and markdown URLs |
| Inventory | `/me/stats.json` | archive size, tags, reading totals, stack facts |
| OpenAPI | `/me/openapi.json` | OpenAPI 3.1 for the catalog |
| Feed | `/me/rss.xml` | RSS |
| Sitemap | `/me/sitemap-index.xml` | `@astrojs/sitemap` |
| Markdown | `/me/blog/{slug}.md` | raw post body |

Stats on `/me/stats/` is the human view of the same build-time inventory. Interactive Archify diagrams for this repo live under `/me/archify/` when you want a topology sketch instead of a prose map.

## Editorial column, not a portfolio grid

The goal was an editorial-like column. A regular portfolio grid would have been the wrong site type.

- **Measure over chrome.** Main column is `max-w-4xl`. Nav is Blog, Stats, Contact, and the theme control.
- **One accent.** Teal (`#0f766e`, lighter in dark mode) for labels, links, and the current nav item. Everything else is ink on paper.
- **Paper.** Cream in light mode (`#f6f1e8`), near-black green-gray in dark (`#141716`). Default follows the OS; the toggle remains.
- **Still type.** A darker theatrical version with pointer-tilt and scroll-in 3D was fun for a day—not for a site that is mostly notes.

<img
  src="/me/images/blog/this-site-light.webp"
  alt="Home in light mode: cream paper, a teal Ontario, Canada label, serif name, and the Latest Post section."
  width="1280"
  height="1169"
  decoding="async"
  fetchpriority="high"
/>

<img
  src="/me/images/blog/this-site-dark.webp"
  alt="The same home page in dark mode: near-black paper, cream type, and a sun icon on the theme toggle."
  width="1280"
  height="1169"
  decoding="async"
  loading="lazy"
/>

About page, projects index, live analytics, and a CMS were skipped—not go-live requirements; they can wait. Discovery files, OG cards, Stats, and View Transitions did ship because they reuse the same post collection without adding a runtime.

## Push to main is the deploy

GitHub Actions checks out the repo, stamps `PUBLIC_GIT_SHA` and `PUBLIC_BUILD_TIME` for Stats, `withastro/action` installs and builds on Node 22, and `deploy-pages` publishes `dist/` (**Settings → Pages → Source: GitHub Actions** once). No database to migrate, no server process to babysit—green build means current site.

## Adding a post

```md
---
title: "Post title"
date: 2026-09-15
tags: [llm]
summary: "One or two sentences."
---

Body of the post.
```

Drop that in `src/content/blog/`, use a filename worth keeping as the URL, and push. Prefer a `Product: catchphrase` title that still matches the slug’s topic. The index, homepage Latest list, related posts, RSS, sitemap, `posts.json`, `llms.txt`, Stats, and the OG PNG all read from the same collection.

## Verification after deploy

Treat a green GitHub Actions run as necessary, not sufficient. The failure modes that bite project sites are almost all about `base`, asset paths, and stale CDN—not TypeScript errors.

After `npm run build` locally, open `dist/index.html` and confirm linked CSS and favicon URLs start with `/me/` when `base` is `'/me'`. A build that works on `localhost:4321/me/` but ships root-relative `/assets/...` links will look unstyled on Pages until you fix `site`/`base` or the `withBase()` helper. Spot-check an OG URL under `dist/og/` as well—Satori failures show up there before social previews do.

On the live host, spot-check these URLs in a private window (no service-worker cache from an old tab):

```text
https://<user>.github.io/me/
https://<user>.github.io/me/blog/
https://<user>.github.io/me/stats/
https://<user>.github.io/me/blog/<one-known-slug>/
```

Each should return 200, load fonts, and show the theme toggle. Hard-refresh once; GitHub Pages can lag a minute behind a green deploy.

Content collections fail closed: delete `date` from a draft locally and run `npm run build`. Astro should error before `dist/` is trustworthy. That is the check that frontmatter drift does not become a silent 404 in production.

Discovery and feed URLs often emit absolute links, so a wrong `site` in `astro.config` shows up there first:

```text
https://<user>.github.io/me/sitemap-index.xml
https://<user>.github.io/me/rss.xml
https://<user>.github.io/me/posts.json
https://<user>.github.io/me/llms.txt
https://<user>.github.io/me/og/default.png
```

Theme persistence is still worth clicking through: toggle dark, reload, then follow an in-site link so View Transitions run and confirm `localStorage` plus the after-swap handler agree (no flash to light on a dark preference). No accounts means no server-side session to debug when something looks wrong.

## Sources

- [Astro](https://docs.astro.build): content collections, fonts, View Transitions, GitHub Pages, `base`
- [Tailwind CSS](https://tailwindcss.com/docs)
- [GitHub Pages](https://docs.github.com/en/pages)
- Related: [Static sites: helping agents discover yours](/me/blog/helping-agents-discover-a-static-site/), [Archify: drawn from this repo](/me/blog/archify-drawn-from-this-repo/)
