import type { APIRoute } from 'astro'
import rss from '@astrojs/rss'
import { siteMeta } from '../config'
import { postPagePath, sortedPosts } from '../lib/catalog'
import { homeUrl } from '../lib/site'
import { withBase } from '../lib/url'

export const GET: APIRoute = async (context) => {
  const posts = await sortedPosts()
  const site = context.site

  if (!site) {
    throw new Error('astro.config site is required to build RSS')
  }

  const feedUrl = homeUrl()

  return rss({
    title: `${siteMeta.name} — Blog`,
    description: siteMeta.description,
    site: feedUrl,
    xmlns: {
      atom: 'http://www.w3.org/2005/Atom',
    },
    customData: `<language>en-CA</language><atom:link href="${new URL(withBase('/rss.xml'), site).href}" rel="self" type="application/rss+xml"/>`,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      categories: [...post.data.tags],
      link: withBase(postPagePath(post)),
    })),
  })
}
