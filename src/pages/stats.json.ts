import type { APIRoute } from 'astro'
import { version as astroVersion } from 'astro/package.json'
import { buildSiteStats } from '../lib/stats'

export const GET: APIRoute = async () => {
  const stats = await buildSiteStats(`Astro v${astroVersion}`)

  return new Response(JSON.stringify(stats, null, 2) + '\n', {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}
