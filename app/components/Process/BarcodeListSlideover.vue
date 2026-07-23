<script setup lang="ts">
import type { IBarcodeItem, IBarcodeStepData, IScrewStepData } from '~/types/process'
import { generateId } from '~/utils/processData'

type BarcodeListStepData = IBarcodeStepData | IScrewStepData

const props = defineProps<{
  stepData: BarcodeListStepData
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  save: [data: BarcodeListStepData]
}>()

const localBarcodes = ref<IBarcodeItem[]>([])
const newName = ref('')
const newBarcode = ref('')

watch(open, (isOpen) => {
  if (isOpen) {
    localBarcodes.value = [...props.stepData.barcodes]
    newName.value = ''
    newBarcode.value = ''
  }
})

function addBarcode() {
  if (!newName.value.trim() || !newBarcode.value.trim()) return
  localBarcodes.value.push({
    id: generateId(),
    name: newName.value.trim(),
    barcode: newBarcode.value.trim()
  })
  newName.value = ''
  newBarcode.value = ''
}

function removeBarcode(id: string) {
  localBarcodes.value = localBarcodes.value.filter(b => b.id !== id)
}

function save() {
  emit('save', { ...props.stepData, barcodes: localBarcodes.value })
  open.value = false
}
</script>

<template>
  <USlideover v-model:open="open" title="Barkod Listesi"
    description="Bu işlem adımı için olası parça listesini girin.">
    <template #body>
      <div class="space-y-4">
        <UAlert
          title="Bilgi"
          description="Metinlerde {barcodeName} ifadesi, barkoda verdiğiniz isim ile otomatik değiştirilir."
          variant="subtle"
          icon="i-lucide-info"
        />

        <div class="space-y-3 rounded-lg border border-default p-4">
          <UPageFeature title="Yeni Malzeme" description="Malzeme adı ve barkod değerini girin." />
          <UFormField label="Malzeme Adı" description="Ekranda görünecek isim (örn: C1_B1100005447_AA)">
            <UInput v-model="newName" placeholder="C1_B1100005447_AA" class="w-full" />
          </UFormField>
          <UFormField label="Barkod Değeri" description="Okuyucudan gelecek gerçek barkod değeri">
            <UInput v-model="newBarcode" placeholder="B1100005447" class="w-full" @keydown.enter="addBarcode" />
          </UFormField>
          <UButton label="Barkod Ekle" icon="i-lucide-plus" @click="addBarcode" :disabled="!newName.trim() || !newBarcode.trim()" />
        </div>

        <USeparator />

        <div v-if="localBarcodes.length === 0" class="text-center text-muted py-8">
          Henüz barkod eklenmedi.
        </div>

        <ul v-else class="space-y-2">
          <li
            v-for="item in localBarcodes"
            :key="item.id"
            class="flex items-center justify-between p-3 border border-default rounded-lg"
          >
            <div>
              <p class="font-semibold text-highlighted">{{ item.name }}</p>
              <p class="text-sm text-muted">{{ item.barcode }}</p>
            </div>
            <UButton icon="i-lucide-trash-2" color="error" variant="ghost" @click="removeBarcode(item.id)" />
          </li>
        </ul>

        <div class="flex justify-end pt-4">
          <UButton label="Kaydet" @click="save" loading-auto />
        </div>
      </div>
    </template>
  </USlideover>
</template>
