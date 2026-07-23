<script setup lang="ts">
import { useSyncStore } from '~/store/Sync'
import { useRequestBuffer } from '~/composables/useRequestBuffer'

const syncStore = useSyncStore()
const { pendingRequests } = useRequestBuffer()

const badgeColor = computed(() => {
  if (syncStore.isSyncing) return 'warning'
  if (syncStore.isOnline) return 'success'
  return 'error'
})

const statusLabel = computed(() => {
  if (syncStore.isSyncing) return 'Eşitleniyor...'
  if (syncStore.isOnline) return 'Bağlı'
  return 'Çevrimdışı'
})

const pendingCount = computed(() => pendingRequests.value.length)
</script>

<template>
  <div class="flex items-center gap-2">
    <UTooltip :text="statusLabel">
      <div class="flex items-center gap-2">
        <div class="relative flex h-3 w-3">
          <span v-if="syncStore.isSyncing"
            class="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-3 w-3" :class="`bg-${badgeColor}-500`"></span>
        </div>
        <span class="text-sm font-medium hidden md:block"
          :class="syncStore.isOnline ? 'text-success' : syncStore.isSyncing ? 'text-warning' : 'text-error'">{{
          statusLabel }}</span>
      </div>
    </UTooltip>

    <UTooltip v-if="pendingCount > 0" text="Bekleyen İstekler">
      <UBadge color="warning" variant="subtle" size="xs">
        {{ pendingCount }}
      </UBadge>
    </UTooltip>
  </div>
</template>
