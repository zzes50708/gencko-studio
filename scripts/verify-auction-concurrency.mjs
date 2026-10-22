// 使用正式庫唯讀匯出的定義，在獨立 PostgreSQL 重現交易；不接受遠端連線字串。
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:net'

const runtime = path.resolve('output/auction-pg-runtime')
const requireRuntime = createRequire(path.join(runtime, 'package.json'))
const { Client } = requireRuntime('pg')
const { initdb, pg_ctl } = await import(
  pathToFileURL(requireRuntime.resolve('@embedded-postgres/windows-x64')).href
)
const schema = JSON.parse(
  fs.readFileSync(process.argv[2] || 'output/transaction-snapshot-complete.json', 'utf8')
)
const directory = path.join(runtime, `data-${Date.now()}`)
const portServer = createServer()
await new Promise((resolve) => portServer.listen(0, '127.0.0.1', resolve))
const port = portServer.address().port
await new Promise((resolve) => portServer.close(resolve))
const configuration = { host: '127.0.0.1', port, user: 'postgres', database: 'postgres' }
const connections = []
const results = []
const user = randomUUID()
const otherUser = randomUUID()
const admin = randomUUID()
const bidders = [user, ...Array.from({ length: 15 }, () => randomUUID())]
const lineId = (uid) => `U${uid.replaceAll('-', '')}`
const q = (value) => `"${value.replaceAll('"', '""')}"`
async function connect(uid = user) {
  const client = new Client(configuration)
  await client.connect()
  connections.push(client)
  await client.query("set statement_timeout='12s'; set lock_timeout='10s'")
  await client.query("select set_config('request.jwt.claims',$1,false)", [
    JSON.stringify({ sub: uid, email: 'isolated@example.invalid' })
  ])
  return client
}
async function check(name, run) {
  await run()
  results.push(name)
  console.log(`通過：${name}`)
}
function runBinary(binary, args) {
  execFileSync(binary, args, { windowsHide: true, encoding: 'utf8', stdio: 'ignore' })
}
let started = false
try {
  runBinary(initdb, [
    '-D',
    directory,
    '-U',
    'postgres',
    '-A',
    'trust',
    '--encoding=UTF8',
    '--locale=C'
  ])
  runBinary(pg_ctl, [
    '-D',
    directory,
    '-l',
    path.join(directory, 'server.log'),
    '-o',
    `-h 127.0.0.1 -p ${port}`,
    '-w',
    'start'
  ])
  started = true
  const control = await connect(admin)
  await control.query(`
    create schema auth; create schema private; create schema extensions;
    create extension pgcrypto with schema extensions;
    create function auth.jwt() returns jsonb language sql stable as $$select current_setting('request.jwt.claims',true)::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
    create table auth.users(id uuid primary key,raw_app_meta_data jsonb default '{}');
    create table auth.identities(user_id uuid,provider text,provider_id text);
  `)
  for (const table of schema.filter((r) => r.kind === 'table')) {
    const def = JSON.parse(table.definition)
    const fields = def.columns.map(
      (c) =>
        `${q(c.name)} ${c.type}${c.identity ? ` generated ${c.identity === 'a' ? 'always' : 'by default'} as identity` : ''}${c.not_null ? ' not null' : ''}${c.default ? ` default ${c.default}` : ''}`
    )
    await control.query(
      `create table ${table.name} (${[...fields, ...(def.constraints || [])].join(',')})`
    )
    for (const index of def.indexes || []) await control.query(index)
  }
  // 使用實際交易函式；僅省略與本輪無關的圖鑑上架、通知網路呼叫及外鍵。
  const names = [
    'auction_is_restricted',
    'auction_member_bid_restricted',
    'auction_line_bid_verified',
    'sync_verified_line_contact',
    'auction_require_admin',
    'place_auction_bid',
    'submit_auction_bid',
    'restrict_auction_winner',
    'process_auction_workflow',
    'admin_auction_action',
    'admin_auction_action_once',
    'report_auction_payment',
    'abandon_auction',
    'enroll_new_auction_workflow',
    'create_auction_line_link',
    'create_auction_winner_claim',
    'record_auction_line_event',
    'get_auction_contact_status'
  ]
  for (const name of names) {
    const fn = schema.find((r) => r.name === `private.${name}`)
    assert.ok(fn, `缺少實際函式 ${name}`)
    await control.query(fn.definition)
  }
  if (schema.some((r) => r.name === 'public.animals')) {
    for (const name of [
      'public.set_animals_photo_updated_at',
      'private.enroll_auction_workflow',
      'private.admin_create_auction',
      'private.admin_auction_candidates'
    ]) {
      const fn = schema.find((r) => r.name === name)
      assert.ok(fn, `缺少上架函式 ${name}`)
      await control.query(fn.definition)
    }
  }
  for (const table of schema.filter((r) => r.kind === 'table')) {
    for (const trigger of JSON.parse(table.definition).triggers || []) await control.query(trigger)
  }
  await control.query(
    "insert into private.auction_workflow_settings(id,processing_enabled,auto_enroll_new,notifications_enabled,fulfillment_mode) values(true,true,true,false,'manual_claim')"
  )
  for (const uid of [...bidders, otherUser, admin]) {
    await control.query('insert into auth.users(id,raw_app_meta_data) values($1,$2)', [
      uid,
      { auction_admin: uid === admin }
    ])
    await control.query("insert into auth.identities values($1,'custom:line-oauth',$2)", [
      uid,
      lineId(uid)
    ])
    await control.query(
      'insert into private.auction_line_bid_verifications(line_user_id) values($1)',
      [lineId(uid)]
    )
    await control.query(
      'insert into private.auction_line_contacts(user_id,line_user_id,followed,conversation_verified,verified_at,last_event_at) values($1,$2,true,true,clock_timestamp(),clock_timestamp())',
      [uid, lineId(uid)]
    )
  }
  const clients = await Promise.all(bidders.map((uid) => connect(uid)))
  const replayClients = await Promise.all(Array.from({ length: 16 }, () => connect(user)))
  const bid = (client, id, amount, request = randomUUID()) =>
    client.query('select private.submit_auction_bid($1,$2,$3,$4) as receipt', [
      request,
      id,
      amount,
      '隔離測試'
    ])
  const auction = async (id, duration = '1 hour') => {
    await control.query(
      "insert into public.auctions(id,title,morph,status,start_price,min_increment,end_time) values($1,'隔離交易測試','測試','active',200,100,clock_timestamp()+$2::interval)",
      [id, duration]
    )
  }
  const finish = async (id) => {
    await control.query(
      "update public.auctions set end_time=clock_timestamp()-interval '1 second' where id=$1",
      [id]
    )
  }
  const count = async (table, id) =>
    Number(
      (await control.query(`select count(*) as n from ${table} where auction_id=$1`, [id])).rows[0]
        .n
    )
  const settle = () => control.query('select private.process_auction_workflow()')
  const outcome = async (id) =>
    (await control.query('select * from private.auction_outcomes where auction_id=$1', [id]))
      .rows[0]
  const lockRow = async (table, id) => {
    const blocker = await connect(admin)
    await blocker.query('begin')
    await blocker.query(
      `select 1 from ${table} where ${table === 'public.auctions' ? 'id' : 'auction_id'}=$1 for update`,
      [id]
    )
    return blocker
  }
  const waitForLock = async (client) => {
    const end = Date.now() + 5000
    while (Date.now() < end) {
      const r = await control.query('select wait_event_type from pg_stat_activity where pid=$1', [
        client.processID
      ])
      if (r.rows[0]?.wait_event_type === 'Lock') return
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
    throw Error('未觀察到預期列鎖等待')
  }
  await check('16 位同價搶標，只接受一筆且不產生拒絕回執', async () => {
    await auction('RACE-SAME-AMOUNT')
    const r = await Promise.allSettled(clients.map((c) => bid(c, 'RACE-SAME-AMOUNT', 200)))
    assert.equal(r.filter((x) => x.status === 'fulfilled').length, 1)
    assert.ok(r.filter((x) => x.status === 'rejected').every((x) => x.reason.code === '22023'))
    assert.equal(await count('public.auction_bids', 'RACE-SAME-AMOUNT'), 1)
    assert.equal(await count('private.auction_bid_requests', 'RACE-SAME-AMOUNT'), 1)
  })
  await check('同一請求 16 次並發重送，只出價一次並回傳同筆成交', async () => {
    await auction('RACE-REPLAY')
    const request = randomUUID()
    const r = await Promise.all(replayClients.map((c) => bid(c, 'RACE-REPLAY', 200, request)))
    assert.equal(new Set(r.map((x) => x.rows[0].receipt.bid.id)).size, 1)
    assert.equal(await count('public.auction_bids', 'RACE-REPLAY'), 1)
  })
  await check('不同價格並發，最高有效出價不會被較低價格覆蓋', async () => {
    await auction('RACE-DIFFERENT')
    const r = await Promise.allSettled(
      clients.map((c, i) => bid(c, 'RACE-DIFFERENT', 200 + i * 100))
    )
    assert.ok(r.some((x) => x.status === 'fulfilled'))
    const amounts = (
      await control.query(
        'select amount from public.auction_bids where auction_id=$1 order by bid_time,id',
        ['RACE-DIFFERENT']
      )
    ).rows.map((r) => r.amount)
    assert.equal(Math.max(...amounts), 1700)
    assert.ok(amounts.every((a, i) => i === 0 || a >= amounts[i - 1] + 100))
  })
  await check('壓線重送不重複延長；新出價依新截止時間判定', async () => {
    await auction('RACE-EXTEND', '30 seconds')
    const request = randomUUID()
    const before = (
      await control.query('select end_time from public.auctions where id=$1', ['RACE-EXTEND'])
    ).rows[0].end_time
    const r = await Promise.all(replayClients.map((c) => bid(c, 'RACE-EXTEND', 200, request)))
    assert.ok(r.every((x) => x.rows[0].receipt.extended))
    const after = (
      await control.query('select end_time from public.auctions where id=$1', ['RACE-EXTEND'])
    ).rows[0].end_time
    assert.equal(after - before, 180000)
    assert.equal((await bid(clients[0], 'RACE-EXTEND', 300)).rows[0].receipt.extended, false)
  })
  await check('取得場次鎖時已過截止，不會接受先到但等待中的出價', async () => {
    await auction('RACE-DEADLINE')
    const blocker = await lockRow('public.auctions', 'RACE-DEADLINE')
    const pending = bid(clients[0], 'RACE-DEADLINE', 200)
    await waitForLock(clients[0])
    await blocker.query(
      "update public.auctions set end_time=clock_timestamp()-interval '1 second' where id='RACE-DEADLINE'"
    )
    await blocker.query('commit')
    await assert.rejects(pending, (e) => e.message === '此競標不存在或已結束')
    assert.equal(await count('public.auction_bids', 'RACE-DEADLINE'), 0)
  })
  await check('結標掃描跳過尚未提交的場次，延長後不誤結標', async () => {
    await auction('RACE-SETTLE', '1 second')
    await clients[0].query('begin')
    await bid(clients[0], 'RACE-SETTLE', 200)
    // 等到其他連線看到的舊截止時間確實已過，才能驗證 SKIP LOCKED。
    await control.query(
      "select pg_sleep(greatest(0,extract(epoch from end_time-clock_timestamp()))+0.03) from public.auctions where id='RACE-SETTLE'"
    )
    await settle()
    assert.equal(await outcome('RACE-SETTLE'), undefined)
    await clients[0].query('commit')
    await settle()
    assert.equal(await outcome('RACE-SETTLE'), undefined)
  })
  await check('兩個工作程序同時結標，只產生一份正確得標紀錄', async () => {
    await auction('RACE-WINNER')
    await bid(clients[0], 'RACE-WINNER', 200)
    await bid(clients[1], 'RACE-WINNER', 300)
    await finish('RACE-WINNER')
    await Promise.all(
      clients.slice(0, 2).map((c) => c.query('select private.process_auction_workflow()'))
    )
    const o = await outcome('RACE-WINNER')
    assert.equal(o.amount, 300)
    assert.equal(o.winner_user_id, bidders[1])
    assert.equal(o.state, 'awaiting_payment')
    assert.equal(await count('private.auction_outcomes', 'RACE-WINNER'), 1)
    assert.equal(
      (
        await control.query(
          "select count(*) as n from private.auction_workflow_events where auction_id='RACE-WINNER' and event='settled'"
        )
      ).rows[0].n,
      '1'
    )
    const a = (await control.query("select end_time from public.auctions where id='RACE-WINNER'"))
      .rows[0]
    assert.equal(o.payment_due_at - a.end_time, 86400000)
  })
  await check('結標後查回原出價可成功；改金額及換帳號不能沿用回執', async () => {
    await auction('RACE-CLOSED-REPLAY')
    const request = randomUUID()
    const first = await bid(clients[0], 'RACE-CLOSED-REPLAY', 200, request)
    await finish('RACE-CLOSED-REPLAY')
    await settle()
    assert.deepEqual(
      (await bid(replayClients[1], 'RACE-CLOSED-REPLAY', 200, request)).rows,
      first.rows
    )
    await assert.rejects(
      bid(replayClients[1], 'RACE-CLOSED-REPLAY', 300, request),
      (e) => e.code === '22023'
    )
    const stranger = await connect(otherUser)
    await assert.rejects(
      bid(stranger, 'RACE-CLOSED-REPLAY', 200, request),
      (e) => e.code === '22023'
    )
  })
  await check('逾期限制與核帳並發，核帳完成後不殘留該場限制', async () => {
    await control.query(
      "update private.auction_outcomes set payment_due_at=clock_timestamp()-interval '1 hour' where auction_id='RACE-WINNER'"
    )
    const a = await connect(admin)
    await Promise.all([
      a.query("select private.admin_auction_action_once($1,'RACE-WINNER','paid','隔離測試核帳')", [
        randomUUID()
      ]),
      clients[0].query('select private.process_auction_workflow()')
    ])
    assert.equal((await outcome('RACE-WINNER')).state, 'paid')
    assert.equal(
      (
        await control.query(
          "select count(*) as n from private.auction_bid_restrictions where auction_id='RACE-WINNER' and active"
        )
      ).rows[0].n,
      '0'
    )
  })
  await check('同一管理延期請求並發重送，只加 24 小時', async () => {
    const before = (await outcome('RACE-CLOSED-REPLAY')).payment_due_at
    const request = randomUUID()
    const admins = await Promise.all(Array.from({ length: 8 }, () => connect(admin)))
    await Promise.all(
      admins.map((c) =>
        c.query(
          "select private.admin_auction_action_once($1,'RACE-CLOSED-REPLAY','extend','隔離測試延期')",
          [request]
        )
      )
    )
    assert.equal((await outcome('RACE-CLOSED-REPLAY')).payment_due_at - before, 86400000)
    assert.equal(
      (
        await control.query(
          "select count(*) as n from private.auction_workflow_events where auction_id='RACE-CLOSED-REPLAY' and event='extend'"
        )
      ).rows[0].n,
      '1'
    )
  })
  await check('已付款場次不能再次棄標，也不能解除其他未付款場次限制', async () => {
    await assert.rejects(
      clients[1].query("select private.abandon_auction('RACE-WINNER')"),
      (e) => e.code === '22023'
    )
    await control.query(
      "select private.restrict_auction_winner('RACE-CLOSED-REPLAY','隔離測試未付款')"
    )
    await assert.rejects(
      control.query(
        "select private.admin_auction_action('RACE-WINNER','unblock','隔離測試錯誤操作')"
      ),
      (e) => e.code === '22023'
    )
    assert.equal(
      (
        await control.query('select private.auction_member_bid_restricted($1) as restricted', [
          user
        ])
      ).rows[0].restricted,
      true
    )
    await control.query(
      "select private.admin_auction_action('RACE-CLOSED-REPLAY','paid','隔離測試完成核帳')"
    )
    assert.equal(
      (
        await control.query('select private.auction_member_bid_restricted($1) as restricted', [
          user
        ])
      ).rows[0].restricted,
      false
    )
  })
  await check('未驗證、Google 單一身分及非管理員，無法越權交易', async () => {
    const unverified = randomUUID()
    await control.query('insert into auth.users(id) values($1)', [unverified])
    await control.query("insert into auth.identities values($1,'google','GOOGLE-ISOLATED')", [
      unverified
    ])
    const c = await connect(unverified)
    await auction('RACE-AUTH')
    await assert.rejects(bid(c, 'RACE-AUTH', 200), (e) => e.code === '42501')
    await control.query("insert into auth.identities values($1,'custom:line-oauth',$2)", [
      unverified,
      lineId(unverified)
    ])
    await assert.rejects(
      bid(c, 'RACE-AUTH', 200),
      (e) => e.message === '請先完成官方 LINE 聯絡驗證後再出價'
    )
    await assert.rejects(
      clients[0].query("select private.admin_auction_action('RACE-WINNER','paid','隔離測試越權')"),
      (e) => e.code === '42501'
    )
    assert.equal(await count('public.auction_bids', 'RACE-AUTH'), 0)
  })
  await check('同帳號兩場未付款，單場解封及核帳不會清除另一場限制', async () => {
    for (const id of ['DEBT-ONE', 'DEBT-TWO']) {
      await auction(id)
      await bid(clients[0], id, 200)
      await finish(id)
    }
    await settle()
    for (const id of ['DEBT-ONE', 'DEBT-TWO'])
      await control.query('select private.restrict_auction_winner($1,$2)', [id, '隔離測試棄標'])
    await control.query(
      "select private.admin_auction_action('DEBT-ONE','unblock','隔離測試正當理由')"
    )
    assert.equal(
      (
        await control.query('select private.auction_member_bid_restricted($1) as restricted', [
          user
        ])
      ).rows[0].restricted,
      true
    )
    await control.query(
      "select private.admin_auction_action('DEBT-ONE','paid','隔離測試核帳第一場')"
    )
    assert.equal(
      (
        await control.query('select private.auction_member_bid_restricted($1) as restricted', [
          user
        ])
      ).rows[0].restricted,
      true
    )
    await assert.rejects(bid(clients[0], 'RACE-AUTH', 200), (e) => e.code === '42501')
    await control.query(
      "select private.admin_auction_action('DEBT-TWO','unblock','隔離測試解除第二場')"
    )
    assert.equal(
      (
        await control.query('select private.auction_member_bid_restricted($1) as restricted', [
          user
        ])
      ).rows[0].restricted,
      false
    )
  })
  const webhook = (line, code, event = randomUUID(), kind = 'message') =>
    control.query(
      'select private.record_auction_line_event($1,$2,$3,clock_timestamp(),$4,$5) as result',
      [event, line, kind, code, '隔離驗證會員']
    )
  const other = await connect(otherUser)
  await check('驗證碼拒絕其他 LINE 身分，正確傳送後只記錄一次並永久保存', async () => {
    await control.query(
      'delete from private.auction_line_bid_verifications where line_user_id=$1',
      [lineId(otherUser)]
    )
    const { code } = (await other.query('select private.create_auction_line_link() as link'))
      .rows[0].link
    assert.equal((await webhook(lineId(user), code)).rows[0].result.reason, 'identity_mismatch')
    assert.equal(
      (await control.query('select private.auction_line_bid_verified($1) as ready', [otherUser]))
        .rows[0].ready,
      false
    )
    const event = randomUUID()
    assert.equal((await webhook(lineId(otherUser), code, event)).rows[0].result.linked, true)
    assert.equal((await webhook(lineId(otherUser), code, event)).rows[0].result.duplicate, true)
    assert.equal((await webhook(lineId(otherUser), code)).rows[0].result.reason, 'expired')
    assert.equal(
      (
        await control.query(
          'select count(*) as n from private.auction_line_bid_verifications where line_user_id=$1',
          [lineId(otherUser)]
        )
      ).rows[0].n,
      '1'
    )
  })
  await check('重建與逾期的驗證碼不可使用，未驗證不會被誤判成功', async () => {
    const old = (await other.query('select private.create_auction_line_link() as link')).rows[0]
      .link
    const fresh = (await other.query('select private.create_auction_line_link() as link')).rows[0]
      .link
    assert.equal((await webhook(lineId(otherUser), old.code)).rows[0].result.reason, 'expired')
    await control.query(
      "update private.auction_link_challenges set expires_at=clock_timestamp()-interval '1 second' where token_hash=encode(extensions.digest($1,'sha256'),'hex')",
      [fresh.code]
    )
    assert.equal((await webhook(lineId(otherUser), fresh.code)).rows[0].result.reason, 'expired')
  })
  await check('兩場領標碼各自獨立，僅得標者能建立且只回寫正確場次', async () => {
    for (const id of ['CLAIM-ONE', 'CLAIM-TWO']) {
      await auction(id)
      await bid(clients[0], id, 200)
      await finish(id)
    }
    await settle()
    await assert.rejects(
      other.query("select private.create_auction_winner_claim('CLAIM-ONE')"),
      (e) => e.code === '42501'
    )
    const claimCode = async (id) => {
      const claim = (
        await clients[0].query('select private.create_auction_winner_claim($1) as claim', [id])
      ).rows[0].claim
      assert.ok(claim.message.includes('成交金額：NT$ 200'))
      return claim.message.match(/領標驗證：([0-9a-f]+)/)[1]
    }
    const old = await claimCode('CLAIM-ONE')
    const second = await claimCode('CLAIM-TWO')
    const first = await claimCode('CLAIM-ONE')
    assert.equal((await webhook(lineId(user), old)).rows[0].result.reason, 'expired')
    assert.equal(
      (await webhook(lineId(otherUser), first)).rows[0].result.reason,
      'identity_mismatch'
    )
    assert.equal((await webhook(lineId(user), second)).rows[0].result.linked, true)
    assert.equal((await outcome('CLAIM-ONE')).claimed_at, null)
    assert.ok((await outcome('CLAIM-TWO')).claimed_at)
    assert.equal((await webhook(lineId(user), first)).rows[0].result.linked, true)
    assert.equal(
      (
        await control.query(
          "select count(*) as n from private.auction_workflow_events where auction_id='CLAIM-ONE' and event='winner_claimed_on_line'"
        )
      ).rows[0].n,
      '1'
    )
  })
  await check('取消場次後舊領標碼失效，不能再建立領標訊息', async () => {
    const claim = (
      await clients[0].query("select private.create_auction_winner_claim('CLAIM-TWO') as claim")
    ).rows[0].claim
    const code = claim.message.match(/領標驗證：([0-9a-f]+)/)[1]
    await control.query(
      "update private.auction_outcomes set state='cancelled',claimed_at=null where auction_id='CLAIM-TWO'"
    )
    assert.equal((await webhook(lineId(user), code)).rows[0].result.reason, 'outcome_unavailable')
    assert.equal((await outcome('CLAIM-TWO')).claimed_at, null)
    await assert.rejects(
      clients[0].query("select private.create_auction_winner_claim('CLAIM-TWO')"),
      (e) => e.code === '22023'
    )
  })
  await check('較舊的 LINE 加好友事件不覆蓋新封鎖事件，驗證資格仍由獨立紀錄保存', async () => {
    const base = (await control.query('select clock_timestamp() as now')).rows[0].now
    const send = (kind, at) =>
      control.query('select private.record_auction_line_event($1,$2,$3,$4)', [
        randomUUID(),
        lineId(otherUser),
        kind,
        at
      ])
    await send('unfollow', new Date(base.getTime() + 1000))
    await send('follow', base)
    const contact = (
      await control.query('select followed from private.auction_line_contacts where user_id=$1', [
        otherUser
      ])
    ).rows[0]
    assert.equal(contact.followed, false)
    assert.equal(
      (await control.query('select private.auction_line_bid_verified($1) as ready', [otherUser]))
        .rows[0].ready,
      true
    )
  })
  if (schema.some((r) => r.name === 'public.animals')) {
    const { runListingChecks } = await import('./verify-auction-listing-cases.mjs')
    await runListingChecks({ check, control, connect, admin, user, bid, clients, waitForLock })
  }
  fs.writeFileSync(
    'output/auction-transaction-concurrency-results.json',
    JSON.stringify(
      {
        version: (await control.query('select version()')).rows[0].version,
        passed: results,
        limitations: [
          '使用正式函式與欄位、索引、檢查限制；外鍵、RLS、Supabase Auth 服務與 LINE 網路不在本測試範圍',
          '使用虛構帳號及場次；未連線正式交易庫'
        ]
      },
      null,
      2
    )
  )
  console.log(`競標 PostgreSQL 並發交易 ${results.length} 項通過`)
} finally {
  await Promise.allSettled(connections.map((client) => client.end()))
  if (started) runBinary(pg_ctl, ['-D', directory, '-m', 'fast', '-w', 'stop'])
}
