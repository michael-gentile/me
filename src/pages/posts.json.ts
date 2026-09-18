import type { APIRoute } from 'astro'
import { siteMeta } from '../config'
import { sortedPosts, toCatalogItem } from '../lib/catalog'
import { absoluteUrl, homeUrl } from '../lib/site'

export const GET: APIRoute = async () => {
  const posts = (await sortedPosts()).map(toCatalogItem)
  const body = {
    name: siteMeta.name,
    url: homeUrl(),
    description: siteMeta.description,
    llms: absoluteUrl('/llms.txt'),
    rss: absoluteUrl('/rss.xml'),
    openapi: absoluteUrl('/openapi.json'),
    posts,
  }

  return new Response(JSON.stringify(body, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
