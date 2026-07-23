<script setup lang="ts">
import type { IBarcodeItem, IBarcodeStepData, IScrewStepData } from '~/types/process'

type BarcodeTestStepData = IBarcodeStepData | IScrewStepData

defineProps<{
  stepData: BarcodeTestStepData
}>()

const open = defineModel<boolean>('open', { default: false })

const emit = defineEmits<{
  previewChange: [payload: { barcode: IBarcodeItem | null, showNotFound: boolean, active: boolean }]
}>()

const testPanelRef = ref<{ clearTest: () => void } | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) {
    testPanelRef.value?.clearTest()
  }
})
</script>

<template>
  <USlideover
    v-model:open="open"
    title="Barkod Test"
    description="Okutulmuş gibi barkod yazın; eşleşirse önizleme dinamik güncellenir."
  >
    <template #body>
      <ProcessBarcodeTestPanel
        ref="testPanelRef"
        :barcodes="stepData.barcodes"
        :image-refs="stepData.imageRefs"
        @preview-change="emit('previewChange', $event)"
      />
    </template>
  </USlideover>
</template>
