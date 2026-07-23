<script setup lang="ts">
import type { IBarcodeItem, IProcessImageRef, IProcessStepData } from '~/types/process'
import { generateId, hasBarcodeList } from '~/utils/processData'
import { useProcessImages } from '~/composables/useProcessImages'

const props = defineProps<{
  stepData: IProcessStepData
  processId: number
  barcodes?: IBarcodeItem[]
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  save: [imageRefs: IProcessImageRef[]]
}>()

const { saveImage, getImage, deleteImage, readFileAsDataUrl } = useProcessImages()
const fileInput = ref<HTMLInputElement | null>(null)
const localRefs = ref<IProcessImageRef[]>([])
const selectedBarcodeId = ref<string | undefined>()

const supportsBarcodeLink = computed(() => hasBarcodeList(props.stepData))

const availableBarcodes = computed(() => {
  if (hasBarcodeList(props.stepData)) {
    return props.stepData.barcodes
  }
  return props.barcodes ?? []
})

const barcodeSelectItems = computed(() =>
  availableBarcodes.value.map(b => ({ label: b.name, value: b.id }))
)

const perImageBarcodeItems = computed(() => [
  { label: 'Eşleme yok', value: undefined as string | undefined },
  ...barcodeSelectItems.value
])

function syncDefaultBarcode() {
  if (!availableBarcodes.value.length) {
    selectedBarcodeId.value = undefined
    return
  }
  if (!selectedBarcodeId.value || !availableBarcodes.value.some(b => b.id === selectedBarcodeId.value)) {
    selectedBarcodeId.value = availableBarcodes.value[0]?.id
  }
}

watch(open, async (isOpen) => {
  if (isOpen) {
    localRefs.value = [...props.stepData.imageRefs]
    syncDefaultBarcode()
    
    for (const ref of localRefs.value) {
      await loadImageSrc(ref)
    }
  }
})

watch(availableBarcodes, () => {
  if (open.value) syncDefaultBarcode()
}, { deep: true })

const imageSrcs = ref<Record<string, string>>({})

function getImageSrc(ref: IProcessImageRef): string | null {
  return imageSrcs.value[ref.id] || getImage(ref.id)
}

async function loadImageSrc(ref: IProcessImageRef) {
  const src = await getImage(ref.id)
  if (src) {
    imageSrcs.value[ref.id] = src
  }
}

function getBarcodeName(barcodeId?: string) {
  return availableBarcodes.value.find(b => b.id === barcodeId)?.name
}

async function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files?.length) return

  for (const file of Array.from(files)) {
    const dataUrl = await readFileAsDataUrl(file)
    const imageId = generateId()
    await saveImage(imageId, dataUrl)
    localRefs.value.push({
      id: imageId,
      barcodeId: supportsBarcodeLink.value ? selectedBarcodeId.value : undefined,
      label: file.name
    })
  }
  input.value = ''
}

function removeImage(ref: IProcessImageRef) {
  deleteImage(ref.id)
  localRefs.value = localRefs.value.filter(r => r.id !== ref.id)
}

function updateBarcodeLink(ref: IProcessImageRef, barcodeId: string | undefined) {
  const index = localRefs.value.findIndex(r => r.id === ref.id)
  if (index !== -1) {
    localRefs.value[index] = { ...localRefs.value[index], barcodeId }
  }
}

function save() {
  emit('save', localRefs.value)
  open.value = false
}

function triggerUpload() {
  fileInput.value?.click()
}
</script>

<template>
  <USlideover v-model:open="open" title="Resim Yönetimi"
    description="İşlem adımı için resimleri yükleyin ve barkodlarla eşleştirin.">
    <template #body>
      <div class="space-y-4">
        <input ref="fileInput" type="file" accept="image/*" multiple class="hidden" @change="onFileSelect">

        <UButton label="Resim Yükle" icon="i-lucide-upload" @click="triggerUpload" block />

        <div v-if="supportsBarcodeLink" class="space-y-2 rounded-lg border border-default p-3">
          <UFormField
            label="Barkod Eşlemesi"
            description="Yükleyeceğiniz resimler seçili barkoda bağlanır. Her resmin altından da değiştirebilirsiniz."
          >
            <USelect
              v-if="availableBarcodes.length"
              v-model="selectedBarcodeId"
              :items="barcodeSelectItems"
              placeholder="Barkod seçin"
              class="w-full"
            />
          </UFormField>

          <UAlert
            v-if="!availableBarcodes.length"
            title="Barkod bulunamadı"
            description="Resim eşlemesi için önce Barkod Listesi menüsünden malzeme ekleyin."
            variant="subtle"
            icon="i-lucide-barcode"
          />

          <div v-else class="flex flex-wrap gap-2">
            <UButton
              v-for="barcode in availableBarcodes"
              :key="barcode.id"
              size="sm"
              :variant="selectedBarcodeId === barcode.id ? 'solid' : 'soft'"
              :color="selectedBarcodeId === barcode.id ? 'primary' : 'neutral'"
              @click="selectedBarcodeId = barcode.id"
            >
              {{ barcode.name }}
            </UButton>
          </div>
        </div>

        <div v-if="localRefs.length === 0" class="text-center text-muted py-8">
          Henüz resim yüklenmedi.
        </div>

        <ul v-else class="space-y-3">
          <li
            v-for="ref in localRefs"
            :key="ref.id"
            class="border border-default rounded-lg overflow-hidden"
          >
            <div class="relative aspect-video bg-muted">
              <img
                v-if="getImageSrc(ref)"
                :src="getImageSrc(ref)!"
                class="w-full h-full object-contain"
                alt="İşlem resmi"
              >
            </div>
            <div class="p-3 space-y-2">
              <p class="text-sm text-muted truncate">{{ ref.label ?? ref.id }}</p>
              <UFormField
                v-if="supportsBarcodeLink && availableBarcodes.length"
                label="Bağlı Barkod"
              >
                <USelect
                  :model-value="ref.barcodeId"
                  :items="perImageBarcodeItems"
                  placeholder="Barkod seçin"
                  class="w-full"
                  @update:model-value="updateBarcodeLink(ref, $event as string | undefined)"
                />
              </UFormField>
              <p v-else-if="supportsBarcodeLink && ref.barcodeId" class="text-xs text-muted">
                Barkod: {{ getBarcodeName(ref.barcodeId) }}
              </p>
              <UButton label="Sil" icon="i-lucide-trash-2" color="error" variant="soft" size="sm" block @click="removeImage(ref)" />
            </div>
          </li>
        </ul>

        <div class="flex justify-end pt-4">
          <UButton label="Kaydet" @click="save" loading-auto />
        </div>
      </div>
    </template>
  </USlideover>
</template>
