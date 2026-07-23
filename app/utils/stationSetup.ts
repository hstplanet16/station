import { bufferOfflineRequest } from '~/composables/requestBufferUtils'
import { useAppCookie } from '~/composables/useAppCookie'
import { useStationStore } from '~/store/Station'

export interface StationCreatePayload {
  name: string
  stationUid: string
  description: string
  tagTime: number
  difficultyLevel?: number
  stationActive?: boolean
  ergonomiActive?: boolean
}

export interface LocalStation extends StationCreatePayload {
  id: number
  listenToPrev: boolean
  nominalThreshold: number
  criticalThreshold: number
  isOfflinePending?: boolean
}

export function buildOfflineStation(payload: StationCreatePayload): LocalStation {
  return {
    id: -Date.now(),
    name: payload.name,
    stationUid: payload.stationUid,
    description: payload.description,
    tagTime: payload.tagTime,
    difficultyLevel: payload.difficultyLevel ?? 2,
    stationActive: payload.stationActive ?? true,
    ergonomiActive: payload.ergonomiActive ?? false,
    listenToPrev: true,
    nominalThreshold: 150,
    criticalThreshold: 180,
    isOfflinePending: true
  }
}

/**
 * İstasyon bilgilerini hem localStorage'a hem de Electron config'e yazar.
 * Electron ortamında değilse electronAPI çağrısı sessizce atlanır.
 */
export function persistLocalStation(data: LocalStation) {
  useAppCookie('next-station-uid').value = data.stationUid
  useAppCookie('next-station').value = data
  useStationStore().setStationData(data)

  // Electron ortamında ise serverURL + stationId'yi main process'e ilet
  sendConfigToElectron(data)
}

/**
 * Nuxt app config'indeki serverURL ve istasyon id'sini Electron main process'e gönderir.
 * Sadece Electron (window.electronAPI) ortamında çalışır; browser/SSR'da sessizce atlanır.
 *
 * @param {LocalStation} station - Kaydedilen istasyon verisi
 */
export function sendConfigToElectron(station: { id?: number } | null | undefined) {
  if (typeof window === 'undefined') return
  if (!(window as any).electronAPI?.setElectronConfig) return

  try {
    const appConfig = useAppConfig() as { serverURL?: string }
    const stationId = station?.id

    if (!appConfig.serverURL || !stationId) return

    ;(window as any).electronAPI.setElectronConfig({
      serverURL: appConfig.serverURL,
      stationId,
      station : station
    }).then((result: any) => {
      if (result?.success) {
        console.log('[Electron] Config başarıyla güncellendi.')
      } else {
        console.warn('[Electron] Config güncellenemedi:', result?.message)
      }
    }).catch((err: any) => {
      console.warn('[Electron] Config gönderilemedi:', err)
    })
  } catch (err) {
    console.warn('[Electron] sendConfigToElectron hatası:', err)
  }
}

export function createStationOffline(payload: StationCreatePayload): LocalStation {
  bufferOfflineRequest('POST', 'Station/createStation', { ...payload })
  const station = buildOfflineStation(payload)
  persistLocalStation(station)
  return station
}

export function isPendingOfflineStation(station: { id?: number; isOfflinePending?: boolean } | null | undefined) {
  if (!station) return false
  return station.isOfflinePending === true || (typeof station.id === 'number' && station.id < 0)
}
