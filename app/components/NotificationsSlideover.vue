<script setup lang="ts">
import { formatTimeAgo } from '@vueuse/core'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '~/store/Notification'
import type { Notification, NotificationDetail } from '~/types'

const { isNotificationsSlideoverOpen } = useDashboard()
const notificationStore = useNotificationStore()
const { notifications } = storeToRefs(notificationStore)

const detailModalOpen = ref(false)
const selectedNotification = ref<Notification | null>(null)

watch(isNotificationsSlideoverOpen, (isOpen) => {
  if (isOpen) {
    notificationStore.fetchNotifications()
  } else {
    notificationStore.markAllAsRead()
  }
})

function clearNotifications() {
  notificationStore.clearNotifications()
}

function chipColor(notification: Notification) {
  if (notification.type === 'error') return 'error'
  if (notification.type === 'success') return 'success'
  return 'primary'
}

function openDetail(notification: Notification) {
  selectedNotification.value = notification
  detailModalOpen.value = true
}

function formatDetailValue(value: unknown) {
  if (value === undefined || value === null) return '-'
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function detailRows(detail?: NotificationDetail) {
  if (!detail) return []

  return [
    { label: 'HTTP Durum', value: detail.status ? `${detail.status} ${detail.statusText ?? ''}`.trim() : undefined },
    { label: 'Metod', value: detail.method },
    { label: 'URL', value: detail.url },
    { label: 'Mesaj', value: detail.message },
    { label: 'Kod', value: detail.code },
    { label: 'Sunucu Yanıtı', value: detail.response, mono: true }
  ].filter(row => row.value !== undefined && row.value !== null && row.value !== '')
}
</script>

<template>
  <USlideover
    v-model:open="isNotificationsSlideoverOpen"
    title="Sistem Logları"
  >
    <template #body>
      <div v-if="notifications.length" class="flex justify-between items-center mb-4 border-b border-default pb-2">
        <span class="text-xs text-muted">{{ notifications.length }} Bildirim</span>
        <UButton
          label="Bildirimleri Temizle"
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          @click="clearNotifications"
        />
      </div>

      <UEmpty
        v-if="!notifications.length"
        icon="i-lucide-bell-off"
        title="Henüz log yok"
        description="Sistem olayları ve hatalar burada görünecek."
        variant="naked"
        class="py-8"
      />

      <button
        v-for="notification in notifications"
        :key="notification.id"
        type="button"
        class="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 relative -mx-3 first:-mt-3 last:-mb-3 hover:bg-elevated/50 cursor-pointer transition-colors"
        :class="{ 'bg-elevated/30': notification.unread }"
        @click="openDetail(notification)"
      >
        <UChip
          :color="chipColor(notification)"
          :show="!!notification.unread"
          inset
        >
          <UAvatar
            v-bind="notification.sender.avatar"
            :alt="notification.sender.name"
            size="md"
          />
        </UChip>

        <div class="text-sm flex-1 min-w-0">
          <p class="flex items-center justify-between gap-2">
            <span class="text-highlighted font-medium">{{ notification.sender.name }}</span>

            <time
              :datetime="notification.date"
              class="text-muted text-xs shrink-0"
              v-text="formatTimeAgo(new Date(notification.date))"
            />
          </p>

          <p class="text-dimmed truncate">
            {{ notification.body }}
          </p>

          <p v-if="notification.detail" class="text-xs text-muted mt-0.5">
            Detay için tıklayın
          </p>
        </div>

        <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
      </button>
    </template>
  </USlideover>

  <UModal
    v-model:open="detailModalOpen"
    :title="selectedNotification?.body ?? 'Log Detayı'"
    :description="selectedNotification ? formatTimeAgo(new Date(selectedNotification.date)) : ''"
  >
    <template #body>
      <div v-if="selectedNotification" class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm text-muted">Özet</p>
          <p class="text-sm text-highlighted">{{ selectedNotification.body }}</p>
        </div>

        <div v-if="detailRows(selectedNotification.detail).length" class="space-y-3">
          <p class="text-sm text-muted">Teknik Detay</p>

          <div
            v-for="row in detailRows(selectedNotification.detail)"
            :key="row.label"
            class="space-y-1"
          >
            <p class="text-xs font-medium text-muted uppercase tracking-wide">{{ row.label }}</p>
            <pre
              v-if="row.mono"
              class="text-xs bg-elevated rounded-md p-3 overflow-x-auto whitespace-pre-wrap break-all"
            >{{ formatDetailValue(row.value) }}</pre>
            <p v-else class="text-sm text-highlighted break-all">{{ row.value }}</p>
          </div>
        </div>

        <UEmpty
          v-else
          icon="i-lucide-file-text"
          title="Ek detay yok"
          description="Bu log kaydı için yalnızca özet bilgi mevcut."
          variant="naked"
          class="py-4"
        />
      </div>
    </template>
  </UModal>
</template>
