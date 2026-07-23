<script setup lang="ts">
import { useStationStore } from '~/store/Station'


const loading = ref(true)
const station = useStationStore()

const state = reactive<{ [key: string]: boolean }>({
  sendFarplas: false,
  sendNextSolution: false,
  stationProductivityNotifiction: false,
  personProductivityNotifiction: false,
  productDelayNotification: false,
  errorNotification: false
})

const sections = [{
  title: 'Bildirimler',
  description: 'İstasyon iş süreçlerinde olan işlemlerden haberdar olun.',
  fields: [{
    name: 'sendFarplas',
    label: 'Farplas Sistemleri',
    description: 'Bildirimleri Farplas sunucularına gönder.'
  }, {
    name: 'sendNextSolution',
    label: 'NextSolution APP',
    description: 'Bildirimleri Next Solution ile sistem içerisinden alın.'
  }]
}, {
  title: 'Neler Bildirilsin ?',
  description: 'İstasyonda ki hangi süreçlerin bildirilmesini istiyorsunuz.',
  fields: [{
    name: 'stationProductivityNotifiction',
    label: 'İstasyon verimliliği bildirimi',
    description: 'İstasyon verimliliği düşmeye başladığında bildirim alın.'
  }, {
    name: 'personProductivityNotifiction',
    label: 'Personel verimliliği bildirimi',
    description: 'Personelin istasyonda çalışma verimliliği düştüğünde bildirim alın.'
  }, {
    name: 'productDelayNotification',
    label: 'Üretim gecikmesi bildirimleri',
    description: 'Üretimde gecikmeler yaşandığında bildirim alın.'
  },
  {
    name: 'errorNotification',
    label: 'İstasyon içi hatalar bildirimi',
    description: 'İstasyonda yazılım hataları oluştuğunda bildirim alın.'
  }]
}]

async function onChange() {
  try {
    const { data } = await useAxios().post(`Notification/updateNotification`, { ...state, stationId: station.getStation.id })
  } catch (error) {
    useToast().add({ color: "error", title: "Hata", description: "Bildirim ayarlarınız değiştirilemedi." })
  }
}

onMounted(async () => {
  try {
    const { data } = await useAxios().get(`Notification/getNotification`)
    state.sendFarplas = data.sendFarplas
    state.sendNextSolution = data.sendNextSolution
    state.stationProductivityNotifiction = data.stationProductivityNotifiction
    state.personProductivityNotifiction = data.personProductivityNotifiction
    state.productDelayNotification = data.productDelayNotification
    state.errorNotification = data.errorNotification
  } catch (error) {
    useToast().add({ color: "error", title: "Hata", description: "Bildirimler okunamadı." })
  } finally {
    loading.value = false
  }
})

</script>

<template>
  <UEmpty title="Lütfen Bekleyin" description="Bildirimler ile ilgili ayarlarınıza erişiyorum." icon="eos-icons:loading"
    v-if="loading" />
  <div v-else class="space-y-4">
    <div v-for="(section, index) in sections" :key="index" class="">
      <UPageCard :title="section.title" :description="section.description" variant="naked" class="mb-4" />

      <UPageCard variant="subtle" :ui="{ container: 'divide-y divide-default' }">
        <UFormField v-for="field in section.fields" :key="field.name" :name="field.name" :label="field.label"
          :description="field.description" class="flex items-center justify-between not-last:pb-4 gap-2">
          <USwitch v-model="state[field.name]" @update:model-value="onChange" />
        </UFormField>
      </UPageCard>
    </div>
  </div>
</template>
