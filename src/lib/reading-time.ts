const WORDS_PER_MINUTE = 200

const wordCount = (markdown: string) => {
  const text = markdown.trim()

  if (!text) {
    return 0
  }

  return text.split(/\s+/).length
}

export const readingMinutes = (markdown: string) => {
  const words = wordCount(markdown)
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

export const formatReadingTime = (minutes: number) =>
  minutes === 1 ? '1 min read' : `${minutes} min read`

export const readingDurationIso = (minutes: number) => `PT${minutes}M`
