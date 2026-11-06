import { useRequestURL } from '#imports'
import { allowDraftPreview } from '~/utils/article-visibility'

export function useArticlePreview(): boolean {
  // SSR 與瀏覽器採用相同網址條件，不接受轉送主機標頭作為本機依據。
  return allowDraftPreview(!!import.meta.dev, useRequestURL({ xForwardedHost: false }).hostname)
}
