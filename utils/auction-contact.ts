export const getAuctionContactText = (auctionId: string, memberId: string) =>
  `您好，我要建立競標聯絡資料。\n場次：${auctionId}\n會員編號：${memberId}`
// 官方收件匣使用官方帳號入口；登入 API 的使用者 ID 不是可拼接的聊天網址。
export const OFFICIAL_LINE_INBOX_URL = 'https://chat.line.biz/account/@219abdzn'
