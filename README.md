# Michael Gentile

I just wanted a place to write down notes on what I'm tinkering with.

Clone it if you want a small personal site of your own. Change the name in `src/config.ts`, drop in your posts, and push. The live copy of this one is [michael-gentile.github.io/me](https://michael-gentile.github.io/me/).

## Run it locally

Node 22.12+.

```sh
git clone git@github.com:michael-gentile/me.git
cd me
npm install
npm run dev
```

Open `http://localhost:4321/me/`. The `/me/` path matches `base` in `astro.config.mjs`.

```sh
npm run build
npm run preview
```

## What's in here

Posts are markdown files in `src/content/blog/`. The blog index can filter by title or tag (search box and tag chips). No CMS, no form backend. Frontmatter `date` is the published date on the page; it can be backdated. Reading time is computed at build from the markdown word count (200 words per minute). Each post page has a collapsible table of contents from the markdown headings, and up to three related posts that share tags. The homepage lists the three latest posts.

Newsreader and Source Sans 3 are downloaded at build and served from this site, so the pages do not wait on fonts.googleapis.com.

Name, tagline, LinkedIn, and GitHub live in `src/config.ts`. The contact page GitHub link is this repository, so point that at yours if you fork.

The same writing also ships as files that crawlers and agents can fetch:

- `/me/llms.txt`: curated index (llms.txt v2, scoped to this GitHub Pages path)
- `/me/posts.json`: catalog (title, date, tags, HTML and markdown URLs)
- `/me/openapi.json`: OpenAPI 3.1 for that catalog
- `/me/rss.xml`: RSS feed
- `/me/blog/{slug}.md`: markdown body for each post
- `/me/sitemap-index.xml` and `/me/robots.txt`

GitHub Pages is static, so there is no search API and no MCP endpoint. Filter `posts.json` locally, then GET the markdown.

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

The filename becomes the URL slug. Screenshots live in `public/images/blog/` and are referenced as `/me/images/blog/filename.webp` so they also work in the markdown alternate.

## GitHub Pages

This repo deploys from `.github/workflows/deploy.yml` on push to `main`.

For your own copy:

1. Create a public GitHub repo and push `main`.
2. In the repo, open Settings, then Pages, and set Source to GitHub Actions.
3. If you rename the repo, change `base` in `astro.config.mjs` to match (this one is `/me`). Image paths in posts start with `/me/` for the same reason.

Until you attach a domain, the URL is `https://<your-github-username>.github.io/<repo>/`. This one is `https://michael-gentile.github.io/me/`.

## Custom domain

To use a custom domain:

1. In `astro.config.mjs`, set `site` to `https://your-domain` and `base` to `'/'`.
2. Add `public/CNAME` containing only that domain.
3. Point DNS at GitHub Pages, then set the custom domain under Settings, Pages.
