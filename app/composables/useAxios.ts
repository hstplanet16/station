import axios from 'axios'
import { useStationStore } from '~/store/Station'
import { useRequestBuffer } from '~/composables/useRequestBuffer'
import { useSyncStore } from '~/store/Sync'
import { getRelativeUrl, isNetworkError, parseRequestData, shouldBufferRequest } from '~/composables/requestBufferUtils'

let NextAPI: any = null

export const useAxios = () => {
  const app = useAppConfig()
  const serverURL = localStorage.getItem("next-server") || app.serverURL
  const stationStore = useStationStore()

  if (!NextAPI) {
    NextAPI = axios.create({
      baseURL: `${serverURL}/api/`
    })

    NextAPI.interceptors.request.use((config: any) => {
      config.headers['X-Next-Station'] = stationStore.getStation?.stationUid
      config.headers['X-Next-Station-ID'] = stationStore.getStation?.id
      return config
    })

    NextAPI.interceptors.response.use(
      (res: any) => {
        const syncStore = useSyncStore()
        if (!syncStore.isOnline) {
          syncStore.setOnline(true)
        }

        const { pendingRequests } = useRequestBuffer()
        if (pendingRequests.value.length > 0 && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('sync-flush-buffer'))
        }

        return res
      },
      (err: any) => {
        const requestUrl = err.config?.url || ''
        const relativeUrl = getRelativeUrl(err.config)
        const isUpdateProcess404 = err.response?.status === 404 && relativeUrl.includes('Process/updateProcess')
        const isNotificationRequest = requestUrl.includes('notification/') || relativeUrl.includes('notification/')

        if (!isUpdateProcess404) {
          console.error('Axios error:', err.response?.data || err.message)
        }

        if (isUpdateProcess404) {
          return Promise.reject(err)
        }

        const syncStore = useSyncStore()
        const method = err.config?.method?.toUpperCase() || ''

        if (isNetworkError(err)) {
          syncStore.setOnline(false)
          const shouldBuffer = shouldBufferRequest(method, relativeUrl)

          if (shouldBuffer) {
            const { enqueue } = useRequestBuffer()

            enqueue({
              method,
              url: relativeUrl,
              data: parseRequestData(err.config?.data),
              headers: {
                'X-Next-Station': err.config.headers?.['X-Next-Station'],
                'X-Next-Station-ID': err.config.headers?.['X-Next-Station-ID']
              }
            })

            import('~/composables/useSyncService').then(({ useSyncService }) => {
              useSyncService().startFlushPolling()
            })

            if (!isNotificationRequest) {
              import('~/store/Notification').then(({ useNotificationStore }) => {
                useNotificationStore().addLog('Bağlantı koptu: İstek çevrimdışı sıraya alındı.', 'error', {
                  method,
                  url: relativeUrl,
                  message: err.message,
                  code: err.code
                })
              })
            }

            return Promise.reject({ isOffline: true, message: 'Çevrimdışı: İstek sıraya alındı.' })
          }

          if (!isNotificationRequest) {
            import('~/store/Notification').then(({ useNotificationStore }) => {
              useNotificationStore().addLog('Bağlantı koptu', 'error', {
                method,
                url: relativeUrl,
                message: err.message,
                code: err.code
              })
            })
          }
        } else if (!isNotificationRequest) {
          const status = err.response?.status
          const statusText = status ? `API Hatası: ${status}` : 'API Hatası'
          import('~/store/Notification').then(({ useNotificationStore }) => {
            useNotificationStore().addLog(statusText, 'error', {
              status: err.response?.status,
              statusText: err.response?.statusText,
              method,
              url: relativeUrl,
              message: err.message,
              response: err.response?.data
            })
          })
        }

        return Promise.reject(err)
      }
    )
  }

  return NextAPI
}
