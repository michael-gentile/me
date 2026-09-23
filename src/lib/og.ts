import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { siteMeta } from '../config'

const WIDTH = 1200
const HEIGHT = 630

const PAPER = '#f6f1e8'
const INK = '#1c1917'
const MUTED = '#78716c'
const ACCENT = '#0f766e'
const LINE = '#e7e0d4'

type OgImageOptions = {
  title: string
  eyebrow?: string
}

let fontCache: { serif: ArrayBuffer; sans: ArrayBuffer } | null = null

const loadFonts = async () => {
  if (fontCache) {
    return fontCache
  }

  const root = process.cwd()
  const [serif, sans] = await Promise.all([
    readFile(
      join(root, 'node_modules/@fontsource/newsreader/files/newsreader-latin-600-normal.woff')
    ),
    readFile(
      join(
        root,
        'node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff'
      )
    ),
  ])

  fontCache = {
    serif: serif.buffer.slice(serif.byteOffset, serif.byteOffset + serif.byteLength),
    sans: sans.buffer.slice(sans.byteOffset, sans.byteOffset + sans.byteLength),
  }

  return fontCache
}

const wrapTitle = (title: string) => {
  if (title.length <= 72) {
    return title
  }

  return `${title.slice(0, 69).trimEnd()}…`
}

export const renderOgImage = async ({
  title,
  eyebrow = 'Personal notes',
}: OgImageOptions): Promise<Uint8Array> => {
  const fonts = await loadFonts()
  const displayTitle = wrapTitle(title)

  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px',
          backgroundColor: PAPER,
          backgroundImage:
            'radial-gradient(ellipse 90% 70% at 50% -10%, rgba(255,252,245,0.95), transparent 55%), radial-gradient(ellipse 50% 40% at 100% 100%, rgba(15,118,110,0.08), transparent 55%)',
          borderBottom: `8px solid ${ACCENT}`,
        },
        children: [
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      color: MUTED,
                      fontFamily: 'Source Sans 3',
                      fontSize: 28,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    },
                    children: [
                      {
                        type: 'div',
                        props: {
                          style: {
                            width: 36,
                            height: 3,
                            backgroundColor: ACCENT,
                          },
                        },
                      },
                      eyebrow,
                    ],
                  },
                },
                {
                  type: 'div',
                  props: {
                    style: {
                      color: INK,
                      fontFamily: 'Newsreader',
                      fontSize: displayTitle.length > 48 ? 58 : 68,
                      fontWeight: 600,
                      lineHeight: 1.15,
                      letterSpacing: '-0.02em',
                      maxWidth: 980,
                    },
                    children: displayTitle,
                  },
                },
              ],
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: `1px solid ${LINE}`,
                paddingTop: 28,
                color: MUTED,
                fontFamily: 'Source Sans 3',
                fontSize: 28,
              },
              children: [
                {
                  type: 'div',
                  props: {
                    style: {
                      color: INK,
                      fontFamily: 'Newsreader',
                      fontSize: 32,
                      fontWeight: 600,
                    },
                    children: siteMeta.name,
                  },
                },
                {
                  type: 'div',
                  props: {
                    children: 'michael-gentile.github.io/me',
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        {
          name: 'Newsreader',
          data: fonts.serif,
          weight: 600,
          style: 'normal',
        },
        {
          name: 'Source Sans 3',
          data: fonts.sans,
          weight: 400,
          style: 'normal',
        },
      ],
    }
  )

  const resvg = new Resvg(svg, {
    fitTo: {
      mode: 'width',
      value: WIDTH,
    },
  })

  return resvg.render().asPng()
}
