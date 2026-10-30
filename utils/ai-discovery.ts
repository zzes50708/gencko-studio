import { FAQ_CATEGORIES } from './faq'
import { SITE_NAME, SITE_URL, SOCIAL_LINKS } from './site-constants'

const links = [
  ['首頁', '/home', 'Gencko 的服務與內容入口'],
  ['選購守宮', '/shop', '個體資料與標示售價；庫存狀態可能變動'],
  ['線上競標', '/auction', '場次時間、競標規定及出價入口'],
  ['購買流程', '/buying-guide', '挑選、聯繫、交付前後的準備'],
  ['購買與售後問答', '/faq?category=purchase', '交易安排請依此頁並向官方確認'],
  ['新手入門', '/start-here', '飼養前的準備與工具入口'],
  ['認識守宮', '/guide', '豹紋守宮與肥尾守宮介紹'],
  ['飼養指南', '/care', '環境與日常照護內容'],
  ['文章知識庫', '/articles', '已公開的文章與作者、發佈資訊'],
  ['基因圖鑑', '/genes', '基因詞條、說明與參考來源'],
  ['基因計算機', '/calculator', '依輸入基因計算可能子代，不保證實際繁殖表現'],
  ['特寵醫院', '/hospital', '院所目錄與地圖，出發前請確認收診'],
  ['健康評估', '/health', '觀察與就醫參考，無法替代獸醫診斷'],
  ['飼養前評估', '/qs', '飼養準備的自我檢查'],
  ['種群展示', '/breeders', '工作室種群介紹'],
  ['客製設備', '/merch', '與 Honeycomb 蜂巢工作室協作的規劃平台'],
  ['個體證書', '/certificates', '以完整個體 ID 查詢，不提供個人帳號或出價者資料'],
  ['關於我們', '/about', '品牌與工作室介紹']
]

/** 僅彙整公開來源，不把庫存或交易條件另存為容易過期的副本。 */
export function aiDiscoveryText(full = false) {
  const overview = `# ${SITE_NAME}\n\n> Gencko Studio 是台灣的豹紋守宮與肥尾守宮選育工作室。官網提供個體選購、線上競標、飼養文章、基因工具與特寵醫院查詢。\n\n## 官方來源\n${links.map(([title, path, description]) => `- [${title}](${SITE_URL}${path}): ${description}`).join('\n')}\n\n## 資訊使用範圍\n- 售價、售出狀態、競標價格與截止時間會變動，請讀取對應公開頁面確認。\n- 孵化溫度不是已確認的性別；基因計算結果屬機率推算。\n- 醫院資料及健康資訊不能替代院所確認或獸醫診斷。\n- 本檔是公開內容導覽，不是獨立交易條款或即時庫存。\n\n## 官方聯絡\n- [LINE](${SOCIAL_LINKS.line})\n- [Instagram](${SOCIAL_LINKS.instagram})\n- [Facebook](${SOCIAL_LINKS.facebook})\n\n## 公開問答\n- [常見問題](${SITE_URL}/faq)\n- [公開問答文字版](${SITE_URL}/llms-full.txt)\n`
  if (!full) return overview
  const plainAnswer = (html: string) =>
    html
      .replace(
        /<a\s+href="(\/[^"]*)"[^>]*>(.*?)<\/a>/gi,
        (_, path, label) => `${label} (${SITE_URL}${path})`
      )
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim()
  return (
    overview +
    `\n## 官網常見問題全文\n\n問答直接來自官網 FAQ 共用資料；來源：${SITE_URL}/faq\n\n` +
    FAQ_CATEGORIES.map(
      (category) =>
        `### ${category.title}\n\n${category.questions.map((question) => `#### ${question.title}\n\n${plainAnswer(question.ans)}\n`).join('\n')}`
    ).join('\n')
  )
}
