export function hasAuctionProvider(user: any) {
  const metadata = user?.app_metadata
  const providers = Array.isArray(metadata?.providers) ? metadata.providers : []
  return [metadata?.provider, ...providers].some(
    (provider) => provider === 'custom:line' || provider === 'custom:line-oauth'
  )
}

export function memberFromSupabaseUser(user: any) {
  if (!user?.id) return null
  const primary = user.app_metadata?.provider
  const providers = Array.isArray(user.app_metadata?.providers) ? user.app_metadata.providers : []
  // 舊 email 帳號後來綁定 Google／LINE 時，主要 provider 可能仍為 email。
  // 與伺服器相同，只採用受信任的 app_metadata 供應商清單。
  const provider = ['google', 'custom:line', 'custom:line-oauth'].includes(primary)
    ? primary
    : providers.includes('google')
      ? 'google'
      : providers.find((value: string) => ['custom:line', 'custom:line-oauth'].includes(value))
  const type = ['custom:line', 'custom:line-oauth'].includes(provider)
    ? 'line'
    : provider === 'google'
      ? 'google'
      : 'other'
  // user_metadata 僅供畫面顯示，不用於伺服器授權判斷。
  const display = user.user_metadata || {}
  return {
    id: user.id,
    type,
    authSource: 'supabase',
    auctionAdmin: user.app_metadata?.auction_admin === true,
    auctionBidder: hasAuctionProvider(user),
    email: user.email || null,
    name:
      display.name ||
      display.full_name ||
      display.display_name ||
      user.email?.split('@')[0] ||
      (type === 'line' ? 'LINE會員' : '會員'),
    picture: display.avatar_url || display.picture || null
  }
}

export function isAuctionMember(member: any) {
  return !!(
    member &&
    (member.type === 'google' ||
      (member.type === 'line' && member.authSource === 'supabase' && member.id))
  )
}

export function memberOwnerKeys(member: any) {
  return [
    ...new Set([member?.id, member?.email].filter((value) => typeof value === 'string' && value))
  ]
}

// 歷史 Google 紀錄仍可查閱；新的出價只接受已登入的 LINE 身分。
export function canPlaceAuctionBid(member: any) {
  return !!(
    member?.id &&
    member.authSource === 'supabase' &&
    (member.type === 'line' || member.auctionBidder === true)
  )
}
