<script setup lang="ts">
import { useShiftStore } from '~/store/Shift'

const shiftStore = useShiftStore()

const q = ref('')
const addShiftModal = ref(false)

const filteredShifts = computed(() => {
  return shiftStore.getShiftsList().filter((shift: any) => {
    return shift.name.search(new RegExp(q.value, 'i')) !== -1
  })
})

onMounted(async () => {
  await shiftStore.getShifts()
})

</script>

<template>
  <UContainer class="py-20">
    <UPageCard title="Vardiyalar"
      description="Üretim vardiyalarını yönetin. Vardiya başlangıç ve bitiş zamanlarını tanımlayın."
      variant="naked" orientation="horizontal" class="mb-4">
      <ShiftsAdd v-model:open="addShiftModal">
        <UButton label="Vardiya Ekle" color="neutral" class="w-fit lg:ms-auto" />
      </ShiftsAdd>
    </UPageCard>

    <UPageCard variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput v-model="q" icon="i-lucide-search" placeholder="Vardiya Ara..." autofocus class="w-full" />
      </template>

      <ShiftsList :members="filteredShifts" />
    </UPageCard>
  </UContainer>
</template>
