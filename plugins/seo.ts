import { injectHead } from '#imports'
import { completeSeoTags } from '~/utils/seo-head'

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const head = injectHead()
  head.hooks.hook('tags:afterResolve', ({ tags }) => {
    completeSeoTags(tags, route.path)
  })
})
