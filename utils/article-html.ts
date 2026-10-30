import sanitizeHtml from 'sanitize-html'

/** 公開文章只保留閱讀內容；SSR 與瀏覽器使用相同白名單。 */
export function cleanArticleHtml(value: unknown): string {
  return sanitizeHtml(String(value ?? ''), {
    allowedTags: [
      'p',
      'br',
      'hr',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'div',
      'span',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'del',
      'sup',
      'sub',
      'blockquote',
      'ul',
      'ol',
      'li',
      'dl',
      'dt',
      'dd',
      'pre',
      'code',
      'a',
      'img',
      'figure',
      'figcaption',
      'table',
      'caption',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td'
    ],
    allowedAttributes: {
      '*': ['id', 'style'],
      a: ['href', 'title', 'target', 'rel', 'class'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding', 'style'],
      th: ['colspan', 'rowspan', 'scope'],
      td: ['colspan', 'rowspan'],
      ol: ['start', 'reversed']
    },
    allowedClasses: { a: ['auto-gene-link'] },
    allowedSchemes: ['https', 'http', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['https', 'http'] },
    allowProtocolRelative: false,
    allowedStyles: {
      '*': {
        'text-align': [/^(?:left|center|right|justify)$/],
        'font-weight': [/^(?:normal|bold|[1-9]00)$/],
        color: [/^#[0-9a-f]{3,8}$/i],
        'background-color': [/^#[0-9a-f]{3,8}$/i]
      },
      img: { 'aspect-ratio': [/^\d+\s*\/\s*\d+$/], 'object-fit': [/^contain$/] }
    },
    transformTags: {
      h1: 'h2',
      a: (_tag, attributes) => ({
        tagName: 'a',
        attribs: {
          ...attributes,
          ...(attributes.target === '_blank' ? { rel: 'noopener noreferrer' } : {})
        }
      }),
      img: (_tag, attributes) => {
        const dimension = (v: string) => (/^\d{1,5}$/.test(v || '') && +v > 0 ? v : '')
        const width = dimension(attributes.width),
          height = dimension(attributes.height)
        return {
          tagName: 'img',
          attribs: {
            ...attributes,
            width,
            height,
            loading: 'lazy',
            decoding: 'async',
            // 沒有尺寸的舊文章以固定畫框保留位置，contain 保留完整圖片。
            style: `aspect-ratio: ${width && height ? `${width} / ${height}` : '3 / 2'}; object-fit: contain`
          }
        }
      }
    }
  })
}
