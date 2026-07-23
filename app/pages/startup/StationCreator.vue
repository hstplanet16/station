<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, StepperItem } from '@nuxt/ui'
import { useSyncStore } from '~/store/Sync'
import { isNetworkError } from '~/composables/requestBufferUtils'
import { buildOfflineStation, createStationOffline, persistLocalStation, sendConfigToElectron } from '~/utils/stationSetup'

definePageMeta({ layout: "auth" })

const syncStore = useSyncStore()
const configurationSelected = ref(false)
const stationList = ref<any[]>([])
const loading = ref(false)
const error = ref(false)
const isOfflineSetup = ref(false)
const form = useTemplateRef('form')
const stepper = useTemplateRef('stepper')
const items = ref<StepperItem[]>([
  {
    title: 'Yapılandırma',
    description: 'İstasyonun yapılandırmasını belirleyin.',
    icon: 'i-lucide-house',
    slot: 'configuration'
  },
  {
    title: 'Yeni İstasyon',
    description: 'Yeni istasyon bilgilerini tanımlayın.',
    icon: 'i-lucide-truck',
    slot: 'new'
  },
  {
    title: 'Oluşturma',
    description: 'İşlem özetini onaylayın.',
    slot: 'confirm'
  }
])


const stepperIndex = ref(0)
const selectStationID = ref(undefined)

const state = reactive({
  name: "",
  stationUid: "",
  description: "",
  tagTime: 180,
  difficultyLevel: 2,
  stationActive: true,
  ergonomiActive: false
})

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  stationUid: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  tagTime: z.number(),
  difficultyLevel: z.number().optional(),
  description: z.string().min(15, 'En az 15 karakter olmalıdır.'),
  ergonomiActive: z.boolean().optional(),
  stationActive: z.boolean().optional()
})

const detail = computed(() => {
  if (configurationSelected.value) {
    return stationList.value.find(e => e.stationUid == selectStationID.value)
  } else {
    return state
  }
})

const currentDate = computed(() => {
  return new Date().toISOString().split('T')[0]
})

function getCreatePayload() {
  return {
    name: state.name,
    stationUid: state.stationUid,
    description: state.description,
    tagTime: state.tagTime,
    difficultyLevel: state.difficultyLevel,
    stationActive: state.stationActive,
    ergonomiActive: state.ergonomiActive
  }
}

function shouldCreateOffline() {
  return isOfflineSetup.value
    || !syncStore.isOnline
    || (typeof navigator !== 'undefined' && !navigator.onLine)
}

onMounted(async () => {
  loading.value = true

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    syncStore.setOnline(false)
    isOfflineSetup.value = true
    loading.value = false
    return
  }

  try {
    const { data } = await useAxios().get('Station/getAllStation', { timeout: 5000 })
    stationList.value = data
    if (data.length > 0) selectStationID.value = data[0].stationUid
  } catch (e: any) {
    if (e?.isOffline || isNetworkError(e)) {
      syncStore.setOnline(false)
      isOfflineSetup.value = true
      stationList.value = []
    } else {
      error.value = true
      useToast().add({ color: 'error', title: 'Hata', description: 'Sunucu bağlantısında sorun var.' })
    }
  } finally {
    loading.value = false
  }
})

function completeStationSetup(data: any, offline = false) {
  persistLocalStation(data) // persistLocalStation zaten sendConfigToElectron çağırıyor
  // Electron config burada da açıkça tetiklenebilir (persistLocalStation içinde zaten yapılıyor)
  sendConfigToElectron(data)
  useToast().add({
    color: offline ? 'warning' : 'success',
    title: offline ? 'Çevrimdışı kurulum' : 'Kurulum tamamlandı',
    description: offline
      ? 'İstasyon yerel olarak kaydedildi. Bağlantı sağlandığında sunucuya gönderilecek.'
      : 'İstasyon başarıyla yapılandırıldı.'
  })
  navigateTo('/auth/login')
}

const create = async () => {
  const payload = getCreatePayload()

  if (shouldCreateOffline()) {
    syncStore.setOnline(false)
    const station = createStationOffline(payload)
    completeStationSetup(station, true)
    return
  }

  try {
    const { data } = await useAxios().post('Station/createStation', payload, { timeout: 8000 })
    completeStationSetup(data)
  } catch (error: any) {
    if (error?.isOffline || isNetworkError(error)) {
      syncStore.setOnline(false)
      isOfflineSetup.value = true

      const station = error?.isOffline
        ? buildOfflineStation(payload)
        : createStationOffline(payload)

      if (error?.isOffline) {
        persistLocalStation(station)
      }

      completeStationSetup(station, true)
      return
    }

    useToast().add({
      color: 'error',
      title: 'Hata',
      description: 'Bir hata oluştu, şu an istasyon kurulumunu tamamlayamadık.'
    })
  }
}

const nextStep = async () => {
  if (stepperIndex.value == 0 && configurationSelected.value) {
    stepperIndex.value = 2
  } else if (stepperIndex.value == 1) {
    try {
      await form.value?.validate({ silent: false })
      stepper.value?.next()
    } catch (error) {
      console.log('Form hatalı', error)
    }
  } else if (stepperIndex.value == 2) {
    if (configurationSelected.value) {
      if (isOfflineSetup.value || !detail.value) {
        useToast().add({
          color: 'warning',
          title: 'Çevrimdışı',
          description: 'Mevcut istasyon seçimi için sunucu bağlantısı gerekir. Yeni istasyon kurulumunu kullanın.'
        })
        return
      }

      completeStationSetup(detail.value)
    } else {
      await create()
    }
  }
}

const backStep = () => {
  if (configurationSelected.value && stepperIndex.value > 0) {
    stepperIndex.value = 0
  } else if (configurationSelected.value && stepperIndex.value == 0) {
    configurationSelected.value = false
  }
  else {
    stepper.value?.prev()
  }
}

</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 p-4 h-screen">
    <UPageCard class="w-full max-w-5xl" :ui="{ body: 'w-full', footer: 'w-full' }">

      <template #body>
        <UEmpty icon="material-icon-theme:dart-generated" title="Next Solution"
          description="Sisteminizi yapılandıralım. Adımları takip edin. Sadece bir kaç saniye sürecek." variant="naked"
          :ui="{ root: 'sm:p-2', header: 'max-w-xl' }" />
        <UAlert v-if="isOfflineSetup" color="warning" variant="subtle" title="Çevrimdışı mod"
          description="Sunucuya bağlanılamadı. Yeni istasyon kurulumu yerel olarak kaydedilir; bağlantı sağlandığında sunucuya gönderilir."
          class="mb-4" />
        <UStepper :items="items" ref="stepper" v-model="stepperIndex" size="sm" disabled>
          <template #configuration>
            <div class="flex gap-x-4" v-if="!configurationSelected">
              <UPageCard title="Yeni İstasyon Kurulumu" description="Yeni bir istasyon mu oluşturmak istiyorsunuz?"
                spotlight spotlight-color="success" @click="stepper?.next()" class="flex-1 cursor-pointer" />
              <UPageCard title="İstasyon Seçimi" description="Var olan bir istasyonu mu aktif etmek istiyorsunuz?"
                spotlight spotlight-color="warning" @click="() => { configurationSelected = true }"
                :class="['flex-1', isOfflineSetup ? 'opacity-50 pointer-events-none' : 'cursor-pointer']" />
            </div>
            <div class="space-y-4" v-else>
              <UFormField label="İstasyonlar" description="Oluşturmak istediğiniz istasyonu seçin.">
                <UInputMenu v-model="selectStationID" :items="stationList" label-key="name" value-key="stationUid"
                  class="w-full" />
              </UFormField>
            </div>
          </template>
          <template #new>
            <UForm ref="form" class="space-y-4" :state="state" :schema="schema">
              <div class="grid grid-cols-2 gap-x-8">
                <UFormField name="name" label="İstasyon Adı" description="Yeni istasyonunuzun görünen adını girin.">
                  <UInput v-model="state.name" class="w-full" />
                </UFormField>
                <UFormField name="stationUid" label="İstasyon UID"
                  description="Yeni istasyonunuzun sistemlerde tanımlanacak UID bilgisini girin.">
                  <UInput v-model="state.stationUid" class="w-full" />
                </UFormField>
              </div>
              <UFormField name="description" label="Açıklama"
                description="Yeni istasyonunuzda yapılan işlemleri açıklayan kısa bir yazı yazın.">
                <UTextarea v-model="state.description" :rows="4" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-x-8">
                <div class="space-y-4">
                  <UFormField name="tagTime" label="Çevrim Süresi"
                    description="Yeni istasyonunuzun bir işi en fazla kaç saniyede tamamlaması gerektiğini belirtin."
                    hint="Saniye">
                    <UInputNumber v-model="state.tagTime" class="w-full" />
                  </UFormField>
                  <UFormField name="difficultyLevel" label="Zorluk Seviyesi"
                    description="Yeni istasyonunuzun bir işi en fazla kaç saniyede tamamlaması gerektiğini belirtin."
                    hint="Saniye">
                    <UInputMenu v-model="state.difficultyLevel"
                      :items="[{ id: 1, label: 'Çok Zor' }, { id: 2, label: 'Kolay' }, { id: 3, label: 'Çok Kolay' }]"
                      label-key="label" value-key="id" class="w-full" />
                  </UFormField>
                </div>
                <div class="space-y-4">
                  <UFormField name="stationActive" label="İstasyon Aktif"
                    description="Aktif olmayan istasyonlar iş süreçlerine katılamaz.">
                    <UCheckbox v-model="state.stationActive" label="İstasyon aktif durumda mı?" />
                  </UFormField>
                  <UFormField name="ergonomiActive" label="Ergonomi"
                    description="Ergonomi aktif olan istasyonlar ergonomi süreçlerine dahil olur.">
                    <UCheckbox v-model="state.ergonomiActive"
                      label="İstasyon için ergonomi şartları aktif edilsin mi?" />
                  </UFormField>
                </div>
              </div>
            </UForm>
          </template>
          <template #confirm>
            <UPageCTA :ui="{ container: 'xl:p-4' }" title="Neredeyse Tamam"
              description="Bu bilgisayarı ayarlamak istediğiniz istasyon bilgilerini onaylayın. Sonrasında herşey hazır olacak."
              variant="naked" />
            <UBlogPost :title="detail.name" :description="detail.description" :date="currentDate"
              :badge="configurationSelected ? 'Tekrar Kurulum' : 'Yeni Kurulum'" variant="subtle" />
          </template>
        </UStepper>
      </template>

      <template #footer>
        <div class="flex justify-between w-full">
          <UButton label="Önceki" variant="subtle" @click="backStep" :disabled="loading"
            v-if="stepper?.hasPrev || configurationSelected" />
          <UButton :label="stepper?.hasNext ? 'Sonraki' : 'Tamamla'" variant="subtle" @click="nextStep"
            :disabled="loading" class="ml-auto" />
        </div>
      </template>
    </UPageCard>
  </div>
</template>
