import type { Element } from 'hast'
import type { HastPluginDefinition } from 'satteri'

const readProp = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
    return value[0].trim()
  }

  return undefined
}

const languageFromPre = (node: Element) => {
  const fromData =
    readProp(node.properties?.dataLanguage) ??
    readProp(node.properties?.['data-language'])
  if (fromData) {
    return fromData
  }

  const className = node.properties?.className ?? node.properties?.class
  const classes = Array.isArray(className)
    ? className.map(String)
    : typeof className === 'string'
      ? className.split(/\s+/)
      : []

  for (const entry of classes) {
    const match = /^language-(.+)$/.exec(entry)
    if (match?.[1]) {
      return match[1]
    }
  }

  const codeChild = node.children.find(
    (child): child is Element => child.type === 'element' && child.tagName === 'code'
  )
  const codeClass = codeChild?.properties?.className ?? codeChild?.properties?.class
  const codeClasses = Array.isArray(codeClass)
    ? codeClass.map(String)
    : typeof codeClass === 'string'
      ? codeClass.split(/\s+/)
      : []

  for (const entry of codeClasses) {
    const match = /^language-(.+)$/.exec(entry)
    if (match?.[1]) {
      return match[1]
    }
  }

  const langData = codeChild?.data as { lang?: string } | undefined
  if (typeof langData?.lang === 'string' && langData.lang.trim()) {
    return langData.lang.trim()
  }

  return 'code'
}

/**
 * Sätteri hast plugin: wrap highlighted `pre` with language label + copy control.
 * Copy is revealed by client script; label stays visible without JS.
 */
export const codeBlockPlugin: HastPluginDefinition = {
  name: 'code-block',
  element: {
    filter: ['pre'],
    visit(node) {
      if (
        node.properties?.['data-code-framed'] != null ||
        node.properties?.dataCodeFramed != null
      ) {
        return
      }

      const language = languageFromPre(node as Element)
      const framedPre: Element = {
        ...(node as Element),
        properties: {
          ...(node.properties ?? {}),
          dataCodeFramed: true,
        },
      }

      const figure: Element = {
        type: 'element',
        tagName: 'figure',
        properties: {
          className: ['code-block'],
          dataLanguage: language,
        },
        children: [
          {
            type: 'element',
            tagName: 'figcaption',
            properties: { className: ['code-block__toolbar'] },
            children: [
              {
                type: 'element',
                tagName: 'span',
                properties: { className: ['code-lang'] },
                children: [{ type: 'text', value: language }],
              },
              {
                type: 'element',
                tagName: 'button',
                properties: {
                  type: 'button',
                  className: ['code-copy'],
                  dataCopyCode: true,
                  hidden: true,
                },
                children: [{ type: 'text', value: 'Copy' }],
              },
            ],
          },
          framedPre,
        ],
      }

      return figure
    },
  },
}
