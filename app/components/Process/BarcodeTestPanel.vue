<script setup lang="ts">
import type { IBarcodeItem, IProcessImageRef } from '~/types/process'
import { findBarcodeIndexByScan } from '~/utils/processData'
import { useProcessImages } from '~/composables/useProcessImages'

const props = withDefaults(defineProps<{
  barcodes: IBarcodeItem[]
  imageRefs: IProcessImageRef[]
  compact?: boolean
}>(), {
  compact: false
})

const testBarcodeInput = defineModel<string>('modelValue', { default: '' })

const emit = defineEmits<{
  previewChange: [payload: { barcode: IBarcodeItem | null, showNotFound: boolean, active: boolean }]
}>()

const { getImage } = useProcessImages()

const matchedIndex = computed(() => findBarcodeIndexByScan(props.barcodes, testBarcodeInput.value))

const isTestActive = computed(() => testBarcodeInput.value.trim().length > 0)

const matchedBarcode = computed(() => {
  if (matchedIndex.value < 0) return null
  return props.barcodes[matchedIndex.value] ?? null
})

const linkedImages = computed(() => {
  if (!matchedBarcode.value) return []
  return props.imageRefs
    .filter(ref => ref.barcodeId === matchedBarcode.value!.id || !ref.barcodeId)
    .map(ref => getImage(ref.id))
    .filter(Boolean) as string[]
})

watch([testBarcodeInput, matchedIndex], () => {
  if (!isTestActive.value) {
    emit('previewChange', { barcode: null, showNotFound: false, active: false })
    return
  }

  if (matchedBarcode.value) {
    emit('previewChange', { barcode: matchedBarcode.value, showNotFound: false, active: true })
    return
  }

  emit('previewChange', { barcode: null, showNotFound: true, active: true })
}, { immediate: true })

function fillSample(barcode: IBarcodeItem) {
  testBarcodeInput.value = barcode.barcode
}

function clearTest() {
  testBarcodeInput.value = ''
}

defineExpose({ clearTest })
</script>

<template>
  <div class="space-y-3 rounded-lg border border-default bg-elevated/40 p-4">
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <p class="font-semibold text-highlighted">Barkod Test</p>
        <p v-if="!compact" class="text-sm text-muted">Okutulmuş gibi barkod yazın; eşleşirse önizleme güncellenir.</p>
      </div>
      <UButton v-if="isTestActive" label="Temizle" variant="ghost" size="xs" @click="clearTest" />
    </div>

    <UFormField label="Test Barkodu" :description="compact ? undefined : 'Malzeme barkod değeri veya malzeme adı'">
      <UInput
        v-model="testBarcodeInput"
        placeholder="Örn: B1100005447"
        icon="i-lucide-scan-barcode"
        class="w-full"
        @keydown.enter.prevent
      />
    </UFormField>

    <UAlert
      v-if="isTestActive && matchedBarcode"
      color="success"
      variant="subtle"
      icon="i-lucide-check-circle"
      title="Malzeme bulundu"
      :description="`${matchedBarcode.name} (${matchedBarcode.barcode}) — ${linkedImages.length} resim`"
    />

    <UAlert
      v-else-if="isTestActive"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="Malzeme bulunamadı"
      description="Girilen barkod listede yok."
    />

    <div v-if="barcodes.length" class="space-y-2">
      <p class="text-xs font-medium text-muted uppercase">Hızlı test</p>
      <div class="flex flex-wrap gap-2">
        <UButton
          v-for="barcode in barcodes"
          :key="barcode.id"
          size="xs"
          variant="soft"
          @click="fillSample(barcode)"
        >
          {{ barcode.barcode }}
        </UButton>
      </div>
    </div>

    <div v-if="matchedBarcode && linkedImages.length" class="flex flex-wrap gap-2 pt-1">
      <div
        v-for="(src, index) in linkedImages.slice(0, compact ? 3 : 4)"
        :key="index"
        class="size-14 overflow-hidden rounded-md border border-default bg-muted"
      >
        <img :src="src" class="h-full w-full object-cover" alt="Bağlı resim">
      </div>
      <p v-if="linkedImages.length > (compact ? 3 : 4)" class="self-center text-xs text-muted">
        +{{ linkedImages.length - (compact ? 3 : 4) }} resim
      </p>
    </div>
  </div>
</template>
