import { aiDiscoveryText } from '~/utils/ai-discovery'

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return aiDiscoveryText(true)
})
