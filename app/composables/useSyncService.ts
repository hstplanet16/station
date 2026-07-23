import { useSyncStore } from '~/store/Sync'
import { useRequestBuffer } from '~/composables/useRequestBuffer'
import { useAxios } from '~/composables/useAxios'
import { isPendingOfflineStation } from '~/utils/stationSetup'
import axios from 'axios'

let listenersRegistered = false
let flushPollId: ReturnType<typeof setInterval> | null = null

export const useSyncService = () => {
  const syncStore = useSyncStore()
  const { pendingRequests, dequeue } = useRequestBuffer()
  const app = useAppConfig()

  const stopFlushPolling = () => {
    if (!flushPollId) return
    clearInterval(flushPollId)
    flushPollId = null
  }

  const startFlushPolling = () => {
    if (flushPollId || typeof window === 'undefined') return

    flushPollId = setInterval(() => {
      if (pendingRequests.value.length > 0) {
        checkConnectionAndFlush()
      } else {
        stopFlushPolling()
      }
    }, 5000)
  }

  const flushBuffer = async () => {
    if (syncStore.isSyncing || pendingRequests.value.length === 0) return

    syncStore.setSyncing(true)
    const requests = [...pendingRequests.value].sort((a, b) => a.timestamp - b.timestamp)
    let successCount = 0

    try {
      for (const request of requests) {
        try {
          await axios({
            baseURL: `${app.serverURL}/api/`,
            method: request.method,
            url: request.url,
            data: request.data,
            headers: {
              ...request.headers,
              'Content-Type': 'application/json'
            }
          })
          dequeue(request.id)
          successCount++
        } catch (error: any) {
          console.error('Flush error for request:', request.url, error)

          if (error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.response === undefined) {
            syncStore.setOnline(false)
            startFlushPolling()
            break
          }

          dequeue(request.id)
        }
      }

      if (successCount > 0) {
        import('~/store/Notification').then(({ useNotificationStore }) => {
          useNotificationStore().addLog(
            `${successCount} bekleyen istek sunucuya gönderildi.`,
            'success'
          )
        })

        const localStation = useAppCookie('next-station').value
        if (isPendingOfflineStation(localStation) && localStation?.stationUid) {
          import('~/store/Station').then(({ useStationStore }) => {
            useStationStore().fetchStation(localStation.stationUid).catch((error) => {
              console.error('Offline station refresh failed:', error)
            })
          })
        }

        import('~/store/Process').then(({ useProcessStore }) => {
          const processStore = useProcessStore()
          if (processStore.activeTypeCode) {
            processStore.findProcess(processStore.activeTypeCode, { silent: true })
          }
        })
      }

      if (pendingRequests.value.length === 0) {
        stopFlushPolling()
      }
    } finally {
      syncStore.setSyncing(false)
    }
  }

  const checkConnectionAndFlush = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      syncStore.setOnline(false)
      startFlushPolling()
      return
    }

    try {
      const NextAPI = useAxios()
      await NextAPI.get('Process/getTypes', { timeout: 3000 })

      syncStore.setOnline(true)
      await flushBuffer()

      import('~/store/Process').then(({ useProcessStore }) => {
        useProcessStore().findTypes()
      })
    } catch (e: any) {
      console.error('Ping failed:', e)
      const isNetworkError = e.message === 'Network Error' || e.code === 'ECONNABORTED' || e.response === undefined

      if (isNetworkError) {
        syncStore.setOnline(false)
        startFlushPolling()
      } else {
        syncStore.setOnline(true)
        await flushBuffer()

        import('~/store/Process').then(({ useProcessStore }) => {
          useProcessStore().findTypes()
        })
      }
    }
  }

  const registerListeners = () => {
    if (typeof window === 'undefined' || listenersRegistered) return

    listenersRegistered = true

    window.addEventListener('online', () => {
      checkConnectionAndFlush()
    })

    window.addEventListener('offline', () => {
      syncStore.setOnline(false)
    })

    window.addEventListener('sync-flush-buffer', () => {
      flushBuffer()
    })

    if (pendingRequests.value.length > 0) {
      startFlushPolling()
      checkConnectionAndFlush()
    }
  }

  registerListeners()

  return {
    flushBuffer,
    checkConnectionAndFlush,
    startFlushPolling
  }
}
