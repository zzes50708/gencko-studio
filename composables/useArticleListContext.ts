import { useState } from '#app'

/** 列表狀態跨文章詳情保留，捲動交由全站路由在內容就緒後還原。 */
export const useArticleListContext = () =>
  useState('article-list-context', () => ({
    category: 'All',
    query: '',
    scrollY: 0
  }))
