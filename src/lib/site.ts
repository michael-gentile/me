import { siteMeta } from '../config'
import { withBase } from './url'

export const siteOrigin = () => import.meta.env.SITE.replace(/\/$/, '')

export const absoluteUrl = (path: string) =>
  new URL(withBase(path), `${siteOrigin()}/`).href

export const homeUrl = () => absoluteUrl('/')

export const personJsonLd = () => ({
  '@type': 'Person',
  '@id': `${homeUrl()}#person`,
  name: siteMeta.name,
  jobTitle: siteMeta.role,
  url: homeUrl(),
  sameAs: [siteMeta.linkedinUrl, siteMeta.githubUrl],
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Ontario',
    addressCountry: 'CA',
  },
})

export const websiteJsonLd = () => ({
  '@type': 'WebSite',
  '@id': `${homeUrl()}#website`,
  name: siteMeta.name,
  description: siteMeta.description,
  url: homeUrl(),
  inLanguage: 'en-CA',
  publisher: { '@id': `${homeUrl()}#person` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${absoluteUrl('/blog')}?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
})
