import { seoPrice } from './seo-head'

const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )

/** 以既有公開 SSR 目錄提供無 JavaScript 的基本瀏覽，不改寫互動目錄狀態。 */
export function catalogFallbackHtml(
  items: { ID: string; Morph: string; Species: string; ListingPrice: unknown }[],
  species: string
) {
  const rows = items
    .filter((item) => item.ID && item.Species === species)
    .sort((a, b) => (seoPrice(b.ListingPrice) || 0) - (seoPrice(a.ListingPrice) || 0))
    .slice(0, 36)
  if (!rows.length) return ''
  return (
    '<section aria-label="未啟用 JavaScript 的在售個體"><h2>目前在售個體</h2><p>可開啟個體頁查看照片與資訊；啟用 JavaScript 後可使用完整搜尋與篩選。</p><ul>' +
    rows
      .map((item) => {
        const price = seoPrice(item.ListingPrice)
        return `<li><a href="/product/${escapeHtml(encodeURIComponent(item.ID))}">${escapeHtml(item.Morph)} · ${escapeHtml(item.ID)}</a> — ${price ? `NT$ ${price}` : '售價請向官方確認'}</li>`
      })
      .join('') +
    '</ul></section>'
  )
}

/** 自留種群沒有商品售價或可用商品詳情，不產生不存在的購買入口。 */
export function breederFallbackHtml(
  items: {
    ID: string
    Morph: string
    Species: string
    Sex?: string
    Birthday?: string
    Genes?: string[]
  }[]
) {
  const rows = items.filter((item) => item.ID)
  if (!rows.length) return ''
  return (
    '<section aria-label="未啟用 JavaScript 的種群展示"><h2>公開種群</h2>' +
    rows
      .map(
        (item) =>
          `<article id="breeder-${escapeHtml(item.ID)}"><h3>${escapeHtml(item.Species)} · ${escapeHtml(item.Morph)}</h3><p>ID：${escapeHtml(item.ID)}${item.Sex ? ` · ${escapeHtml(item.Sex)}` : ''}${item.Birthday ? ` · ${escapeHtml(item.Birthday)}` : ''}</p>${item.Genes?.length ? `<p>基因：${item.Genes.map(escapeHtml).join('、')}</p>` : ''}</article>`
      )
      .join('') +
    '</section>'
  )
}
