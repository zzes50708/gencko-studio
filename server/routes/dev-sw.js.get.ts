import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/javascript; charset=utf-8')
  setHeader(event, 'cache-control', 'no-store')
  return '/* dev-sw.js stub: intentionally empty */\n'
})

