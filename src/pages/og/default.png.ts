import type { APIRoute } from 'astro'
import { siteMeta } from '../../config'
import { renderOgImage } from '../../lib/og'

export const prerender = true

export const GET: APIRoute = async () => {
  const png = await renderOgImage({
    title: siteMeta.name,
    eyebrow: 'Personal site',
  })

  return new Response(Buffer.from(png), {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
