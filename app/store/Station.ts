import { defineStore } from 'pinia'
import { useAppCookie } from '~/composables/useAppCookie'
import { useAxios } from '~/composables/useAxios'
import { useNotificationStore } from '~/store/Notification'

export const useStationStore = defineStore('StationStore', {
  state: () => ({
    station: undefined as any,
    preVIN: undefined as any
  }),
  getters: {
    getStation: state => state.station,
    getPreVIN: state => state.preVIN
  },
  actions: {
    async setStation() {
      const station = useAppCookie('next-station')
      if (station.value) {
        this.station = station.value
      }
    },
    async fetchStation(uid: string) {
      try {
        const { data } = await useAxios().get(`Station/getStationUID?uid=${uid}`)
        this.station = data
        useAppCookie('next-station').value = data
        useNotificationStore().addLog(`İstasyon yapılandırıldı: ${data.name}`, 'success')
        return data
      } catch (error) {
        throw error;
      }
    },
    setStationData(data: any) {
      this.station = data
      useAppCookie('next-station').value = data
      useNotificationStore().addLog(`İstasyon bilgileri güncellendi: ${data.name}`, 'info')
    },
    async removeStation() {
      const station = useAppCookie('next-station')
      const stationUID = useAppCookie('next-station-uid')
      if (station.value) {
        const stationName = station.value.name ?? 'İstasyon'
        this.station = null
        station.value = null
        stationUID.value = null
        useNotificationStore().addLog(`İstasyon kaldırıldı: ${stationName}`, 'info')
        navigateTo("startup/StationCreator")
      }
    },
    setPreVIN(data: any) {
      this.preVIN = data
      localStorage.setItem("next-prev-vin", JSON.stringify(data))
    }
  }
})
