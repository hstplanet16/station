import { useSyncService } from '~/composables/useSyncService'

export default defineNuxtPlugin(() => {
  const { checkConnectionAndFlush } = useSyncService()
  checkConnectionAndFlush()
})
