// 版本化素材避免 CDN 沿用舊卡片影片；桌機圖集與手機照片出自同一批新版頁面。
export const HERO_PREVIEW_ROOT = '/previews/20260911-ui'
export const HERO_PREVIEW_VIDEO_ATLAS = `${HERO_PREVIEW_ROOT}/atlas.mp4`
export const HERO_PREVIEW_POSTER_ATLAS = `${HERO_PREVIEW_ROOT}/atlas.webp`
export const getHeroPreview = (route: string) => {
  const slug = route.replace(/^\//, '')
  return { video: `${HERO_PREVIEW_ROOT}/${slug}.mp4`, poster: `${HERO_PREVIEW_ROOT}/${slug}.webp` }
}
