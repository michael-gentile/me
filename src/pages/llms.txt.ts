import type { APIRoute } from 'astro'
import { buildLlmsTxt, sortedPosts } from '../lib/catalog'

export const GET: APIRoute = async () => {
  const posts = await sortedPosts()

  return new Response(buildLlmsTxt(posts), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
