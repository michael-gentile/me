import type { CollectionEntry } from 'astro:content'
import { siteMeta } from '../config'
import { isoDate, postPagePath, sortedPosts } from './catalog'
import { readingMinutes, wordCount } from './reading-time'
import { absoluteUrl, homeUrl, siteOrigin } from './site'

export type StatsPostRef = {
  id: string
  title: string
  date: string
  minutes: number
  words: number
  url: string
}

export type StatsTagCount = {
  tag: string
  count: number
}

export type StatsYearCount = {
  year: string
  count: number
}

export type SiteStats = {
  generatedAt: string
  gitSha: string | null
  buildTime: string | null
  site: {
    name: string
    url: string
    origin: string
    base: string
    generator: string
    hosting: string
    fonts: string[]
  }
  archive: {
    postCount: number
    totalWords: number
    totalMinutes: number
    medianMinutes: number
    averageMinutes: number
    firstPost: StatsPostRef | null
    latestPost: StatsPostRef | null
    longestPost: StatsPostRef | null
    shortestPost: StatsPostRef | null
  }
  cadence: StatsYearCount[]
  topics: {
    uniqueTags: number
    taggedPosts: number
    untaggedPosts: number
    tags: StatsTagCount[]
  }
  surfaces: {
    label: string
    url: string
  }[]
}

const toPostRef = (post: CollectionEntry<'blog'>, words: number, minutes: number): StatsPostRef => ({
  id: post.id,
  title: post.data.title,
  date: isoDate(post.data.date),
  minutes,
  words,
  url: absoluteUrl(postPagePath(post)),
})

const median = (values: number[]) => {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const mid = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2)
  }

  return sorted[mid]
}

const readBuildStamp = () => {
  const gitSha = (import.meta.env.PUBLIC_GIT_SHA as string | undefined)?.trim() || null
  const buildTime = (import.meta.env.PUBLIC_BUILD_TIME as string | undefined)?.trim() || null
  return {
    gitSha: gitSha ? gitSha.slice(0, 7) : null,
    buildTime,
  }
}

export const buildSiteStats = async (generator: string): Promise<SiteStats> => {
  const posts = await sortedPosts()
  const measured = posts.map((post) => {
    const body = post.body ?? ''
    const words = wordCount(body)
    const minutes = readingMinutes(body)
    return { post, words, minutes, ref: toPostRef(post, words, minutes) }
  })

  const tagCounts = new Map<string, number>()
  let taggedPosts = 0

  for (const { post } of measured) {
    if (post.data.tags.length === 0) {
      continue
    }

    taggedPosts += 1
    for (const tag of post.data.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }
  }

  const tags = [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))

  const yearCounts = new Map<string, number>()
  for (const { post } of measured) {
    const year = isoDate(post.data.date).slice(0, 4)
    yearCounts.set(year, (yearCounts.get(year) ?? 0) + 1)
  }

  const cadence = [...yearCounts.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => left.year.localeCompare(right.year))

  const byMinutesAsc = [...measured].sort((left, right) => left.minutes - right.minutes)
  const totalWords = measured.reduce((sum, item) => sum + item.words, 0)
  const totalMinutes = measured.reduce((sum, item) => sum + item.minutes, 0)
  const minutesList = measured.map((item) => item.minutes)
  const stamp = readBuildStamp()
  const base = import.meta.env.BASE_URL

  return {
    generatedAt: new Date().toISOString(),
    gitSha: stamp.gitSha,
    buildTime: stamp.buildTime,
    site: {
      name: siteMeta.name,
      url: homeUrl(),
      origin: siteOrigin(),
      base,
      generator,
      hosting: 'GitHub Pages (static)',
      fonts: ['Newsreader', 'Source Sans 3'],
    },
    archive: {
      postCount: measured.length,
      totalWords,
      totalMinutes,
      medianMinutes: median(minutesList),
      averageMinutes:
        measured.length === 0 ? 0 : Math.round((totalMinutes / measured.length) * 10) / 10,
      firstPost: measured.length > 0 ? measured[measured.length - 1].ref : null,
      latestPost: measured.length > 0 ? measured[0].ref : null,
      longestPost: byMinutesAsc.length > 0 ? byMinutesAsc[byMinutesAsc.length - 1].ref : null,
      shortestPost: byMinutesAsc.length > 0 ? byMinutesAsc[0].ref : null,
    },
    cadence,
    topics: {
      uniqueTags: tags.length,
      taggedPosts,
      untaggedPosts: measured.length - taggedPosts,
      tags,
    },
    surfaces: [
      { label: 'posts.json', url: absoluteUrl('/posts.json') },
      { label: 'stats.json', url: absoluteUrl('/stats.json') },
      { label: 'llms.txt', url: absoluteUrl('/llms.txt') },
      { label: 'openapi.json', url: absoluteUrl('/openapi.json') },
      { label: 'rss.xml', url: absoluteUrl('/rss.xml') },
      { label: 'sitemap', url: absoluteUrl('/sitemap-index.xml') },
    ],
  }
}
