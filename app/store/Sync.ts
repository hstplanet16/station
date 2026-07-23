import { defineStore } from 'pinia'

export const useSyncStore = defineStore('SyncStore', {
  state: () => ({
    isOnline: true,
    isSyncing: false,
    lastSyncTime: null as string | null
  }),
  getters: {
    hasPendingRequests: () => {
      const { pendingRequests } = useRequestBuffer()
      return pendingRequests.value.length > 0
    }
  },
  actions: {
    setOnline(status: boolean) {
      this.isOnline = status
    },
    setSyncing(status: boolean) {
      this.isSyncing = status
      if (!status) {
        this.lastSyncTime = new Date().toISOString()
      }
    }
  }
})
