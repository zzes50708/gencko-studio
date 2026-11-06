export const getAnimalInquiryText = (item, { hidePrice = false } = {}) => {
  const lines = [`Hi Gencko，我想詢問 ${item.Morph || '守宮'}（ID：${item.ID}）`]
  const price = Number(item.ListingPrice)
  if (!hidePrice && Number.isFinite(price) && price > 0)
    lines.push(`頁面售價：NT$ ${price.toLocaleString('zh-TW')}`)
  if (item.Status === 'Sold') lines.push('狀態：已售出，詢問個體紀錄')
  lines.push(`https://www.genckobreeding.com/product/${encodeURIComponent(item.ID)}`)
  return lines.join('\n')
}
export const getLineMessageLink = (lineLink, text) => {
  const id = lineLink.match(/\/R\/(?:ti\/p|oaMessage)\/([^/?]+)/)?.[1]
  return id
    ? `https://line.me/R/oaMessage/${encodeURIComponent(decodeURIComponent(id))}/?${encodeURIComponent(text)}`
    : lineLink
}
export const getAnimalInquiryLink = (lineLink, item, options = {}) =>
  getLineMessageLink(lineLink, getAnimalInquiryText(item, options))
export const getWishlistInquiryLink = (lineLink, ids, { items = [], hidePrice = false } = {}) => {
  const uniqueIds = [...new Set(ids)]
  const byId = new Map(items.map((item) => [item.ID, item]))
  const details = uniqueIds.map((id) => {
    const item = byId.get(id)
    return getAnimalInquiryText(item || { ID: id, Morph: '個體資料待確認' }, { hidePrice })
  })
  return getLineMessageLink(
    lineLink,
    `Hi Gencko，我想詢問收藏的守宮（共 ${uniqueIds.length} 隻）\nID：${uniqueIds.join(', ')}\n\n${details.join('\n\n')}`
  )
}
