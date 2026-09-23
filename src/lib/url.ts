export const withBase = (path: string) => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')

  if (path === '/') {
    return `${base}/`
  }

  const suffix = path.replace(/^\//, '').replace(/\/$/, '')
  const hasFileExtension = /\.[a-z0-9]+$/i.test(suffix)

  if (hasFileExtension) {
    return `${base}/${suffix}`
  }

  return `${base}/${suffix}/`
}

export const isCurrentPath = (pathname: string, href: string) => {
  const current = pathname.replace(/\/$/, '') || '/'
  const target = withBase(href).replace(/\/$/, '') || '/'

  if (current === target) {
    return true
  }

  // Keep Blog current on post pages under /blog/
  if (href === '/blog') {
    return current.startsWith(`${target}/`)
  }

  return false
}
