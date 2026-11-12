<script setup>
definePageMeta({
  middleware: [
    (to) => {
      const keys = [
        'sp',
        'kw',
        'group',
        'morph',
        'genes',
        'years',
        'beginner',
        'minP',
        'maxP',
        'stock',
        'sold',
        'sexM',
        'sexF',
        'sexU',
        'sort'
      ]
      if (keys.some((key) => key in to.query))
        return navigateTo(
          { path: '/shop/all', query: to.query, hash: to.hash },
          { replace: true, redirectCode: 302 }
        )
    }
  ]
})
</script>
<template><ShopCategoryEntry /></template>
