import { getCollection, type CollectionEntry } from 'astro:content'
import { siteMeta } from '../config'
import { absoluteUrl } from './site'

export const sortedPosts = async () =>
  (await getCollection('blog')).sort(
    (left, right) => right.data.date.valueOf() - left.data.date.valueOf()
  )

export const isoDate = (date: Date) => date.toISOString().slice(0, 10)

export const postPagePath = (post: CollectionEntry<'blog'>) => `/blog/${post.id}`

export const postMarkdownPath = (post: CollectionEntry<'blog'>) =>
  `/blog/${post.id}.md`

export type PostCatalogItem = {
  id: string
  title: string
  date: string
  summary: string
  tags: string[]
  url: string
  markdown: string
}

export const toCatalogItem = (post: CollectionEntry<'blog'>): PostCatalogItem => ({
  id: post.id,
  title: post.data.title,
  date: isoDate(post.data.date),
  summary: post.data.summary,
  tags: [...post.data.tags],
  url: absoluteUrl(postPagePath(post)),
  markdown: absoluteUrl(postMarkdownPath(post)),
})

export const postToMarkdown = (post: CollectionEntry<'blog'>) => {
  const tagLines = post.data.tags.map((tag) => `  - ${tag}`).join('\n')
  const tagBlock = post.data.tags.length > 0 ? `tags:\n${tagLines}\n` : ''
  const body = post.body?.trim() ?? ''

  return `---
title: ${JSON.stringify(post.data.title)}
date: ${isoDate(post.data.date)}
${tagBlock}summary: ${JSON.stringify(post.data.summary)}
---

${body}
`
}

export const buildLlmsTxt = (posts: CollectionEntry<'blog'>[]) => {
  const postLines = posts
    .map((post) => {
      const href = absoluteUrl(postMarkdownPath(post))
      return `- [${post.data.title}](${href}): ${post.data.summary}`
    })
    .join('\n')

  return `# ${siteMeta.name}

> ${siteMeta.role}. Personal site: a short intro, a blog of technical notes, and contact links. Static HTML on GitHub Pages at ${homeScoped()}.

This site has no application server and no search API. The in-browser blog filter only searches titles and tags already on the page. Agents should start here, or with posts.json, then fetch the markdown for a post.

JSON-LD Person and BlogPosting are embedded in the HTML. The catalog at posts.json is the read-only invocation surface: GET, no auth, no session.

## Posts

${postLines}

## Catalog

- [posts.json](${absoluteUrl('/posts.json')}): title, date, tags, summary, HTML URL, and markdown URL for every post
- [openapi.json](${absoluteUrl('/openapi.json')}): OpenAPI 3.1 description of the catalog
- [RSS](${absoluteUrl('/rss.xml')}): dated feed of posts

## Optional

- [Home](${absoluteUrl('/')}): intro and latest posts
- [Blog](${absoluteUrl('/blog')}): HTML index with title and tag filter
- [Contact](${absoluteUrl('/contact')}): LinkedIn, then GitHub
- [Sitemap](${absoluteUrl('/sitemap-index.xml')}): HTML pages for search engines
`
}

const homeScoped = () => absoluteUrl('/')
