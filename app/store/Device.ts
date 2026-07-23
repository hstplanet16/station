import { defineStore } from 'pinia'
import { useAPIHelper } from '~/composables/APIHelper'
import { useAppCookie } from '~/composables/useAppCookie'
import { useAxios } from '~/composables/useAxios'

export const useDeviceStore = defineStore('DeviceStore', {
  state: () => ({
    devices: [] as any[],
    loading: false,
    error: null as string | null
  }),
  getters: {
    getDevices: state => state.devices,
    isLoading: state => state.loading,
    getError: state => state.error
  },
  actions: {
    async getDeviceList() {
      this.loading = true
      this.error = null
      try {
        const localDevices = useAppCookie("next-devices")
        if (localDevices.value) {
          this.devices = localDevices.value
        }

        const { data: devices } = await useAxios().get("Device/getDevices")
        this.devices = devices
        localDevices.value = devices
      } catch (error) {
        if (!this.devices.length) {
          this.error = useAPIHelper().ErrorConvert(error)
        }
      } finally {
        this.loading = false
      }
    },
    pushDevice(data: any) {
      this.devices.push(data)
      const localDevices = useAppCookie("next-devices")
      localDevices.value = this.devices
    },
    changeDevice(data: any) {
      const index = this.devices.findIndex(e => e.id == data.id)
      if (index > -1) {
        this.devices[index] = data
        const localDevices = useAppCookie("next-devices")
        localDevices.value = this.devices
      }
    },
    removeDevice(data: any) {
      const index = this.devices.findIndex(e => e.id == data.id);
      if (index !== -1) {
        this.devices.splice(index, 1);
        const localDevices = useAppCookie("next-devices")
        localDevices.value = this.devices
      }
    }
  }
})

