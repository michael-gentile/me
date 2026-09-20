---
title: "Helping agents discover a static site"
date: 2026-08-18
tags:
  - astro
  - github-pages
summary: "Dries Buytaert exposed blog search over MCP because he has a live API. This site is HTML on GitHub Pages, so calling it here is GET."
---

[Dries Buytaert's write-up](https://dri.es/helping-agents-discover-my-site-search-with-mcp) on exposing site search to agents is the right *shape* of the problem: finding a service and calling it are different layers. I didn't copy his implementation. The architectures aren't the same.

His site has a real search API. Mine is a static Astro build on GitHub Pages. There's no POST and no process that ranks a query. The in-browser filter only hides cards that are already in the HTML. Standing up MCP here would be theatre: a protocol that expects a server, pointed at a CDN that can't answer `tools/call`.

I shipped the pieces that actually fit.

## Finding vs calling

Dries's useful sentence: ARD (and friends) handle *finding* a service. OpenAPI and MCP handle *calling* it. You pick discovery **plus** an invocation style.

He prefers OpenAPI for an anonymous, read-only API, and MCP when you have multi-step work, auth, or session state. I agree. This site is the first case.

I skipped IETF API Catalog and well-known URIs at the origin root. This is a GitHub Pages *project* site. Files live under `/me/`. I can't put `/.well-known/api-catalog` on `michael-gentile.github.io` from this repo. The [llms.txt v2 spec](https://llmstxt.org/) calls that situation out: a file at a path describes that path. `/me/llms.txt` is the discovery document this host can actually publish.

## What shipped

| Layer                   | File                              | Who it is for                                                                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Crawlers                | `sitemap-index.xml`, `robots.txt` | Search engines. `robots.txt` here is `/me/robots.txt`, not the origin root. A custom domain fixes that. |
| People and feed readers | `rss.xml`                         | Dated posts. Linked from every page and the footer.                                                     |
| Agents (map)            | `llms.txt`                        | Name, one-paragraph constraints, links to markdown. `rel="describedby"` on every HTML page.             |
| Agents (call)           | `posts.json` + `openapi.json`     | GET the catalog. Filter locally. Then GET the markdown.                                                 |
| Agents (body)           | `/blog/{slug}.md`                 | Same post as HTML, without the chrome. `rel="alternate" type="text/markdown"`.                          |

JSON-LD on every page names a Person and a WebSite. Posts add BlogPosting. Open Graph `article:published_time` is on the post pages. That's SEO, and a structured hint for anything that parses HTML instead of the catalog.

You can try the invocation surface without an MCP client:

```sh
curl -s https://michael-gentile.github.io/me/llms.txt | head
curl -s https://michael-gentile.github.io/me/posts.json | jq '.posts[0]'
curl -s https://michael-gentile.github.io/me/blog/helping-agents-discover-a-static-site.md | head
```

Locally the same paths hang off `http://127.0.0.1:4321/me/`.

## Why not MCP

MCP got simpler in the 2026-07-28 revision: no required session, no init handshake, a POST of JSON. Still a POST. GitHub Pages doesn't run one. A Cloudflare Worker in front of `posts.json` could pretend to be `tools/call`, and it would still be a proxy over a static file. If a registry or a desktop client someday demands MCP and nothing else, that Worker is a day's work and I'd do it, but it isn't what makes the writing findable.

OpenAPI on a single GET is honest. Anything that can make an HTTP request can use it, which is Dries's preference for read-only search, minus the search.

## GEO is mostly the writing

Generative engines cite pages they can fetch, parse, and attribute. The practical list is boring:

- Stable URLs, trailing slashes, a canonical link.
- A real author, same name on the page, in JSON-LD, and on LinkedIn.
- Summaries that describe the note, not a keyword pile.
- Markdown that is the source of truth, also served as markdown.
- Don't block the crawlers you want citations from. `Allow: /` is the policy.

I didn't add an `llms-full.txt` dump of every post. Twenty-odd notes still fit in a context window if you concatenate them, but the spec asks for a small index and detail on demand. That's what `/me/llms.txt` is.

## Limits

None of this makes ChatGPT or Claude "find" the catalog on their own. Dries already measured that: API Catalog is a standard, ARD is a draft, and the big clients weren't checking either. A custom skill that points at `llms.txt` or `posts.json` is still the reliable path for *my* agents. The public files are so someone else's agent can do the same without scraping the layout.

When a custom domain lands, `robots.txt` and a sitemap move to the origin root, `base` becomes `/`, and these paths lose the `/me` prefix.

## Sources

- [Helping agents discover my site search with MCP](https://dri.es/helping-agents-discover-my-site-search-with-mcp): Dries Buytaert
- [The /llms.txt file, v2](https://llmstxt.org/): Jeremy Howard
- [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) and [RSS](https://docs.astro.build/en/recipes/rss/)
