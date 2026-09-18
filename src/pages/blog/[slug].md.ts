import type { APIRoute } from 'astro'
import { getCollection, type CollectionEntry } from 'astro:content'
import { postToMarkdown } from '../../lib/catalog'

export const getStaticPaths = async () => {
  const posts = await getCollection('blog')
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }))
}

type Props = {
  post: CollectionEntry<'blog'>
}

export const GET: APIRoute<Props> = ({ props }) =>
  new Response(postToMarkdown(props.post), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  })
