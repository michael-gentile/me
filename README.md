# Michael Gentile

Personal site: a short intro, a blog, and contact links.

- Site: [michael-gentile.github.io/me](https://michael-gentile.github.io/me/)

## Run it locally

Node 22.12+.

```sh
git clone git@github.com:michael-gentile/me.git
cd me
npm install
npm run dev
```

Open `http://localhost:4321/me/`.

```sh
npm run build
npm run preview
```

## Stack

Posts are markdown files in `src/content/blog/`. The blog index can filter by title or tag (search box and tag chips). No CMS, no form backend. Frontmatter `date` is the published date on the page; it can be backdated. Reading time is computed at build from the markdown word count (200 words per minute). Each post page has a collapsible table of contents from the markdown headings, and up to three related posts that share tags. The homepage lists the three latest posts.

Machine-readable copies of the same corpus (for crawlers and agents):

- `/me/llms.txt` — curated index (llms.txt v2, scoped to this GitHub Pages path)
- `/me/posts.json` — catalog (title, date, tags, HTML and markdown URLs)
- `/me/openapi.json` — OpenAPI 3.1 for that catalog
- `/me/rss.xml` — RSS feed
- `/me/blog/{slug}.md` — markdown body for each post
- `/me/sitemap-index.xml` and `/me/robots.txt`

There is no search API and no MCP endpoint. GitHub Pages is static. Filter `posts.json` locally, then GET the markdown.

Name, tagline, LinkedIn, and GitHub live in `src/config.ts`. The contact page GitHub link is this repository.

## Add a post

Create a markdown file in `src/content/blog/`:

```md
---
title: "Post title"
date: 2026-09-15
tags: [llm]
summary: "One or two sentences for the list."
---

Body of the post.
```

The filename becomes the URL slug. Screenshots live in `public/images/blog/` and are referenced as `/me/images/blog/filename.jpg` so they also work in the markdown alternate.

## GitHub Pages

This repo deploys from `.github/workflows/deploy.yml` on push to `main`.

1. Create the GitHub repo `michael-gentile/me` and push `main`.
2. In the repo: **Settings → Pages → Source: GitHub Actions**.

Live URL until you attach a domain: `https://michael-gentile.github.io/me/`.

## Custom domain

To use a custom domain:

1. In `astro.config.mjs`, set `site` to `https://your-domain` and `base` to `'/'`.
2. Add `public/CNAME` containing only that domain.
3. Point DNS at GitHub Pages, then set the custom domain in **Settings → Pages**.

