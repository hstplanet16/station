<script setup lang="ts">
import { sub } from 'date-fns'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { Period, Range } from '~/types'
import { useNotificationStore } from '~/store/Notification'
import { useStation } from '~/composables/Station/Station'
import { useStationStore } from '~/store/Station'

const station = useStationStore()
const { isNotificationsSlideoverOpen } = useDashboard()
const notificationStore = useNotificationStore()
const unreadCount = computed(() => notificationStore.getUnreadCount)

const items = [[{
  label: 'Yeni Tip',
  icon: 'i-lucide-send',
  to: '/inbox'
}, {
  label: 'Yeni İşlem',
  icon: 'i-lucide-send',
  to: '/inbox'
}, {
  label: 'Yeni Kullanıcı',
  icon: 'i-lucide-user-plus',
  to: '/users'
}]] satisfies DropdownMenuItem[][]

const range = shallowRef<Range>({
  start: sub(new Date(), { days: 14 }),
  end: new Date()
})
const period = ref<Period>('daily')

const stationData = computed(() => {
  return station.getStation
})

</script>

<template>
  <UDashboardPanel id="home">
    <template #header>
      <UDashboardNavbar title="Analiz" :ui="{ right: 'gap-3' }">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>

        <template #right>
          <UTooltip text="Notifications" :shortcuts="['N']">
            <UButton color="neutral" variant="ghost" square @click="() => { isNotificationsSlideoverOpen = true }">
              <UChip color="error" :show="unreadCount > 0" :text="unreadCount > 9 ? '9+' : String(unreadCount)" inset>
                <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
              </UChip>
            </UButton>
          </UTooltip>

          <UDropdownMenu :items="items">
            <UButton icon="i-lucide-plus" size="md" class="rounded-full" />
          </UDropdownMenu>
        </template>
      </UDashboardNavbar>

      <UDashboardToolbar>
        <template #left>
          <p> {{ stationData.name }}</p>
          -
          <span class="text-muted">{{ stationData.description }}</span>
        </template>
      </UDashboardToolbar>
    </template>

    <template #body>
      <HomeStats :period="period" :range="range" />
      <HomeChart :period="period" :range="range" />
      <HomeSales :period="period" :range="range" />
    </template>
  </UDashboardPanel>
</template>
