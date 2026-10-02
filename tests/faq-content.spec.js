import { describe, expect, it } from 'vitest'
import { FAQ_CATEGORIES, FAQ_DATA } from '../utils/faq'

const category = (id) => FAQ_CATEGORIES.find((item) => item.id === id)
const question = (categoryId, title) =>
  category(categoryId).questions.find((item) => item.title === title)

describe('FAQ 文案、連結與政策內容', () => {
  it('保留三分類共 31 題並移除答案 inline style', () => {
    expect(FAQ_CATEGORIES).toHaveLength(3)
    expect(FAQ_DATA).toHaveLength(31)
    expect(FAQ_DATA.some((item) => item.ans.includes('style='))).toBe(false)
  })

  it('選購功能說明使用新版控制文字與正確連結', () => {
    expect(question('website', '如何收藏心儀的守宮？').ans).toContain('點擊「收藏」')
    const compare = question('website', '如何同時比較多隻守宮？').ans
    expect(compare).toContain('點擊「加入比較」')
    expect(compare).toContain('前往比較（N）')
    expect(compare).toContain('href="/shop"')
    expect(compare).not.toContain('href="/auction"')
  })

  it('會員說明如實區分本機資料與 Google 競標紀錄', () => {
    const login = question('website', '如何登入會員？支援哪些登入方式？').ans
    expect(login).toContain('LINE 登入')
    expect(login).toContain('Google 登入')
    expect(login).toContain('不會隨登入帳號同步')
    expect(login).toContain('競標紀錄目前需使用 Google 登入後查看')
  })

  it('套用健康上架說明、50% 訂金與孵化性別機率', () => {
    expect(question('purchase', '購買前的須知與權益？（必讀）').ans).toContain(
      '整體狀態穩定後才上架及出貨'
    )
    expect(question('purchase', '可以先付訂金保留個體嗎？').ans).toContain('50% 訂金')
    const sex = question('purchase', '性別判斷準確率如何？').ans
    expect(sex).toContain('孵化溫度')
    expect(sex).toContain('仍不保證性別')
  })

  it('餵食頻率與 care 已驗收資料一致並將 MBD 改為建議口吻', () => {
    const feeding = question('gecko', '豹紋守宮吃什麼？多久餵一次？').ans
    expect(feeding).toContain('幼體（0~6 個月）：每日 1~2 隻')
    expect(feeding).toContain('亞成體（6~12 個月）：每日 1 隻')
    expect(feeding).toContain('成體（1 年以上）：每週 1~2 次，每次 1~2 隻')
    const mbd = question('gecko', '代謝性骨病（MBD）是什麼？怎麼預防？').ans
    expect(mbd).toContain('可能增加發生風險')
    expect(mbd).toContain('請儘快諮詢特寵獸醫')
    expect(mbd).not.toContain('幾乎可預防所有')
  })
})
