<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useShiftStore } from '~/store/Shift'
import type { IShift } from '~/store/Shift'

const props = defineProps<{
  members: IShift[]
}>()

const removeShiftModal = ref(false)
const editShiftModal = ref(false)
const selectShift = ref()
const shiftStore = useShiftStore()

const items = (row: any) => {
  return [{
    label: 'Düzenle',
    onSelect: () => {
      editShiftModal.value = true
      selectShift.value = row
    }
  }, {
    label: 'Vardiyayı Kaldır',
    color: 'error' as const,
    onSelect: () => {
      removeShiftModal.value = true
      selectShift.value = row
    }
  }] satisfies DropdownMenuItem[]
}

const onRemove = async () => {
  try {
    await shiftStore.removeShift(selectShift.value.id)
  } finally {
    removeShiftModal.value = false
  }
}

const formatTime = (time: string) => {
  // HHMM formatını HH:MM formatına çevir
  if (time.length === 3) {
    return `0${time[0]}:${time.substring(1)}`
  } else if (time.length === 4) {
    return `${time.substring(0, 2)}:${time.substring(2)}`
  }
  return time
}

</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li v-for="(member, index) in members" :key="index"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6">
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar :text="member.name.substring(0, 2).toUpperCase()" size="md" />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ member.name }}
          </p>
          <p class="text-muted truncate">
            {{ formatTime(member.startTime) }} - {{ formatTime(member.endTime) }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UDropdownMenu :items="items(member)" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </div>
    </li>
  </ul>

  <ShiftsEdit v-model:open="editShiftModal" :data="selectShift" />

  <UModal v-model:open="removeShiftModal" title="Uyarı"
    description="Vardiyayı kaldırmak istediğinizden emin misiniz?">
    <template #body>
      <div class="space-y-4">
        <p>Vardiyayı kaldırmak üzeresiniz. Bu işlem geri alınamaz.</p>
        <div class="flex justify-end">
          <UButton label="Vardiyayı Kaldır" variant="subtle" color="error" loading-auto @click="onRemove" />
        </div>
      </div>
    </template>
  </UModal>
</template>
