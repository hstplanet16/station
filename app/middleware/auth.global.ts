import { useAppCookie } from "~/composables/useAppCookie"
import { useStationStore } from "~/store/Station"
import { useAuthStore } from "~/store/Auth"

export default defineNuxtRouteMiddleware((to) => {
  const user = useAppCookie<any>('next-user')
  const stationUID = useAppCookie('next-station-uid')
  const station = useAppCookie('next-station')

  const isStartupPage = to.path.startsWith('/startup')
  const isAuthPage = to.path.startsWith('/auth')

  const isBarcode = to.path.startsWith('/barcode')
  const isWork = to.path.startsWith('/work')

  const isAllowedForUser = isBarcode || isWork

  if (!station.value) {
    if (!isStartupPage) {
      return navigateTo('/startup/stationcreator')
    }
    return
  }

  useStationStore().setStation()

  if (!user.value) {
    if (!isAuthPage) {
      return navigateTo('/auth/login')
    }
    return
  }

  // Hydrate auth store
  const authStore = useAuthStore()
  if (!authStore.user) authStore.user = user.value

  const isAdmin = user.value.systemAdmin === true


  if (isAuthPage) {
    return navigateTo('/barcode')
  }

  if (!isAdmin && !isAllowedForUser) {
    return navigateTo('/barcode')
  }
})

