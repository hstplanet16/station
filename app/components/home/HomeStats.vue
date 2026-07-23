<script setup lang="ts">
import { useStationStore } from '~/store/Station'


const reportData = ref<any>(undefined)


const baseStats = [{
  title: 'Toplam Üretim',
  label: "totalProduct",
  icon: 'solar:box-broken',
  unit: "Adet"
}, {
  title: 'Ortalam Üretim Süresi',
  label: "meanProductTime",
  icon: 'material-symbols:avg-time-outline',
  unit: "Saniye"
}, {
  title: 'İşlem Adedi',
  icon: 'material-symbols:account-tree-outline-rounded',
  label: "processCount",
  unit: "Adet"
}, {
  title: 'İşlem Başına Süre',
  icon: 'material-symbols:avg-time-outline',
  label: "processTime",
  unit: "Saniye"
}]

const stats = computed(() => {
  return baseStats.map((stat) => {
    if (!reportData.value) {
      return {}
    }
    return {
      title: stat.title,
      icon: stat.icon,
      value: reportData.value[stat.label],
      unit: stat.unit
    }
  })
})



onMounted(async () => {
  const date = new Date().toISOString()
  const stationStore = useStationStore()
  try {
    const { data } = await useAxios().post("Report/dailyReport", {
      date,
      stationId: stationStore.getStation.id
    })
    reportData.value = data
    localStorage.setItem("next-station-report", JSON.stringify(data))

  } catch (error) {

  }
})

</script>

<template>
  <UPageGrid class="lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-px">
    <UPageCard v-for="(stat, index) in stats" :key="index" :icon="stat.icon" :title="stat.title" variant="subtle" :ui="{
      container: 'gap-y-1.5',
      wrapper: 'items-start',
      leading: 'p-2.5 rounded-full bg-primary/10 ring ring-inset ring-primary/25 flex-col',
      title: 'font-normal text-muted text-xs uppercase'
    }" class="lg:rounded-none first:rounded-l-lg last:rounded-r-lg hover:z-1">
      <div class="flex items-center gap-2">
        <span class="text-2xl font-semibold text-highlighted">
          {{ stat.value }} {{ stat.unit }}
        </span>
      </div>
    </UPageCard>
  </UPageGrid>
</template>
