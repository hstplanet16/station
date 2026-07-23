import { useNotificationStore } from '~/store/Notification'

export default defineNuxtPlugin(() => {
  useNotificationStore().init()
})
