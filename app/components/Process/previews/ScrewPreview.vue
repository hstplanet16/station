<script setup lang="ts">
import type { IBarcodeItem, IScrewStepData } from '~/types/process'
import { replaceBarcodePlaceholders } from '~/utils/processData'
import { processPreviewCtaUi, processPreviewImageColumnClass, processPreviewPlaceholderImageClass } from '~/utils/processPreviewLayout'
import { useProcessImages } from '~/composables/useProcessImages'

interface IScrewPointResult {
  NoktaIndex: number
  ToplamIndex: number
  Torque: number
  Angle: number
  TighteningStatus: boolean
}

const props = defineProps<{
  data: IScrewStepData
  previewBarcodeIndex?: number
  previewBarcode?: IBarcodeItem | null
  showNotFound?: boolean
  readonly?: boolean
  remainingSeconds?: number
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:description': [value: string]
  'update:scannedLabel': [value: string]
  'update:screws': [value: IScrewStepData['screws']]
  'update:screwPoints': [value: IScrewStepData['screwPoints']]
  'complateProcess': [value: boolean]
}>()

const { writeMultiple, writeValue, plcData } = usePLC()
const { getImage } = useProcessImages()
const { createReport, updateReport } = useReportService()

const primaryScrew = computed(() => props.data.screws[0])

const activeBarcode = computed(() => {
  if (props.previewBarcode) return props.previewBarcode
  const idx = props.previewBarcodeIndex ?? 0
  return props.data.barcodes[idx] ?? null
})

const displayName = computed(() => activeBarcode.value?.name ?? '{barcodeName}')

const resolvedDescription = computed(() =>
  replaceBarcodePlaceholders(props.data.description, displayName.value)
)

const resolvedScannedLabel = computed(() =>
  replaceBarcodePlaceholders(props.data.scannedLabel, displayName.value)
)

const displayImages = ref<string[]>([])

async function loadDisplayImages() {
  if (!activeBarcode.value) {
    const images = await Promise.all(
      props.data.imageRefs.map(ref => getImage(ref.id))
    )
    displayImages.value = images.filter(Boolean) as string[]
  } else {
    const filteredRefs = props.data.imageRefs
      .filter(ref => ref.barcodeId === activeBarcode.value!.id || !ref.barcodeId)
    const images = await Promise.all(
      filteredRefs.map(ref => getImage(ref.id))
    )
    displayImages.value = images.filter(Boolean) as string[]
  }
}

watch(activeBarcode, () => {
  loadDisplayImages()
})

function updateScrewField(index: number, field: 'label' | 'description' | 'torqueValue' | 'angleValue', value: string) {
  const screws = [...props.data.screws]
  if (!screws[index]) {
    screws[index] = { label: '', description: '', torqueValue: '0 Nm', angleValue: '0 Derece' }
  }
  screws[index] = { ...screws[index], [field]: value }
  emit('update:screws', screws)
}

// ---- PLC başlatma akışı ----
async function startTighteningProcess() {
  let deviceId = -1
  const devices = useAppCookie('next-devices')
  if (devices.value) {
    const device = devices.value.find((e: any) => e.id == props.data.deviceId)
    if (device) deviceId = device.screwNumber
  }

  if (deviceId == -1 || props.data.programNumber <= 0 || props.data.screwPoints.length == 0) {
    useToast().add({ title: 'Hata', description: 'Bu işlem adımı için sıkıcı ayarlarınızda hatalar var.', color: 'error' })
    return
  }

  try {
    await writeMultiple({
      Sikici_No: deviceId,
      Program_No: props.data.programNumber,
      Sikma_Adedi: props.data.screwPoints.length,
      Sayfa_No: props.data.programNumber,
      Islem_No: 2,
    })
  } catch (err) {
    console.error('PLC başlatma hatası:', err)
    useToast().add({
      title: 'Hata',
      description: 'Sıkıcıya başlangıç komutu gönderilemedi. Lütfen tekrar deneyin.',
      color: 'error',
    })
  }
}

onMounted(async () => {
  await createReport(activeBarcode.value?.barcode)
  await loadDisplayImages()
  await startTighteningProcess()
})

const activePLCData = computed(() => {
  if (!plcData.value) {
    return `Aktif işlem için PLC verileri okunamadı.`
  }
  return `Aktif işlem için Sıkıcı Numarası : ${plcData.value['Sikici_No']}, Program Numrası : ${plcData.value['Program_No']}, Sıkma Adedi : ${plcData.value['Sikma_Adedi']} olarak ayarlanmıştır.`
})

// ---- Canlı gösterim vs. kayıtlı sonuçlar ayrımı ----

/**
 * Gelen paketin "gerçek sıkma sonucu" mu yoksa PLC'nin bir sonraki
 * noktaya geçerken gönderdiği "boş/hazırlanıyor" placeholder mı
 * olduğunu ayırt eder.
 *
 * PLC henüz sıkma yapmadan Torque:0, Angle:0, TighteningStatus:false
 * gönderiyor. Bu paket "sonuç" değil, sadece "X. noktaya geçildi" sinyali.
 */
function isRealResult(data: IScrewPointResult): boolean {
  return data.TighteningStatus === true || data.Torque > 0 || data.Angle > 0
}

// Ekranda gösterilen "son gerçek sonuç" — placeholder paketlerle ezilmez
const currentPoint = ref<IScrewPointResult>({
  NoktaIndex: 1,
  ToplamIndex: props.data.screwPoints.length,
  Torque: 0,
  Angle: 0,
  TighteningStatus: false,
})

// Tamamlanmış/gerçek sonuçlar, NoktaIndex bazında (sıra karışmasın diye Map)
const screwResults = ref<Map<number, IScrewPointResult>>(new Map())

// ProcessScrewPointEditor'a array olarak geçiyoruz (mevcut prop şekli)
const screwResultsArray = computed(() => Array.from(screwResults.value.values()))

const processCompleted = ref(false)

const pointDataView = computed(() => currentPoint.value)

watch(plcData, (value: any) => {
  if (!value || processCompleted.value) return

  let screwData: IScrewPointResult | null = null
  try {
    screwData = JSON.parse(value.Json_Mesaj1)
  } catch {
    // Henüz geçerli JSON gelmedi (örn. bağlantı henüz kurulmadı), sessizce geç
    return
  }

  if (!screwData || typeof screwData.NoktaIndex !== 'number') return

  // Sadece GERÇEK sonuç paketleri kartı günceller.
  // PLC'nin "yeni noktaya geçtim ama henüz sıkmadım" placeholder'ı
  // (Torque:0, Angle:0, TighteningStatus:false) kartı ezmez —
  // ekranda bir önceki gerçek sonuç görünmeye devam eder.
  if (isRealResult(screwData)) {
    currentPoint.value = screwData

    const existing = screwResults.value.get(screwData.NoktaIndex)
    const changed = !existing || JSON.stringify(existing) !== JSON.stringify(screwData)

    if (changed) {
      screwResults.value.set(screwData.NoktaIndex, { ...screwData })
      writeValue('Sikma_Veri_Alindi', true)
    }
  }

  // Süreç tamamlandı mı? Bu kontrol placeholder/real ayrımından bağımsız
  // çalışmalı, çünkü PLC son noktanın gerçek sonucuyla birlikte
  // Plc_Islemi_Bitti bayrağını da gönderir.
  console.log(screwData.NoktaIndex, screwData.ToplamIndex);

  if (screwData.NoktaIndex === screwData.ToplamIndex && !processCompleted.value) {
    processCompleted.value = true
    emit('complateProcess', true)
  }
}, { deep: true, immediate: true })

// Plc_İşlemi_Bitti bayrağını dinle ve bir sonraki aşamaya geç
watch(() => plcData.value?.Plc_İşlemi_Bitti, (isFinished) => {
  if (isFinished === true && !processCompleted.value) {
    processCompleted.value = true
    emit('complateProcess', true)
  }
})
</script>

<template>
  <ProcessPreviewShell :show-not-found="showNotFound">
    <UPageCTA orientation="horizontal" variant="naked" class="h-full w-full" :ui="processPreviewCtaUi">
      <template #title>
        <ProcessEditableField :model-value="data.title" tag="h1" class="text-4xl font-semibold" :readonly="readonly"
          @update:model-value="emit('update:title', $event)" />
      </template>
      <template #description>
        <ProcessEditableField :model-value="data.description" multiline placeholder="İşlem açıklaması..."
          :readonly="readonly" @update:model-value="emit('update:description', $event)">
          {{ resolvedDescription || 'İşlem açıklaması eklemek için tıklayın...' }}
        </ProcessEditableField>
        <p v-if="data.scannedLabel" class="mt-4">
          <ProcessEditableField :model-value="data.scannedLabel" tag="span" placeholder="Okutulan barkod etiketi..."
            :readonly="readonly" @update:model-value="emit('update:scannedLabel', $event)">
            {{ resolvedScannedLabel }}
          </ProcessEditableField>
        </p>
        <UAlert color="neutral" variant="subtle" title="İşlem Bilgileri" :description="activePLCData"
          icon="i-lucide-terminal" />
        <UPageGrid class="mt-4" v-if="props.readonly">
          <UPageCard highlight :highlight-color="pointDataView.TighteningStatus ? 'success' : 'error'" variant="outline"
            icon="mdi:screw-machine-flat-top">
            <template #title>
              <p>{{ pointDataView.NoktaIndex }}. Vida</p>
            </template>
            <template #description>
              <p>{{ pointDataView.NoktaIndex }}. Vida Sıkıcınız</p>
            </template>
          </UPageCard>
          <UPageCard title="TORK Değeri" highlight
            :highlight-color="pointDataView.TighteningStatus ? 'success' : 'error'" variant="outline"
            icon="mdi:screw-machine-flat-top" :description="pointDataView.Torque + ' Nm'" />
          <UPageCard title="AÇI Değeri" highlight
            :highlight-color="pointDataView.TighteningStatus ? 'success' : 'error'" variant="outline"
            icon="solar:smartphone-rotate-angle-bold-duotone" :description="pointDataView.Angle + ' Derece'" />
        </UPageGrid>

      </template>
      <div :class="processPreviewImageColumnClass">
        <ProcessScrewPointEditor v-if="displayImages.length" :image-src="displayImages[0]!" :points="data.screwPoints"
          :readonly="readonly" @update:points="emit('update:screwPoints', $event)" :screw-data="screwResultsArray" />
        <ProcessPreviewImageFrame v-else>
          <img src="https://picsum.photos/640/728" alt="Illustration" :class="processPreviewPlaceholderImageClass"
            loading="lazy">
        </ProcessPreviewImageFrame>
      </div>
    </UPageCTA>

    <template #not-found>
      <UEmpty title="Malzeme Numarası Bulunamadı">
        <template #description>
          <p>{{ data.settings.materialNotFoundMessage }}</p>
          <p v-if="data.settings.materialNotFoundAction !== 'wait'" class="mt-2">
            Sizi <span class="font-semibold">{{ remainingSeconds ?? data.settings.materialNotFoundDelay }}</span> sn
            içerisinde diğer adıma
            yönlendireceğim.
          </p>
        </template>
      </UEmpty>
    </template>
  </ProcessPreviewShell>
</template>