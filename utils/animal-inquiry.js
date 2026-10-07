export const getAnimalInquiryText = (item) =>
  `Hi Gencko，我想詢問 ${item.Morph || '守宮'}（ID：${item.ID}）\nhttps://www.genckobreeding.com/product/${encodeURIComponent(item.ID)}`
export const getLineMessageLink = (lineLink, text) => {
  const id = lineLink.match(/\/R\/(?:ti\/p|oaMessage)\/([^/?]+)/)?.[1]
  return id
    ? `https://line.me/R/oaMessage/${encodeURIComponent(decodeURIComponent(id))}/?${encodeURIComponent(text)}`
    : lineLink
}
export const getAnimalInquiryLink = (lineLink, item) =>
  getLineMessageLink(lineLink, getAnimalInquiryText(item))
export const getWishlistInquiryLink = (lineLink, ids) =>
  getLineMessageLink(
    lineLink,
    `Hi Gencko，我想詢問收藏的守宮（共 ${ids.length} 隻）\nID：${ids.join(', ')}`
  )
