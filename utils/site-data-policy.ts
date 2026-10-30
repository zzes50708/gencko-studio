/** 僅宣告頁面依賴；會員驗證與全站設定不混在大型目錄載入內。 */
export function pageDataNeeds(path: string) {
  const root = path.split(/[?#]/)[0].split('/')[1] || ''
  return {
    inventory: ['home', 'shop', 'compare', 'breeders', 'product', 'profile'].includes(root),
    articles: ['home', 'articles'].includes(root),
    genes: root === 'genes',
    merchandise: root === 'merch',
    auctions: ['home', 'shop', 'product', 'auction'].includes(root)
  }
}
