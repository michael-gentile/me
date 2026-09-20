---
title: "The stack behind this site"
date: 2026-05-15
tags:
  - astro
  - github-pages
  - tailwind-css
summary: "Astro, markdown posts, Tailwind, GitHub Pages. I push to main and it ships."
---

I've always wanted a personal site where I could post about the odd technical adventure here and there. I wanted this to be my inaugural blog post so I could remember why I kept the stack for this site so small.

## Constraint

I didn't want this site to be complex. I wanted it to be easy to maintain and easy to contribute content. There's no CMS here. No contact-form backend. It's just HTML on a CDN, plus a small script to toggle the theme. All posts are markdown files and with a simple git push, I can keep it up to date. 

## Routes

The layout is pretty simple as well.

- Home: a super brief introduction about myself
- Blog: dated markdown posts about things here and there that I'm tinkering with
- Contact: links to my LinkedIn and GitHub for those who want to check out the code for the site

Templates read various things like Name, tagline, and links from `src/config.ts`. This helps me avoid hunting down strings in a sea of markdown.

Posts are markdown files in `src/content/blog/`. Frontmatter is the contract: `title`, `date`, `summary`, optional `tags`. The filename is the URL slug. Astro checks that shape at build time. A missing date fails the build instead of shipping a broken page.

## Stack

| Piece     | Choice                         | Why                                                                                   |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| Generator | [Astro](https://astro.build)   | Pages compile to static HTML. I only use JavaScript where needed.      |
| Posts     | Markdown + content collections | A new post is a new `.md` file. No admin UI, no database.                             |
| Styling   | Tailwind CSS                   | One palette, utility classes, no growing CSS architecture.                            |
| Type      | Newsreader + Source Sans 3     | Serif for titles, sans for body. Editorial, not a dashboard.                          |
| Colour    | Cream paper, teal accent       | Light and dark share the same tokens; dark is a class on `<html>`, not a second site. |
| Hosting   | GitHub Pages                   | HTTPS and a CDN-shaped host. Deploy is an Action on push to `main`.                   |
| Contact   | LinkedIn (GitHub second)       | No form endpoint to run or abuse.                                                     |

I'm cool with this being a GitHub Pages *project* site. And until I attach a custom domain, it will remain that way. The public URL sits under `/me`. Astro's `base` is `'/me'` and every internal link goes through a small `withBase()` helper so CSS, the favicon, and routes still resolve on Pages. Locally it looks the same: `http://localhost:4321/me/`.

If I do end up using a custom domain one day, `site` becomes that URL, `base` becomes `'/'`, and a `CNAME` file goes in `public/`. The rest of the tree doesn't change.

## How a page is built

Astro renders `.astro` templates at build time. `BaseLayout.astro` is the shell: fonts, metadata, header, footer, the paper background. Each route fills the middle.

I don't hand-write a page type per post. `src/pages/blog/[slug].astro` asks the collection for every markdown file, then `getStaticPaths` emits one HTML file per post. The body is ordinary markdown (headings, lists, tables, the occasional screenshot) inside a `prose` column capped around `65ch`.

Dates in frontmatter are UTC. `2026-05-10` means that calendar day, not "midnight UTC which is still yesterday in Ontario." The formatter uses `en-CA` and UTC so the date in the file is the date on the page.

The only client script is the theme toggle. It reads `localStorage`, falls back to `prefers-color-scheme`, and flips a `dark` class on the document. No accounts. If the inline boot script in the layout has already run, you shouldn't see a flash of the wrong theme.

## Design

I wanted this to have an editorial-like column layout. A regular portfolio grid would have been the wrong type of site.

- **Measure over chrome.** Main column is `max-w-3xl` / `65ch`. Nav is the name, Blog, Contact, and the theme control.
- **One accent.** Teal (`#0f766e`, lighter in dark mode) for labels, links, and the current nav item. Everything else is ink on paper.
- **Paper.** Cream in light mode (`#f6f1e8`), near-black green-gray in dark (`#141716`). The default follows the OS but the toggle is there as well.
- **Still type.** I tried a darker, more theatrical version with pointer-tilt and scroll-in 3D. Fun for a day. I didn't like it for a site that's mostly notes.

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

I skipped an About page, a projects index, analytics, and a CMS. I didn't see those as go-live requirements and ultimately, they can be added later. None of them are required to publish a note. However, I did ship an RSS, a sitemap, and an llms.txt catalog. They're generated from the same post files.

## Deploy

Deploying is a piece of cake. Push to `main`. GitHub Actions checks out the repo, `withastro/action` installs and builds, `deploy-pages` publishes `dist/`. I have to set **Settings → Pages → Source: GitHub Actions** once. After that the pipeline is the site.

This workflow means there is no database to migrate, no server process to babysit. If the build is green, everything is candy.

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

Drop that in `src/content/blog/`, use a filename you're willing to keep as the URL, and push. The index, the homepage Latest list, and the post page all read from the same collection.

## Sources

- [Astro](https://docs.astro.build): content collections, GitHub Pages, `base`
- [Tailwind CSS](https://tailwindcss.com/docs)
- [GitHub Pages](https://docs.github.com/en/pages)
