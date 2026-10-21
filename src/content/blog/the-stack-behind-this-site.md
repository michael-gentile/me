---
title: "Astro: the stack behind this site"
date: 2026-05-15
tags:
  - web
summary: "Astro, markdown posts, Tailwind, GitHub Pages. I push to main and it ships."
---

A personal site that grows as notes should not accumulate a CMS, a form backend, and a deploy ritual every time someone publishes a paragraph. The ceiling here is maintenance surface: if adding a post is anything harder than a `.md` file and a push to `main`, the stack is wrong for the job. This repo is a static Astro blog on GitHub Pages—markdown posts, Tailwind, GitHub Actions rebuilding on push—so the live site is mostly HTML on a CDN plus one small script for theme preference.

No database, no contact-form endpoint, no admin UI. Publishing is frontmatter, body, and green CI.

Below: routes and config, the stack table, how a page compiles, design choices, deploy, and the post contract.

## Three routes and one config file

The layout is three routes and shared config.

- Home: a super brief introduction about myself
- Blog: dated markdown posts about things here and there that I'm tinkering with
- Contact: links to my LinkedIn and GitHub for those who want to check out the code for the site

Templates read name, tagline, and links from `src/config.ts` so strings do not scatter through markdown.

Posts live in `src/content/blog/`. Frontmatter is the contract: `title`, `date`, `summary`, optional `tags`. The filename is the URL slug. Astro checks that shape at build time—a missing date fails the build instead of shipping a broken page.

## Small stack, explicit tradeoffs

| Piece     | Choice                         | Why                                                                                   |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Generator | [Astro](https://astro.build)   | Pages compile to static HTML. JavaScript only where needed.                           |
| Posts     | Markdown + content collections | A new post is a new `.md` file. No admin UI, no database.                             |
| Styling   | Tailwind CSS                   | One palette, utility classes, no growing CSS architecture.                            |
| Type      | Newsreader + Source Sans 3     | Serif for titles, sans for body. Editorial, not a dashboard.                          |
| Colour    | Cream paper, teal accent       | Light and dark share the same tokens; dark is a class on `<html>`, not a second site. |
| Hosting   | GitHub Pages                   | HTTPS and a CDN-shaped host. Deploy is an Action on push to `main`.                   |
| Contact   | LinkedIn (GitHub second)       | No form endpoint to run or abuse.                                                     |

This remains a GitHub Pages *project* site until a custom domain attaches. The public URL sits under `/me`. Astro's `base` is `'/me'` and internal links go through a small `withBase()` helper so CSS, the favicon, and routes resolve on Pages. Locally: `http://localhost:4321/me/`.

With a custom domain later: `site` becomes that URL, `base` becomes `'/'`, a `CNAME` file lands in `public/`. The rest of the tree stays the same.

## Build time owns the page graph

Astro renders `.astro` templates at build time. `BaseLayout.astro` is the shell: fonts, metadata, header, footer, paper background. Each route fills the middle.

There is no hand-written page type per post. `src/pages/blog/[slug].astro` asks the collection for every markdown file; `getStaticPaths` emits one HTML file per post. The body is ordinary markdown inside a `prose` column in the `max-w-4xl` shell.

Dates in frontmatter are UTC. `2026-05-10` means that calendar day—not "midnight UTC which is still yesterday in Ontario." The formatter uses `en-CA` and UTC so the date in the file is the date on the page.

The only client script is the theme toggle. It reads `localStorage`, falls back to `prefers-color-scheme`, and flips a `dark` class on the document. No accounts. If the inline boot script in the layout has already run, there should be no flash of the wrong theme.

## Editorial column, not a portfolio grid

The goal was an editorial-like column. A regular portfolio grid would have been the wrong site type.

- **Measure over chrome.** Main column is `max-w-4xl`. Nav is the name, Blog, Contact, and the theme control.
- **One accent.** Teal (`#0f766e`, lighter in dark mode) for labels, links, and the current nav item. Everything else is ink on paper.
- **Paper.** Cream in light mode (`#f6f1e8`), near-black green-gray in dark (`#141716`). Default follows the OS; the toggle remains.
- **Still type.** A darker theatrical version with pointer-tilt and scroll-in 3D was fun for a day—not for a site that is mostly notes.

<img
  src="/me/images/blog/this-site-light.webp"
  alt="Home in light mode: cream paper, a teal Ontario, Canada label, serif name, and Latest Post showing openChecker."
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

About page, projects index, analytics, and a CMS were skipped—not go-live requirements; they can wait. RSS, sitemap, and `llms.txt` did ship; they generate from the same post files.

## Push to main is the deploy

GitHub Actions checks out the repo, `withastro/action` installs and builds, and `deploy-pages` publishes `dist/` (**Settings → Pages → Source: GitHub Actions** once). No database to migrate, no server process to babysit—green build means current site.

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

Drop that in `src/content/blog/`, use a filename worth keeping as the URL, and push. The index, homepage Latest list, and post page all read from the same collection.

## Verification after deploy

Treat a green GitHub Actions run as necessary, not sufficient. The failure modes that bite project sites are almost all about `base`, asset paths, and stale CDN—not TypeScript errors.

After `npm run build` locally, open `dist/index.html` and confirm linked CSS and favicon URLs start with `/me/` when `base` is `'/me'`. A build that works on `localhost:4321/me/` but ships root-relative `/assets/...` links will look unstyled on Pages until you fix `site`/`base` or the `withBase()` helper.

On the live host, spot-check three URLs in a private window (no service-worker cache from an old tab):

```text
https://<user>.github.io/me/
https://<user>.github.io/me/blog/
https://<user>.github.io/me/blog/<one-known-slug>/
```

Each should return 200, load fonts, and show the theme toggle. Hard-refresh once; GitHub Pages can lag a minute behind a green deploy.

Content collections fail closed: delete `date` from a draft locally and run `npm run build`. Astro should error before `dist/` is trustworthy. That is the check that frontmatter drift does not become a silent 404 in production.

If you add RSS, sitemap, or `llms.txt`, fetch them too—generators often emit absolute URLs, and a wrong `site` in `astro.config` shows up there first:

```text
https://<user>.github.io/me/sitemap-index.xml
https://<user>.github.io/me/rss.xml
```

Theme persistence is the only client state worth clicking through: toggle dark, reload, confirm `localStorage` and the inline boot script agree (no flash to light on a dark preference). No accounts means no server-side session to debug when something looks wrong.

## Sources

- [Astro](https://docs.astro.build): content collections, GitHub Pages, `base`
- [Tailwind CSS](https://tailwindcss.com/docs)
- [GitHub Pages](https://docs.github.com/en/pages)
- Related: [Static sites: helping agents discover yours](/me/blog/helping-agents-discover-a-static-site/), [Archify: drawn from this repo](/me/blog/archify-drawn-from-this-repo/)
