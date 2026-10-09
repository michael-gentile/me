// @ts-check
import { defineConfig, fontProviders } from 'astro/config'
import sitemap from '@astrojs/sitemap'
import { satteri } from '@astrojs/markdown-satteri'
import tailwindcss from '@tailwindcss/vite'
import { codeBlockPlugin } from './src/lib/rehype-code-block.ts'

// GitHub Pages project site until a custom domain is attached.
// After a custom domain, set `site` to that URL and `base` to '/'.
export default defineConfig({
  site: 'https://michael-gentile.github.io',
  base: '/me',
  trailingSlash: 'always',
  integrations: [sitemap()],
  markdown: {
    // Keep Sätteri (Astro 7 default); hastPlugins run after Shiki highlighting.
    processor: satteri({
      hastPlugins: [codeBlockPlugin],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@resvg/resvg-js'],
    },
    ssr: {
      external: ['@resvg/resvg-js', 'satori'],
    },
  },
  fonts: [
    {
      name: 'Newsreader',
      cssVariable: '--font-newsreader',
      provider: fontProviders.google(),
      weights: ['500 700'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['serif'],
      display: 'swap',
    },
    {
      name: 'Source Sans 3',
      cssVariable: '--font-source-sans',
      provider: fontProviders.google(),
      weights: ['400 600'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
      display: 'swap',
    },
    {
      name: 'Source Sans 3',
      cssVariable: '--font-source-sans',
      provider: fontProviders.google(),
      weights: [400],
      styles: ['italic'],
      subsets: ['latin'],
      fallbacks: ['sans-serif'],
      display: 'swap',
    },
  ],
})
