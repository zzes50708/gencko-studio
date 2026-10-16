import { computed, watchEffect } from 'vue'
import { useHead, useRequestEvent } from '#imports'
import { setResponseStatus } from 'h3'
import { contentResponseState } from '~/utils/content-response'

export function useContentResponse(data, pending, error) {
  const event = useRequestEvent()
  const state = computed(() => contentResponseState(pending.value, data.value, error.value))
  watchEffect(() => {
    if (event) setResponseStatus(event, state.value.status)
  })
  useHead({ meta: [{ name: 'robots', content: () => state.value.robots }] })
}
