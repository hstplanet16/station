import { defineStore } from 'pinia'
import { useStationStore } from './Station'
import { useAPIHelper } from '~/composables/APIHelper'
import { useAppCookie } from '~/composables/useAppCookie'
import { useAxios } from '~/composables/useAxios'

export const usePermissionStore = defineStore('PermissionStore', {
  state: () => ({
    permissionList: [] as any[],
    loading: false,
    error: null as string | null
  }),
  getters: {
    getPermissionList: state => state.permissionList,
    isLoading: state => state.loading,
    getError: state => state.error
  },
  actions: {
    async getAllPermission() {
      this.loading = true
      this.error = null
      try {
          const localPermissions = useAppCookie("next-permissions")
          if (localPermissions.value) {
              this.permissionList = localPermissions.value
          }
          
          const stationStore = useStationStore()
          const station = stationStore.getStation
    
          const { data: permission } = await useAxios().get(`StationPermission/getPermissions?stationId=${station.id}`)
          this.permissionList = permission
          localPermissions.value = permission

          const users = (permission ?? []).map((p: any) => p.user).filter(Boolean)
          if (users.length) {
            useAppCookie('next-user-list').value = users
          }
      } catch (error) {
          if (!this.permissionList.length) {
              this.error = useAPIHelper().ErrorConvert(error)
          }
      } finally {
          this.loading = false
      }
    },
    pushPermission(data: any) {
      this.permissionList.push(data)
    },
    removePermission(data: any) {
      const index = this.permissionList.findIndex(e => e.id == data.id)
      if (index !== -1) {
        this.permissionList.splice(index, 1)
      }
    }
  }
})