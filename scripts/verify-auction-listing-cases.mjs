import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

// 只由獨立 PostgreSQL 測試器載入，不接受遠端資料庫設定。
export async function runListingChecks({
  check,
  control,
  connect,
  admin,
  user,
  bid,
  clients,
  waitForLock
}) {
  const managers = await Promise.all(Array.from({ length: 8 }, () => connect(admin)))
  const animal = async (id, fields = {}) => {
    await control.query(
      'insert into public.animals(id,morph,image_url,images,status,is_breeder,cost_price,buyer_contact) values($1,$2,$3,$4,$5,$6,1234,$7)',
      [
        id,
        fields.morph ?? '隔離測試品系',
        fields.cover ?? 'https://example.invalid/cover.jpg',
        fields.images ?? [],
        fields.status ?? 'NotForSale',
        fields.breeder ?? false,
        '不應回傳的買家資料'
      ]
    )
  }
  const defaults = () => ({
    request: randomUUID(),
    price: 200,
    increment: 100,
    start: null,
    end: new Date(Date.now() + 3600000).toISOString()
  })
  const publish = (client, id, p = defaults()) =>
    client.query(
      'select private.admin_create_auction($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) as receipt',
      [
        p.request,
        id,
        p.price,
        p.increment,
        p.start,
        p.end,
        '個體注意事項',
        '黑貓 +180 元；三重面交免運',
        '冷凍蟋蟀/杜比亞',
        '1-2天/次',
        '是'
      ]
    )
  const count = async (id) =>
    Number(
      (await control.query('select count(*) as n from public.auctions where animal_id=$1', [id]))
        .rows[0].n
    )
  const candidates = async (client, id) =>
    (await client.query('select private.admin_auction_candidates($1) as items', [id])).rows[0].items
  await check('同個體八筆不同上架請求並發，僅一場成立且只有該個體改為競標', async () => {
    await animal('LIST-RACE')
    await animal('LIST-UNCHANGED')
    const results = await Promise.allSettled(managers.map((c) => publish(c, 'LIST-RACE')))
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 1)
    assert.ok(
      results.filter((r) => r.status === 'rejected').every((r) => r.reason.code === '22023')
    )
    assert.equal(await count('LIST-RACE'), 1)
    const rows = (
      await control.query(
        "select id,status from public.animals where id in ('LIST-RACE','LIST-UNCHANGED') order by id"
      )
    ).rows
    assert.deepEqual(rows, [
      { id: 'LIST-RACE', status: 'Auction' },
      { id: 'LIST-UNCHANGED', status: 'NotForSale' }
    ])
  })
  await check('同筆上架並發重送只回傳同一場，截止及個體狀態改變後仍可查回原回執', async () => {
    await animal('LIST-REPLAY')
    const p = defaults()
    const results = await Promise.all(managers.map((c) => publish(c, 'LIST-REPLAY', p)))
    assert.equal(new Set(results.map((r) => r.rows[0].receipt.id)).size, 1)
    assert.equal(results.filter((r) => !r.rows[0].receipt.replayed).length, 1)
    assert.equal(await count('LIST-REPLAY'), 1)
    const id = results[0].rows[0].receipt.id
    assert.equal(
      (
        await control.query(
          "select count(*) as n from private.auction_workflow_events where auction_id=$1 and event='auction_published'",
          [id]
        )
      ).rows[0].n,
      '1'
    )
    await control.query("update public.animals set status='Sold' where id='LIST-REPLAY'")
    await control.query(
      "update public.auctions set end_time=clock_timestamp()-interval '1 hour',status='ended' where id=$1",
      [id]
    )
    assert.equal((await publish(control, 'LIST-REPLAY', p)).rows[0].receipt.replayed, true)
    await assert.rejects(
      publish(control, 'LIST-REPLAY', { ...p, price: 300 }),
      (e) => e.code === '22023'
    )
  })
  await check('上架搜尋僅回傳必要欄位，不包含成本及買家聯絡資料', async () => {
    const items = await candidates(control, 'LIST-UNCHANGED')
    assert.equal(items.length, 1)
    assert.ok(!('cost_price' in items[0]))
    assert.ok(!('buyer_contact' in items[0]))
    assert.equal(items[0].morph, '隔離測試品系')
  })
  await check('已售、已刪、競標中及種群個體，搜尋與直接上架均拒絕', async () => {
    const samples = [
      { status: 'Sold' },
      { status: 'Trash' },
      { status: 'Auction' },
      { breeder: true }
    ]
    for (const [index, fields] of samples.entries()) {
      const id = `LIST-DENIED-${index}`
      await animal(id, fields)
      assert.equal((await candidates(control, id)).length, 0)
      await assert.rejects(publish(control, id), (e) => e.code === '22023')
      assert.equal(await count(id), 0)
    }
  })
  await check('缺品系或有效照片時不成立場次，個體狀態也不部分變更', async () => {
    for (const [index, fields] of [
      { morph: ' ' },
      { cover: 'javascript:alert(1)', images: ['', '//example.invalid/image'] }
    ].entries()) {
      const id = `LIST-INCOMPLETE-${index}`
      await animal(id, fields)
      await assert.rejects(publish(control, id), (e) => e.code === '22023')
      assert.equal(await count(id), 0)
      assert.equal(
        (await control.query('select status from public.animals where id=$1', [id])).rows[0].status,
        'NotForSale'
      )
    }
  })
  await check('照片保持原順序、去重與過濾無效網址；飼養與運送預設完整保存', async () => {
    await animal('LIST-PHOTOS', {
      images: [
        'https://example.invalid/second.jpg',
        ' https://example.invalid/second.jpg ',
        'javascript:alert(1)',
        '/animal/relative.jpg'
      ]
    })
    const p = defaults()
    const id = (await publish(control, 'LIST-PHOTOS', p)).rows[0].receipt.id
    const a = (await control.query('select * from public.auctions where id=$1', [id])).rows[0]
    assert.deepEqual(a.images, [
      'https://example.invalid/second.jpg',
      '/animal/relative.jpg',
      'https://example.invalid/cover.jpg'
    ])
    assert.equal(a.start_price, 200)
    assert.equal(a.min_increment, 100)
    assert.equal(a.shipping_info, '黑貓 +180 元；三重面交免運')
    assert.equal(a.diet, '冷凍蟋蟀/杜比亞')
    assert.equal(a.feeding_freq, '1-2天/次')
    assert.equal(a.workflow_enabled, true)
  })
  await check('預約時間完整保留，開標前拒絕無殘留，開標後能正常出價', async () => {
    await animal('LIST-SCHEDULE')
    const p = { ...defaults(), start: new Date(Date.now() + 1800000).toISOString() }
    const id = (await publish(control, 'LIST-SCHEDULE', p)).rows[0].receipt.id
    const a = (
      await control.query('select start_time,end_time from public.auctions where id=$1', [id])
    ).rows[0]
    assert.equal(a.start_time.toISOString(), p.start)
    assert.equal(a.end_time.toISOString(), p.end)
    const request = randomUUID()
    await assert.rejects(bid(clients[0], id, 200, request), (e) => e.message === '此競標尚未開標')
    assert.equal(
      (
        await control.query(
          'select count(*) as n from private.auction_bid_requests where request_id=$1',
          [request]
        )
      ).rows[0].n,
      '0'
    )
    await control.query(
      "update public.auctions set start_time=clock_timestamp()-interval '1 second' where id=$1",
      [id]
    )
    assert.equal((await bid(clients[0], id, 200, request)).rows[0].receipt.bid.amount, 200)
  })
  await check('等待個體鎖後已過開標或結標時間，上架均回滾', async () => {
    for (const scheduled of [true, false]) {
      const id = `LIST-CLOCK-${scheduled}`
      await animal(id)
      const blocker = await connect(admin)
      await blocker.query('begin')
      await blocker.query('select 1 from public.animals where id=$1 for update', [id])
      const edge = new Date(Date.now() + 300).toISOString()
      const p = { ...defaults(), ...(scheduled ? { start: edge } : { end: edge }) }
      const pending = publish(managers[0], id, p)
      await waitForLock(managers[0])
      await control.query(
        'select pg_sleep(greatest(0,extract(epoch from $1::timestamptz-clock_timestamp()))+0.03)',
        [edge]
      )
      await blocker.query('commit')
      await assert.rejects(
        pending,
        (e) => e.message === '請設定有效的開標與結標時間，結標須晚於開標'
      )
      assert.equal(await count(id), 0)
    }
  })
  await check('個體即使被手動改回待售，有待付款或待核帳場次仍不得重複上架', async () => {
    for (const state of [
      'pending_contact',
      'awaiting_notice',
      'awaiting_payment',
      'payment_review'
    ]) {
      const id = `LIST-PENDING-${state}`
      await animal(id)
      const prior = `OLD-${id}`
      await control.query(
        "insert into public.auctions(id,title,morph,status,animal_id,end_time) values($1,'隔離舊場次','測試','ended',$2,clock_timestamp()-interval '1 hour')",
        [prior, id]
      )
      await control.query(
        'insert into private.auction_outcomes(auction_id,winner_user_id,amount,state) values($1,$2,200,$3)',
        [prior, user, state]
      )
      assert.equal((await candidates(control, id)).length, 0)
      await assert.rejects(
        publish(control, id),
        (e) => e.message === '此個體尚有未結束場次或待處理交易，請先處理原場次'
      )
      assert.equal(await count(id), 1)
    }
  })
  await check('非管理員偽造個人資料，仍無法搜尋庫存或上架', async () => {
    await clients[0].query("select set_config('request.jwt.claims',$1,false)", [
      JSON.stringify({ sub: user, user_metadata: { auction_admin: true } })
    ])
    await assert.rejects(candidates(clients[0], 'LIST-UNCHANGED'), (e) => e.code === '42501')
    await assert.rejects(publish(clients[0], 'LIST-UNCHANGED'), (e) => e.code === '42501')
    assert.equal(await count('LIST-UNCHANGED'), 0)
  })
  await check('無效金額與非有限時間不部分寫入，也不改動個體', async () => {
    await animal('LIST-INVALID')
    for (const patch of [
      { price: -1 },
      { increment: 0 },
      { price: 2147483647 },
      { start: 'infinity' },
      { end: 'infinity' },
      { start: '2030-01-02', end: '2030-01-01' }
    ]) {
      await assert.rejects(
        publish(control, 'LIST-INVALID', { ...defaults(), ...patch }),
        (e) => e.code === '22023'
      )
    }
    assert.equal(await count('LIST-INVALID'), 0)
    assert.equal(
      (await control.query("select status from public.animals where id='LIST-INVALID'")).rows[0]
        .status,
      'NotForSale'
    )
  })
  await check('上架寫入途中到期，啟用流程明確拒絕且整筆場次、回執、個體更新均回滾', async () => {
    await animal('LIST-WRITE-EXPIRE')
    await control.query(
      "create function private.audit_listing_delay() returns trigger language plpgsql as $$begin if new.animal_id='LIST-WRITE-EXPIRE' then perform pg_sleep(0.3); end if; return new; end$$; create trigger audit_listing_delay after insert on public.auctions for each row execute function private.audit_listing_delay()"
    )
    const p = { ...defaults(), end: new Date(Date.now() + 150).toISOString() }
    await assert.rejects(
      publish(control, 'LIST-WRITE-EXPIRE', p),
      (e) => e.message === '只能啟用尚未截止的競標'
    )
    await control.query(
      'drop trigger audit_listing_delay on public.auctions; drop function private.audit_listing_delay()'
    )
    assert.equal(await count('LIST-WRITE-EXPIRE'), 0)
    for (const table of ['private.auction_enrollments', 'private.auction_workflow_events']) {
      assert.equal(
        (
          await control.query(`select count(*) as n from ${table} where auction_id=$1`, [
            `A-${p.request}`
          ])
        ).rows[0].n,
        '0'
      )
    }
    assert.equal(
      (
        await control.query(
          'select count(*) as n from private.auction_listing_requests where request_id=$1',
          [p.request]
        )
      ).rows[0].n,
      '0'
    )
    assert.equal(
      (await control.query("select status from public.animals where id='LIST-WRITE-EXPIRE'"))
        .rows[0].status,
      'NotForSale'
    )
  })
}
