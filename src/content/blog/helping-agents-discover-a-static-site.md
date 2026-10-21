---
title: "Static sites: helping agents discover yours"
date: 2026-08-18
tags:
  - web
summary: "Dries Buytaert exposed blog search over MCP because he has a live API. This site is HTML on GitHub Pages, so calling it here is GET."
---

Agents that need blog text eventually ask whether there is a *service* to call or only files to fetch. A dynamic site can expose search over MCP or OpenAPI; a GitHub Pages project site has no POST handler, no ranking process, and no honest place to hang `tools/call`—only HTML and static JSON on a CDN. [Dries Buytaert's write-up](https://dri.es/helping-agents-discover-my-site-search-with-mcp) has the right shape for his stack: finding a capability and invoking it are different layers. Here the invocation surface is GET all the way down.

Picture an agent that already knows the site name. It still needs a map (`llms.txt`), a catalog (`posts.json`), OpenAPI for the read-only GET contract, and markdown bodies at stable URLs—not a protocol that expects a server where only a CDN exists.

Below: finding versus calling, what shipped on this host, why MCP would be theatre here, and what actually helps citations.

## Finding a service is not the same as calling it

Dries's useful split: ARD (and friends) handle *finding* a service. OpenAPI and MCP handle *calling* it. Pick discovery **plus** an invocation style.

**Agent Resource Discovery (ARD)** is the draft idea that a client could learn “this origin offers search” from a well-known catalog before it knows the HTTP shape. **MCP (Model Context Protocol)** is a JSON-RPC-style layer—often over stdio or HTTP POST—for listing tools and invoking them with structured arguments. **OpenAPI** describes REST endpoints: paths, methods, and response schemas. None of these replace the others; they stack.

He prefers OpenAPI for an anonymous, read-only API, and MCP when there is multi-step work, auth, or session state. This site is the first case.

IETF API Catalog and well-known URIs at the origin root were skipped because this is a GitHub Pages *project* site under `/me/`. We cannot publish `/.well-known/api-catalog` on `michael-gentile.github.io` from this repo; the [llms.txt v2 spec](https://llmstxt.org/) calls that out (a file at a path describes that path). `/me/llms.txt` is the discovery document this host can actually ship.

## What sits on the wire

| Layer                   | File                              | Who it is for                                                                                           |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Crawlers                | `sitemap-index.xml`, `robots.txt` | Search engines. `robots.txt` here is `/me/robots.txt`, not the origin root. A custom domain fixes that. |
| People and feed readers | `rss.xml`                         | Dated posts. Linked from every page and the footer.                                                     |
| Agents (map)            | `llms.txt`                        | Name, one-paragraph constraints, links to markdown. `rel="describedby"` on every HTML page.             |
| Agents (call)           | `posts.json` + `openapi.json`     | GET the catalog. Filter locally. Then GET the markdown.                                                 |
| Agents (body)           | `/blog/{slug}.md`                 | Same post as HTML, without the chrome. `rel="alternate" type="text/markdown"`.                          |

**llms.txt** is a small, human-readable index: site name, what the site is *not* (no login API here), and pointers to machine-readable detail. **posts.json** is the catalog: slug, title, date, summary, tags, and URLs for HTML and markdown. **openapi.json** documents the GET-only contract so codegen and agent planners treat the site like any other read API.

JSON-LD on every page names a Person and a WebSite. Posts add BlogPosting. Open Graph `article:published_time` is on the post pages. That is SEO and a structured hint for anything that parses HTML instead of the catalog.

## Worked path: from cold start to one post body

Assume the agent has only the GitHub Pages URL. No MCP server, no API key.

**Step 1 — map.** GET `https://michael-gentile.github.io/me/llms.txt`. Parse the markdown links section. Confirm constraints: static hosting, markdown at `/blog/{slug}.md`, catalog at `posts.json`.

**Step 2 — contract (optional but cheap).** GET `openapi.json`. Verify every operation is GET and responses are JSON or markdown text. Store base URL `/me/` so relative paths resolve.

**Step 3 — catalog.** GET `posts.json`. Load the `posts` array into memory. Filter client-side: e.g. `tag === "web"` or substring match on `title` / `summary`. Ranking is yours; the CDN does not run Elasticsearch.

**Step 4 — body.** For the chosen slug, GET `/me/blog/{slug}.md`. That file is the same substance as the HTML article without nav chrome—suitable for citation chunks and RAG without scraping `<div class="prose">`.

**Step 5 — attribute.** Prefer the canonical HTML URL from the catalog for human-facing links; keep `date` and `title` from JSON for citations.

Locally the same paths hang off `http://127.0.0.1:4321/me/` after `npm run dev`.

Try the invocation surface without an MCP client:

```sh
curl -s https://michael-gentile.github.io/me/llms.txt | head
curl -s https://michael-gentile.github.io/me/posts.json | jq '.posts[0]'
curl -s https://michael-gentile.github.io/me/openapi.json | jq '.paths | keys'
curl -s https://michael-gentile.github.io/me/blog/helping-agents-discover-a-static-site.md | head
```

### Verification checklist

| Check | Expected |
| ----- | -------- |
| `llms.txt` returns 200, `text/plain` or `text/markdown` | Links to `posts.json`, sample markdown URL |
| `posts.json` validates as JSON; each post has `slug`, `url`, `markdownUrl` | No POST routes in OpenAPI |
| `{slug}.md` matches HTML title (spot-check one post) | `rel="alternate"` on HTML points to same `.md` |
| `robots.txt` allows crawlers you want | `Allow: /` under `/me/robots.txt` today |
| HTML `<link rel="describedby" href=".../llms.txt">` | Present on home and post templates |

If any step 404s after deploy, check Astro `base`: every public path is prefixed with `/me/` on the project site.

## MCP on Pages would proxy a static file

MCP got simpler in the 2026-07-28 revision: no required session, no init handshake, a POST of JSON. Still a POST. GitHub Pages does not run one. A Cloudflare Worker in front of `posts.json` could pretend to be `tools/call`—still a proxy over a static file. If a registry or desktop client someday demands MCP and nothing else, that Worker is a day's work; it is not what makes the writing findable today.

OpenAPI on a single GET is honest. Anything that can make an HTTP request can use it—Dries's preference for read-only search, minus the search backend.

A honest MCP shim would look like: tool `list_posts` → Worker reads `posts.json` from cache; tool `get_post` → Worker GETs `{slug}.md` from origin or R2 mirror. The *source of truth* remains files in git. The Worker adds latency and an ops surface; it does not add ranking unless you bolt on a database—which is a different product.

## Citations follow fetchable writing

Generative engines cite pages they can fetch, parse, and attribute. The practical list is boring:

- Stable URLs, trailing slashes, a canonical link.
- A real author, same name on the page, in JSON-LD, and on LinkedIn.
- Summaries that describe the note, not a keyword pile.
- Markdown that is the source of truth, also served as markdown.
- Do not block the crawlers you want citations from. `Allow: /` is the policy.

There is no `llms-full.txt` dump of every post. Twenty-odd notes still fit in a context window if concatenated, but the spec asks for a small index and detail on demand. That is what `/me/llms.txt` is.

**Stable slug** means the filename in `src/content/blog/` becomes the path forever—or you accept broken links. **Canonical URL** in `<link rel="canonical">` tells aggregators which URL to dedupe when RSS, OG, and markdown aliases exist.

### Worked path: what a citation-friendly fetch looks like

1. Crawler or agent GETs post HTML.
2. Parses JSON-LD `BlogPosting`: `author`, `datePublished`, `headline`.
3. If it needs plain text, follows `rel="alternate"` to `.md` instead of stripping nav with heuristics.
4. Stores excerpt with URL + date + author string that matches structured data.

If step 3 fails because `.md` 404s or returns HTML by mistake, citations drift to scraped boilerplate (“Blog · Contact · Theme”) instead of the article—fix the alternate link before chasing SEO tricks.

## Big clients still will not auto-discover the catalog

None of this makes ChatGPT or Claude find the catalog on their own. Dries already measured that: API Catalog is a standard, ARD is a draft, and the big clients were not checking either. A custom skill that points at `llms.txt` or `posts.json` remains the reliable path for owned agents. The public files exist so someone else's agent can do the same without scraping the layout.

When a custom domain lands, `robots.txt` and a sitemap move to the origin root, `base` becomes `/`, and these paths lose the `/me` prefix. Update `llms.txt` links in the same commit as the domain cutover so agents do not half-read old paths.

### Skill-shaped integration (today’s reliable path)

Document for your agent: “Base URL `https://…/me/`. Start at `llms.txt`. Use `posts.json` for inventory; never scrape the blog index HTML.” Point a GPT Action or Claude project file at `openapi.json`. Re-run the curl checklist after each deploy that touches routes or `base`.

## Sources

- [Helping agents discover my site search with MCP](https://dri.es/helping-agents-discover-my-site-search-with-mcp): Dries Buytaert
- [The /llms.txt file, v2](https://llmstxt.org/): Jeremy Howard
- [Astro sitemap](https://docs.astro.build/en/guides/integrations-guide/sitemap/) and [RSS](https://docs.astro.build/en/recipes/rss/)
- Related: [Astro: the stack behind this site](/me/blog/the-stack-behind-this-site/), [Archify: drawn from this repo](/me/blog/archify-drawn-from-this-repo/)
