export function hasAuctionProvider(user: any) {
  const metadata = user?.app_metadata
  const providers = Array.isArray(metadata?.providers) ? metadata.providers : []
  return [metadata?.provider, ...providers].some(
    (provider) =>
      provider === 'google' || provider === 'custom:line' || provider === 'custom:line-oauth'
  )
}

export function memberFromSupabaseUser(user: any) {
  if (!user?.id) return null
  const provider = user.app_metadata?.provider
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
