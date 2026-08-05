<script setup lang="ts">
import { useStation } from '~/composables/Station/Station'
import { useNotificationStore } from '~/store/Notification'
import { useStationStore } from '~/store/Station'

const { getStation, stationData } = useStation()
const { isNotificationsSlideoverOpen } = useDashboard()
const notificationStore = useNotificationStore()
const stationStore = useStationStore()
const unreadCount = computed(() => notificationStore.getUnreadCount)

onMounted(async () => {
  await getStation()
})

const station = computed<any>(() => stationData())
</script>

<template>
  <SkyBg />
  <div class="absolute z-[-1] size-60 transform rounded-full bg-primary blur-[300px] sm:size-100" />
  <div class="container mx-auto flex gap-x-4 py-24">
    <div class="space-y-4">
      <UPageCard v-if="stationStore.getStation" :title="stationStore.getStation.name" variant="subtle">
        <template #description>
          <p>{{ stationStore.getStation.description || 'İstasyon açıklaması' }}</p>
        </template>
      </UPageCard>

      <UPageCard title="Operatör" description="Oturum açan operatör" variant="subtle">
        <template #default>
          <div class="flex items-center gap-2">
            <UserMenu :show-profile="false" :show-extra-items="false" />
            <UTooltip text="Sistem Logları" :shortcuts="['N']">
              <UButton color="neutral" variant="ghost" square @click="isNotificationsSlideoverOpen = true">
                <UChip
                  color="error"
                  :show="unreadCount > 0"
                  :text="unreadCount > 9 ? '9+' : String(unreadCount)"
                  inset
                >
                  <UIcon name="i-lucide-bell" class="size-5 shrink-0" />
                </UChip>
              </UButton>
            </UTooltip>
          </div>
        </template>
      </UPageCard>
    </div>

    <div class="w-full space-y-4">
      <slot />
    </div>
  </div>

  <NotificationsSlideover />
</template>
