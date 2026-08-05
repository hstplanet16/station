<script setup lang="ts">
import type { AuthFormField, BreadcrumbItem, FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/Auth/Auth'
import { usePLC } from '~/composables/usePLC'
import { useStationStore } from '~/store/Station'
import type { IType } from '~/types/process'
import { isValidProductVin } from '~/utils/productVin'

definePageMeta({ layout: 'barcode' })

const toast = useToast()
const loading = ref(false)
const selectType = ref("")
const selectBarcode = ref("")

const { writeMultiple, plcData, writeValue } = usePLC()

const { createProcessReport } = useReportService()

const fields = ref<AuthFormField[]>([{
  name: 'barcode',
  type: 'text',
  label: 'Ürün VIN',
  placeholder: 'NL1CSU.....'
}])

const stationStore = useStationStore()

const breadcrumbItems = computed(() => {
  const items = [
    {
      label: 'Ürün Bekleniyor',
      icon: 'i-lucide-loader-circle',
      active: true
    }
  ]

  if (!stationStore.getPreVIN) {
    items.unshift({
      label: "Ürün Tanımsız",
      icon: "material-symbols:warning-rounded",
      active: false
    })
  } else {
    items.unshift({
      label: stationStore.getPreVIN[0]['vin1'],
      icon: "",
      active: false
    })
  }

  return items
})

const onStartVIN = async (data: string) => {

  if (stationStore.getStation.stationUid.includes("on_hazirlik")) {

    const seri = data.substring(0, 12)
    const type = data.substring(12, 19)

    const { data: process } = await useAxios().get(`Process/getStationProcess?stationId=${stationStore.getStation.id}&typeCode=${type}`)
    selectBarcode.value = seri
    loading.value = true

    const localType = JSON.parse(localStorage.getItem("Next-Type") || "[]") as IType[]

    localStorage.setItem(`vin-data-${seri}`, JSON.stringify(process))

    await createProcessReport(seri)

    selectType.value = type
    await writeMultiple({ Calisma_Izin_Talb: true })

    loading.value = false
    return
  }

  const vin = data?.trim() ?? ''
  selectBarcode.value = vin
  if (!isValidProductVin(vin)) {
    toast.add({
      title: 'Geçersiz VIN',
      description: 'Lütfen geçerli bir VIN numarası girin.',
      color: 'warning'
    })
    return
  }

  loading.value = true

  try {
    let VINData = undefined
    if (stationStore.getStation.listenToBack && stationStore.getPreVIN && stationStore.getPreVIN[0]["vin1"] == vin) {
      VINData = stationStore.getPreVIN
      stationStore.setPreVIN(undefined)
    } else {
      const { data } = await useAxios().get(`Vin/FindVin?vin=${vin}`)
      VINData = data
    }

    if (!VINData || VINData.length === 0) {
      toast.add({
        title: 'VIN bulunamadı',
        description: 'Girilen VIN numarası sistemde kayıtlı değil.',
        color: 'error'
      })
      return
    }

    if (stationStore.getStation.listenToPrev) {
      if (typeof window != 'undefined' && (window as any).electronAPI?.onTCPSend) {
        (window as any).electronAPI.onTCPSend(JSON.stringify(VINData))
      }
    }

    const typeCode = VINData[0]?.type
    const localType = JSON.parse(localStorage.getItem("Next-Type") || "[]") as IType[]
    if (!typeCode || !localType.find(e => e.id == typeCode.id)) {
      toast.add({
        title: 'İşlem tipi bulunamadı',
        description: 'VIN için işlem tipi belirlenemedi.',
        color: 'error'
      })
      return
    }

    localStorage.setItem(`vin-data-${vin}`, JSON.stringify(VINData))

    await createProcessReport(vin)

    selectType.value = typeCode.typeCode
    await writeMultiple({ Calisma_Izin_Talb: true })

  } catch (error: any) {
    toast.add({
      title: 'Sorgulama hatası',
      description: error?.message || 'VIN sorgulanırken bir hata oluştu.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function onSubmit(payload: FormSubmitEvent<{ barcode?: string }>) {
  const vin = payload.data.barcode?.trim() ?? ''
  await onStartVIN(vin)
}

let unsubscribeBarcode: (() => void) | null = null
let unsubscribeCardReader: (() => void) | null = null
let unsubscribeWorkStart: (() => void) | null = null

onMounted(() => {
  if (typeof window !== 'undefined' && (window as any).electronAPI) {
    const api = (window as any).electronAPI

    if (api.barcodeStream) {
      unsubscribeBarcode = api.barcodeStream(async (barcode: string) => {
        onStartVIN(barcode)
        useToast().add({ color: "success", title: "Bilgi", description: `Barkod Yazıldı : ${barcode}` })
        await writeMultiple({ VIN: selectBarcode.value })
        await navigateTo(`/${encodeURIComponent(selectBarcode.value)}/100?typeCode=${selectType.value}`)
        useToast().add({ color: "success", title: "Bilgi", description: `Çalışma izni verildi.` })
      })
    }

    if (api.workStart) {
      unsubscribeWorkStart = api.workStart(async (workStart: any) => {
        console.log(workStart);
        if (workStart.start) {
          /*useToast().add({ color: "success", title: "Bilgi", description: `Çalışma izni verildi.` })
          await writeMultiple({ VIN: selectBarcode.value })
          await navigateTo(`/${encodeURIComponent(selectBarcode.value)}/100?typeCode=${selectType.value}`)*/
          if (unsubscribeWorkStart) {
            unsubscribeWorkStart()
            unsubscribeWorkStart = null
          }
        }
      })
    }

    if (api.cardReaderStream) {
      unsubscribeCardReader = api.cardReaderStream(async (card: string) => {
        const { logout } = useAuth()
        logout()
        navigateTo('/auth/login')
      })
    }
  }

  writeMultiple({ Ana_Bar_Bek: true }).catch(err => {
    console.error("PLC Ana_Bar_Bek hatası:", err)
  })
})

onUnmounted(() => {
  if (unsubscribeBarcode) {
    unsubscribeBarcode()
    unsubscribeBarcode = null
  }

  if (unsubscribeCardReader) {
    unsubscribeCardReader()
    unsubscribeCardReader = null
  }

  if (unsubscribeWorkStart) {
    unsubscribeWorkStart()
    unsubscribeWorkStart = null
  }
})

watch(plcData, (value: any) => {
  if (value) {
    //console.log(value);
    try {
      if (value.Log_Out) {
        const { logout } = useAuth()
        logout()
      }

    } catch (error) {
      console.log("Sıkıcı verileri dönüştürülemedi.");
    }
  }
}, { deep: true, immediate: true })

const isPlcSliderOpen = ref(false)

</script>

<template>
  <div class="space-y-4">
    <HomeStats />
    <UBreadcrumb separator-icon="i-lucide-arrow-right" :items="breadcrumbItems" />
    <UPageCard title="Ürün VIN" orientation="horizontal" spotlight spotlight-color="primary" variant="soft">
      <template #description>
        <div class="space-y-4">
          <p>
            İstasyonda bir iş başlatabilmek için lütfen ilgili ürünün VIN numarasını okutun.
            Eğer şu an VIN okutamıyorsanız VIN bilgisini manuel olarak girerek devam edin.
          </p>
          <UAuthForm :fields="fields" class="max-w-md" :submit="{ label: 'Sorgula', loading }" @submit="onSubmit" />
        </div>
      </template>
      <div class="scanner ml-auto">
        <div class="scanner-box">
          <div class="scan-line" />
        </div>
      </div>
    </UPageCard>
  </div>

  <USlideover v-model:open="isPlcSliderOpen" side="right">
    <template #body>
      <div class="p-4">
        <h3 class="text-lg font-semibold mb-4">PLC Verileri</h3>

        <div class="mb-6">
          <h4 class="text-sm font-medium text-gray-500 mb-2">PLC'ye Yazılan Değerler</h4>

        </div>

        <div>
          <h4 class="text-sm font-medium text-gray-500 mb-2">PLC'den Okunan Değerler</h4>
          <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 min-h-[100px]">
            <pre class="text-xs overflow-auto">{{ plcData || 'Veri bekleniyor...' }}</pre>
          </div>
        </div>
      </div>
    </template>
  </USlideover>
</template>

<style scoped>
.scanner {
  position: relative;
  width: 300px;
  height: 300px;
  display: flex;
  justify-content: center;
  align-items: center;
  background:
    radial-gradient(circle,
      color-mix(in srgb, var(--ui-primary) 15%, transparent) 0%,
      transparent 70%);
  overflow: hidden;
}

.scanner::before {
  content: "";
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(color-mix(in srgb, var(--ui-primary) 12%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ui-primary) 12%, transparent) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(circle, black 0%, transparent 100%);
  mask-image: radial-gradient(circle, black 0%, transparent 100%);
}

.scanner-box {
  position: relative;
  width: 220px;
  height: 220px;
  border: 1px solid color-mix(in srgb, var(--ui-primary) 30%, transparent);
  box-shadow:
    0 0 4px color-mix(in srgb, var(--ui-primary) 30%, transparent),
    inset 0 0 4px color-mix(in srgb, var(--ui-primary) 15%, transparent);
}

.scan-line {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  height: 2px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--ui-primary), 30% transparent);
  box-shadow:
    0 0 6px color-mix(in srgb, var(--ui-primary), 80% transparent),
    0 0 6px color-mix(in srgb, var(--ui-primary), 80% transparent),
    0 0 6px color-mix(in srgb, var(--ui-primary), 80% transparent);
  animation: scan 4s ease-in-out infinite alternate;
}

.scan-line::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -60px;
  height: 120px;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
  filter: blur(10px);
}

@keyframes scan {
  from {
    transform: translateY(0);
  }

  to {
    transform: translateY(-192px);
  }
}
</style>
