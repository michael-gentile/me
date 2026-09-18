export const formatPostDate = (
  date: Date,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
) => {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'UTC',
    ...options,
  })
}
