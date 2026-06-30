import { useSupabaseClient } from '#imports'
import type { Database } from '~/types/supabase'

/**
 * 帶完整型別的 Supabase client（#13）。
 *
 * 等同 `useSupabaseClient<Database>()`，但集中一處便於日後（#12 TypeScript 漸進導入）
 * 將各頁面的 `useSupabaseClient()` 逐步換成 `useDB()`，即可獲得：
 *   - 資料表 / 欄位名稱自動補全
 *   - select / insert / update 的回傳與參數型別檢查
 *
 * 型別來源 types/supabase.ts 由 `npm run db:types` 從遠端 schema 產生。
 */
export const useDB = () => useSupabaseClient<Database>()
