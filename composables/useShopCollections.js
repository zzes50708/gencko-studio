import { computed, onMounted } from 'vue'
import { shopCollections, shopCollectionCovers } from '~/data/shop-collections'
import { parseShopCollectionDraft } from '~/utils/shop-collection-draft'
import { createRequestDeadline } from '~/utils/request-deadline'

export async function useShopCollections({ refreshOnMount = true } = {}) {
  const client = useSupabaseClient()
  const lastPublished = useState('shop-collections-last-published', () => null)
  const result = useAsyncData(
    'shop-collections-published',
    async () => {
      const deadline = createRequestDeadline(10000)
      const { data, error } = await deadline.run((signal) =>
        client
          .from('shop_collection_settings')
          .select('document,revision,updated_at')
          .eq('id', 'default')
          .maybeSingle()
          .abortSignal(signal)
      )
      if (error) throw error
      const value = {
        document: data?.document ? parseShopCollectionDraft(data.document) : null,
        revision: data?.revision ?? 0,
        updatedAt: data?.updated_at || ''
      }
      lastPublished.value = value
      return value
    },
    {
      // 僅首次還原 SSR 資料可用快取；掛載時 refresh 仍可能處於 hydration。
      // 手動重新讀取必須查資料庫，不能再次取得舊 payload。
      getCachedData: (key, nuxtApp, context) =>
        context.cause === 'initial' && nuxtApp.isHydrating ? nuxtApp.payload.data[key] : undefined
    }
  )
  // 返回分類或清單時重讀，其他裝置儲存的設定也能在進頁後取得。
  if (refreshOnMount)
    onMounted(() => {
      void result.refresh()
    })
  await result
  return {
    data: result.data,
    error: result.error,
    pending: result.pending,
    refresh: result.refresh,
    document: computed(
      () =>
        result.data.value?.document ||
        lastPublished.value?.document || {
          format: 'gencko-shop-collections',
          version: 1,
          groups: shopCollections,
          covers: shopCollectionCovers
        }
    )
  }
}
