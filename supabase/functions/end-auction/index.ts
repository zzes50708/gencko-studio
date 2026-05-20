/**
 * Supabase Edge Function: end-auction
 *
 * 功能：定時掃描已過期的競標場次，自動更新狀態
 *  - auctions.status: 'active' → 'ended'
 *  - animals.status:  'Auction' → 'ForSale'（若最終出價為 0）或保留（待後台確認）
 *
 * 部署指令：
 *   supabase functions deploy end-auction
 *
 * 設定 Cron（在 Supabase Dashboard → Edge Functions → Schedule）：
 *   */5 * * * *   （每 5 分鐘執行一次）
 *
 * 或在 supabase/config.toml 加上：
 * [functions.end-auction]
 * schedule = "*/5 * * * *"
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // 需要 service role 才能修改資料
    )

    const now = new Date().toISOString()

    // 1. 找出所有已過期但仍標記為 active 的競標
    const { data: expiredAuctions, error: fetchErr } = await supabase
      .from('auctions')
      .select('id, animal_id, current_price, start_price')
      .eq('status', 'active')
      .lt('end_time', now)

    if (fetchErr) throw fetchErr
    if (!expiredAuctions || expiredAuctions.length === 0) {
      return new Response(JSON.stringify({ message: '無過期競標', processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    console.log(`[end-auction] 找到 ${expiredAuctions.length} 筆過期競標`)

    // 2. 批次更新 auctions.status → 'ended'
    const auctionIds = expiredAuctions.map((a) => a.id)
    const { error: updateAuctionErr } = await supabase
      .from('auctions')
      .update({ status: 'ended' })
      .in('id', auctionIds)

    if (updateAuctionErr) throw updateAuctionErr

    // 3. 對應的 animals：若有 animal_id 則將 Status 改回 ForSale
    //    （若有人出價，後台人工確認成交後再改 Sold）
    const animalIds = expiredAuctions
      .filter((a) => a.animal_id)
      .map((a) => a.animal_id)

    if (animalIds.length > 0) {
      const { error: updateAnimalErr } = await supabase
        .from('animals')
        .update({ status: 'ForSale' })
        .in('id', animalIds)
        .eq('status', 'Auction') // 只更新仍為 Auction 狀態的個體

      if (updateAnimalErr) throw updateAnimalErr
    }

    const result = {
      message: '成功處理過期競標',
      processed: expiredAuctions.length,
      auctionIds,
      animalIds,
      timestamp: now,
    }

    console.log('[end-auction] 完成：', result)
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[end-auction] 錯誤：', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
