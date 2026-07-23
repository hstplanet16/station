<script setup lang="ts">
import type { IBarcodeItem, IBarcodeStepData } from '~/types/process'
import { replaceBarcodePlaceholders } from '~/utils/processData'
import { processPreviewCtaUi, processPreviewImageColumnClass, processPreviewImageGridHeight, processPreviewPlaceholderImageClass } from '~/utils/processPreviewLayout'
import { useProcessImages } from '~/composables/useProcessImages'

const props = defineProps<{
  data: IBarcodeStepData
  previewBarcodeIndex?: number
  previewBarcode?: IBarcodeItem | null
  showNotFound?: boolean
  readonly?: boolean
  remainingSeconds?: number
  matchedBarcode?: any
}>()

const emit = defineEmits<{
  'update:title': [value: string]
  'update:description': [value: string]
  'update:scannedLabel': [value: string]
  'complateProcess': [value: boolean]
}>()

const { getImage } = useProcessImages()

const { createReport, updateReport } = useReportService()

const activeBarcode = computed(() => {
  if (props.previewBarcode) return props.previewBarcode
  const idx = props.previewBarcodeIndex ?? 0
  return props.data.barcodes[idx] ?? null
})

const displayName = computed(() => activeBarcode.value?.name ?? '{barcodeName}')
const barcode = computed(() => activeBarcode.value?.barcode ?? '{barcodeName}')
const readerBarcode = ref('')
const errorBarcode = ref(false)

// Aynı barkodun/çift tetiklemenin process'i iki kez tamamlamasını engellemek için guard
const isCompleted = ref(false)
// Okuma sonrası kısa süreli "kilit" - çok hızlı ardışık taramalarda çift emit engellenir
let scanLock = false
const SCAN_LOCK_MS = 800

const resolvedDescription = computed(() =>
  replaceBarcodePlaceholders(props.data.description, displayName.value)
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

/**
 * Barkod karşılaştırmasında sorun çıkaran görünmez/gizli karakterleri temizler:
 * - \r \n \t (barkod okuyucunun otomatik eklediği Enter/Tab)
 * - kontrol karakterleri (\x00-\x1F, \x7F) — GS1/FNC1 ayraçları dahil
 * - zero-width space (\u200B) ve non-breaking space (\u00A0)
 * - baştaki/sondaki boşluklar
 */
function normalizeBarcode(value: string | null | undefined): string {
  if (!value) return ''
  return value
    .replace(/[\r\n\t]/g, '')
    .replace(/[\u200B\u00A0]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, '')
    .trim()
    .toUpperCase()
}

let unsubscribeBarcode: (() => void) | null = null

onMounted(async () => {
  await createReport(props.matchedBarcode)
  await loadDisplayImages()

  unsubscribeBarcode = (window as any).electronAPI.barcodeStream(async (rawBarcode: string) => {
    // Süreç zaten tamamlandıysa veya kısa kilit süresi içindeysek yeni okumayı yok say
    if (isCompleted.value || scanLock) return

    readerBarcode.value = rawBarcode

    const scanned = normalizeBarcode(rawBarcode)
    const expected = normalizeBarcode(activeBarcode.value?.barcode)

    // Geliştirme/teşhis amaçlı log — sorunlu karakterleri görünür kılar
    console.log('Barkod okundu (ham):', JSON.stringify(rawBarcode), '| uzunluk:', rawBarcode.length)
    console.log('Barkod okundu (normalize):', JSON.stringify(scanned))
    console.log('Beklenen (normalize):', JSON.stringify(expected))

    scanLock = true
    setTimeout(() => { scanLock = false }, SCAN_LOCK_MS)

    // Beklenen barkod, okunan (normalize edilmiş) verinin İÇİNDE geçiyor mu?
    // Not: expected boş olmamalı — boş string her zaman "includes" true döner, yanlış pozitifi engelliyoruz.
    if (expected && scanned.includes(expected)) {
      errorBarcode.value = false
      isCompleted.value = true

      try {
        await updateReport({
          result: 'OK',
          barcodeData: rawBarcode,
        })
        emit('complateProcess', true)
      } catch (err) {
        console.error('Rapor güncelleme hatası:', err)
        isCompleted.value = false // rapor kaydı başarısız olduysa tekrar denemeye izin ver
        useToast().add({
          title: 'Hata',
          description: 'Barkod doğrulandı ancak rapor kaydedilemedi. Lütfen tekrar deneyin.',
          color: 'error',
        })
      }
    } else {
      useToast().add({ color: 'error', title: 'Hata', description: 'Okuttuğunuz ürün barkodu geçersiz.' })
      errorBarcode.value = true
    }
  })
})

onUnmounted(() => {
  if (unsubscribeBarcode) {
    unsubscribeBarcode()
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
        <ProcessEditableField :model-value="data.description" multiline :readonly="readonly"
          @update:model-value="emit('update:description', $event)">
          {{ resolvedDescription.split(barcode)[0] }}
          <span class="font-semibold text-primary">{{ props.matchedBarcode }}</span>
          {{ resolvedDescription.split(barcode)[1] ?? '' }}
        </ProcessEditableField>
        <p class="mt-4">
          <ProcessEditableField :model-value="data.scannedLabel" tag="span" :readonly="readonly"
            @update:model-value="emit('update:scannedLabel', $event)">
            Okuttuğunuz barkod değeri :
            <span class="font-semibold" :class="errorBarcode ? 'text-error' : 'text-primary'">{{ readerBarcode }}</span>
          </ProcessEditableField>
        </p>
      </template>
      <div :class="processPreviewImageColumnClass">
        <ProcessPreviewImageFrame v-if="displayImages.length">
          <UImagesGrid :images="displayImages" :height="processPreviewImageGridHeight" />
        </ProcessPreviewImageFrame>
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