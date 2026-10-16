import { it, expect } from 'vitest'
import fs from 'node:fs'

it('競標讀取先比對NetworkOnly，不可落入全站Supabase離線快取', () => {
  const config = fs.readFileSync('nuxt.config.ts', 'utf8')
  const entries = [...config.matchAll(/urlPattern:\s*(\/[^\n]+\/i?),\s*handler:\s*'([^']+)'/g)].map(
    (match) => ({
      pattern: new RegExp(
        match[1].slice(1, match[1].lastIndexOf('/')),
        match[1].slice(match[1].lastIndexOf('/') + 1)
      ),
      handler: match[2]
    })
  )
  for (const table of ['auctions', 'auction_bids']) {
    const first = entries.find((entry) =>
      entry.pattern.test(`https://sfndneptcwhblvrxykcy.supabase.co/rest/v1/${table}?select=id`)
    )
    expect(first?.handler).toBe('NetworkOnly')
  }
  const ordinary = entries.find((entry) =>
    entry.pattern.test('https://sfndneptcwhblvrxykcy.supabase.co/rest/v1/articles?select=id')
  )
  expect(ordinary?.handler).toBe('NetworkFirst')
})
