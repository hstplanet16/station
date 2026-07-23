import { useStationStore } from '~/store/Station'
import { useRequestBuffer } from '~/composables/useRequestBuffer'

export function parseRequestData(data: unknown) {
  if (data === undefined || data === null) return undefined
  if (typeof data === 'string') {
    try {
      return JSON.parse(data)
    } catch {
      return data
    }
  }
  return data
}

export function getRelativeUrl(config: any) {
  const url = config?.url || ''
  const baseURL = config?.baseURL || ''

  if (url.startsWith('http')) {
    return url.replace(baseURL, '')
  }

  return url
}

export function shouldBufferRequest(method: string, url: string) {
  if (!['POST', 'PUT', 'DELETE'].includes(method)) return false
  if (url.includes('notification/clear')) return true
  return !url.includes('notification/')
}

export function isNetworkError(error: unknown): boolean {
  const err = error as any
  if (err?.isOffline) return true

  const code = err?.code as string | undefined
  const networkCodes = ['ECONNABORTED', 'ECONNREFUSED', 'ERR_NETWORK', 'ERR_CONNECTION_REFUSED', 'ETIMEDOUT']

  return networkCodes.includes(code ?? '')
    || err?.message === 'Network Error'
    || (!err?.response && !!err?.request)
}

export function bufferOfflineRequest(method: string, url: string, data?: unknown) {
  const stationStore = useStationStore()
  const { enqueue } = useRequestBuffer()

  enqueue({
    method: method.toUpperCase(),
    url,
    data,
    headers: {
      'X-Next-Station': stationStore.getStation?.stationUid,
      'X-Next-Station-ID': stationStore.getStation?.id
    }
  })

  if (typeof window !== 'undefined') {
    import('~/composables/useSyncService').then(({ useSyncService }) => {
      useSyncService().startFlushPolling()
    })
  }
}
