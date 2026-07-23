<script setup lang="ts">
import { useStation } from '~/composables/Station/Station'
import { useNotificationStore } from '~/store/Notification'

const { getStation, stationData } = useStation()
const { isNotificationsSlideoverOpen } = useDashboard()
const notificationStore = useNotificationStore()
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
      <UPageCard :title="station.name" variant="subtle">
        <template #description>
          <p>{{ station.description }}</p>
          <UPageCard
            title="İstasyon Skoru"
            variant="naked"
            :ui="{
              container: 'gap-y-1.5',
              wrapper: 'items-start',
              leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
              title: 'font-normal text-muted text-xs uppercase'
            }"
            class="mt-2 first:rounded-l-lg last:rounded-r-lg hover:z-1 lg:rounded-none"
          >
            <div class="flex items-center gap-2">
              <span class="text-2xl font-semibold text-highlighted">12</span>
              <UBadge color="error" variant="subtle" class="text-xs">5%</UBadge>
            </div>
          </UPageCard>
        </template>
      </UPageCard>

      <UPageCard title="Operatör" description="Oturum açan operatör" variant="subtle">
        <template #default>
          <div class="flex items-center gap-2">
            <UserMenu />
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
          <UPageCard
            title="Personel Skoru"
            variant="naked"
            :ui="{
              container: 'gap-y-1.5',
              wrapper: 'items-start',
              leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
              title: 'font-normal text-muted text-xs uppercase'
            }"
            class="mt-2 first:rounded-l-lg last:rounded-r-lg hover:z-1 lg:rounded-none"
          >
            <div class="flex items-center gap-2">
              <span class="text-2xl font-semibold text-highlighted">12</span>
              <UBadge color="error" variant="subtle" class="text-xs">5%</UBadge>
            </div>
          </UPageCard>
        </template>
      </UPageCard>
    </div>

    <div class="w-full space-y-4">
      <slot />
    </div>
  </div>

  <NotificationsSlideover />
</template>
