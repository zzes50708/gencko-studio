export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const authorization = getHeader(event, 'authorization')

  if (!config.cronSecret || authorization !== `Bearer ${config.cronSecret}`) {
    throw createError({ statusCode: 401, statusMessage: '未授權' })
  }
  if (!config.supabaseUrl || !config.hospitalSyncSecret) {
    throw createError({ statusCode: 503, statusMessage: '醫院同步環境變數尚未設定' })
  }

  return await $fetch(`${config.supabaseUrl}/functions/v1/sync-veterinary-registry`, {
    headers: { 'x-sync-secret': config.hospitalSyncSecret },
    timeout: 60_000
  })
})
