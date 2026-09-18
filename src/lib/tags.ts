import type { CollectionEntry } from 'astro:content'
import { withBase } from './url'

export const uniquePostTags = (posts: CollectionEntry<'blog'>[]) => {
  const tags = new Set<string>()

  for (const post of posts) {
    for (const tag of post.data.tags) {
      tags.add(tag)
    }
  }

  return [...tags].sort((left, right) => left.localeCompare(right))
}

export const blogFilterHref = (tag?: string) => {
  const path = withBase('/blog')

  if (!tag) {
    return path
  }

  return `${path}?tag=${encodeURIComponent(tag)}`
}

export const relatedByTags = (
  current: CollectionEntry<'blog'>,
  posts: CollectionEntry<'blog'>[],
  limit = 3
) => {
  const tags = new Set(current.data.tags)

  if (tags.size === 0) {
    return []
  }

  return posts
    .filter((post) => post.id !== current.id)
    .map((post) => ({
      post,
      overlap: post.data.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter((entry) => entry.overlap > 0)
    .sort((left, right) => {
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap
      }

      return right.post.data.date.valueOf() - left.post.data.date.valueOf()
    })
    .slice(0, limit)
    .map((entry) => entry.post)
}
