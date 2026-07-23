import { defineStore } from 'pinia'
import type { Notification, NotificationDetail } from '~/types'
import { useStationStore } from './Station'

const STORAGE_KEY = 'next-notifications'
const MAX_LOGS = 100

export const useNotificationStore = defineStore('NotificationStore', {
  state: () => ({
    notifications: [] as Notification[]
  }),
  getters: {
    getNotifications: (state): Notification[] => state.notifications,
    getUnreadCount: (state): number => state.notifications.filter(n => n.unread).length
  },
  actions: {
    init() {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return

      try {
        this.notifications = JSON.parse(stored)
      } catch {
        this.notifications = []
      }
    },
    persist() {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notifications))
      }
    },
    addLog(body: string, type: 'info' | 'error' | 'success' = 'info', detail?: NotificationDetail) {
      const lastNotification = this.notifications[0]
      if (lastNotification && lastNotification.body === body && lastNotification.type === type) {
        return
      }

      const iconMap = {
        info: 'i-lucide-info',
        error: 'i-lucide-alert-triangle',
        success: 'i-lucide-check-circle'
      } as const

      const colorMap = {
        info: 'primary',
        error: 'error',
        success: 'success'
      } as const

      const station = useStationStore()

      const newLog: Notification = {
        //id: Date.now(),
        body,
        date: new Date().toISOString(),
        unread: true,
        type,
        detail,
        sender: {
          id: 0,
          name: 'Sistem',
          email: 'system@nextsolution.com',
          location: 'Local',
          status: 'subscribed',
          avatar: { icon: iconMap[type], color: colorMap[type] }
        },
        stationId: station.getStation.id
      }

      this.notifications.unshift(newLog)

      if (this.notifications.length > MAX_LOGS) {
        this.notifications.length = MAX_LOGS
      }

      this.persist()

      import('~/composables/useAxios').then(({ useAxios }) => {
        useAxios().post('notification/sendNotification', { ...newLog, sender: JSON.stringify(newLog.sender) }).catch(() => { })
      })
    },
    markAllAsRead() {
      this.notifications.forEach(n => { n.unread = false })
      this.persist()
    },
    async clearNotifications() {
      this.notifications = []
      this.persist()

      const stationStore = useStationStore()
      const stationId = stationStore.getStation?.id
      if (!stationId) return

      try {
        await useAxios().delete('Notification/clear', { params: { stationId } })
      } catch (error) {
        console.error('Failed to clear notifications on server:', error)
      }
    },
    async fetchNotifications() {
      const stationStore = useStationStore()
      const stationId = stationStore.getStation?.id
      if (!stationId) return

      try {
        const { data } = await useAxios().get('Notification/getSystemNotification', { params: { stationId } })
        if (Array.isArray(data)) {
          this.notifications = data.map((item: any) => {
            let parsedSender = item.sender
            if (typeof item.sender === 'string') {
              try {
                parsedSender = JSON.parse(item.sender)
              } catch {
                parsedSender = {
                  id: 0,
                  name: 'Sistem',
                  email: 'system@nextsolution.com',
                  location: 'Local',
                  status: 'subscribed',
                  avatar: { icon: 'i-lucide-info', color: 'primary' }
                }
              }
            }
            return {
              ...item,
              sender: parsedSender
            }
          })
          this.persist()
        }
      } catch (error) {
        console.error('Failed to fetch notifications from server, showing local copy:', error)
      }
    }
  }
})
