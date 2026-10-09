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

export type TagCount = {
  tag: string
  count: number
}

/** Tags with counts, sorted by frequency (desc), then name — same rule as site stats. */
export const tagsByPopularity = (posts: CollectionEntry<'blog'>[]): TagCount[] => {
  const tagCounts = new Map<string, number>()

  for (const post of posts) {
    for (const tag of post.data.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort(
      (left, right) =>
        right.count - left.count || left.tag.localeCompare(right.tag)
    )
}

export const blogFilterHref = (tag?: string) => {
  const path = withBase('/blog')

  if (!tag) {
    return path
  }

  return `${path}?tag=${encodeURIComponent(tag)}`
}

/** Shared by SSR blog index and client PostFilter — keep rules identical. */
export const postMatchesFilter = (
  titleLower: string,
  tagsLower: string[],
  query: string,
  activeTagLower: string
) => {
  const matchesQuery =
    !query ||
    titleLower.includes(query) ||
    tagsLower.some((tag) => tag.includes(query))
  const matchesTag = !activeTagLower || tagsLower.includes(activeTagLower)
  return matchesQuery && matchesTag
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
