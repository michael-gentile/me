// @ts-check
import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages project site until a custom domain is attached.
// After a custom domain, set `site` to that URL and `base` to '/'.
export default defineConfig({
  site: 'https://michael-gentile.github.io',
  base: '/me',
  trailingSlash: 'always',
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
})
