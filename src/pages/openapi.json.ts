import type { APIRoute } from 'astro'
import { siteMeta } from '../config'
import { homeUrl } from '../lib/site'
import { withBase } from '../lib/url'

export const GET: APIRoute = () => {
  const spec = {
    openapi: '3.1.0',
    info: {
      title: `${siteMeta.name} post catalog`,
      version: '1.0.0',
      description:
        'Read-only catalog of posts on this static site. There is no search RPC. Fetch this list and filter locally, then GET the markdown URL for a post body.',
    },
    servers: [{ url: homeUrl().replace(/\/$/, '') }],
    paths: {
      [withBase('/posts.json')]: {
        get: {
          operationId: 'listPosts',
          summary: 'List posts',
          responses: {
            '200': {
              description: 'Catalog of posts with HTML and markdown URLs',
            },
          },
        },
      },
      [withBase('/llms.txt')]: {
        get: {
          operationId: 'llmsTxt',
          summary: 'LLM-oriented index of the site',
          responses: {
            '200': { description: 'Markdown llms.txt' },
          },
        },
      },
      [withBase('/rss.xml')]: {
        get: {
          operationId: 'rss',
          summary: 'RSS feed of posts',
          responses: {
            '200': { description: 'RSS 2.0' },
          },
        },
      },
    },
  }

  return new Response(JSON.stringify(spec, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
