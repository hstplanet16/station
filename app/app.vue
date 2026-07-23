<script setup lang="ts">
import { sendConfigToElectron } from '~/utils/stationSetup'
import { usePLC } from './composables/usePLC'
import { useStationStore } from './store/Station'

const colorMode = useColorMode()
const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')
const { plcData } = usePLC()
// -------------------------------------------------------
// Cihaz bağlantı durumu
// -------------------------------------------------------
const deviceError = ref(false)
const deviceLoading = ref(true) // Bağlantı kuruluyor spinner'ı
const deviceResults = ref<{ deviceName: string; success: boolean; error?: string }[]>([])

const failedDevices = computed(() => deviceResults.value.filter(r => !r.success))
const modalTitle = computed(() => deviceLoading.value ? 'Lütfen Bekleyin' : (deviceError.value ? 'Bağlantı Hataları' : ''))
const modalOpen = computed(() => deviceLoading.value || deviceError.value)

const stationStore = useStationStore()

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'NextSolution'
const description = 'Profesyonel iş istasyonları'

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/dashboard-light.png',
  twitterCard: 'summary_large_image'
})


const connectDevices = async () => {
  deviceLoading.value = true
  deviceError.value = false
  deviceResults.value = []

  const storedDevices = useAppCookie('next-devices').value as any[] | null
  const deviceList = (storedDevices && storedDevices.length > 0)
    ? storedDevices
    : []

  try {
    const response = await (window as any).electronAPI.deviceConnection(
      JSON.stringify(deviceList)
    )

    deviceResults.value = response.results ?? []
    const allSuccess = response.stats === true

    if (allSuccess) {
      console.log('✅ Tüm cihaz bağlantıları başarılı.')
      deviceError.value = false
      deviceLoading.value = false
    } else {
      // En az bir cihaz başarısız
      deviceError.value = true
      deviceLoading.value = false

      console.warn('⚠️ Bazı cihaz bağlantıları başarısız:', failedDevices.value)
    }

  } catch (error) {
    console.error('IPC Çağrısı esnasında kritik hata:', error)
    deviceResults.value = [{ deviceName: 'Bilinmeyen', success: false, error: String(error) }]
    deviceError.value = true
    deviceLoading.value = false
  }
}

let unsubscribeTCP: (() => void) | null = null

onMounted(async () => {
  // Electron ortamında değilse cihaz bağlantı sürecini atla
  if (typeof window === 'undefined' || !(window as any).electronAPI) {
    deviceLoading.value = false
    return
  }

  // 1) Mevcut istasyon bilgisi varsa Electron config'i senkronize et
  const storedStation = useAppCookie('next-station').value
  if (storedStation?.id) {
    sendConfigToElectron(storedStation)
  }

  await connectDevices()
  
  unsubscribeTCP = (window as any).electronAPI.onTCPData(async (data: string) => {
    stationStore.setPreVIN(data)
  })

})

onUnmounted(() => {
  if (unsubscribeTCP) unsubscribeTCP()
})

</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <!-- Cihaz bağlantı durumu modal'ı -->
    <UModal v-model:open="modalOpen" :title="modalTitle" description="Cihaz bağlantıları" :close="false"
      :dismissible="false">
      <template #body>
        <!-- Bağlantı kuruluyor spinner -->
        <div v-if="deviceLoading" class="flex flex-col items-center gap-4 py-4">
          <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary" />
          <p class="text-sm text-muted">Cihazlar ile bağlantılar kuruluyor, lütfen bekleyin...</p>
        </div>

        <!-- Hata listesi: hangi cihaz başarısız -->
        <div v-else-if="deviceError" class="flex flex-col gap-3">
          <UAlert color="warning" variant="subtle" title="Bazı cihazlara bağlanılamadı"
            description="Aşağıdaki cihazlar bağlanırken hata oluştu. Sistem otomatik olarak yeniden bağlanmayı deneyecektir."
            icon="i-lucide-triangle-alert" />
          <div class="flex flex-col gap-2 mt-1">
            <div v-for="device in failedDevices" :key="device.deviceName"
              class="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3">
              <UIcon name="i-lucide-x-circle" class="size-5 text-red-400 mt-0.5 shrink-0" />
              <div class="flex flex-col gap-0.5 min-w-0">
                <span class="text-sm font-medium text-red-300">{{ device.deviceName }}</span>
                <span class="text-xs text-muted truncate">{{ device.error ?? 'Bağlantı kurulamadı' }}</span>
              </div>
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-4">
            <UButton label="Devam Et" variant="subtle" color="neutral" @click="() => { deviceError = false }" />
            <UButton label="Tekrar Dene" color="primary" @click="connectDevices" />
          </div>
        </div>
      </template>
    </UModal>

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
