<script setup lang="ts">
import { useProcessStore } from '~/store/Process'
import { useStationStore } from '~/store/Station'
import { useDeviceStore } from '~/store/Device'
import type { IProcess, IBarcodeItem, IBarcodeStepData, IScrewStepData, IGeneralStepData, IServerStepData, IProcessSettings, IProcessImageRef } from '~/types/process'
import { processTypeLabel, isBarcodeStepData, isScrewStepData, isGeneralStepData, isServerStepData, hasBarcodeList } from '~/utils/processData'

const props = defineProps<{
  process: IProcess
}>()

const station = useStationStore()
const processStore = useProcessStore()
const deviceStore = useDeviceStore()

const processRef = toRef(props, 'process')
const { stepData, saving, saveData } = useProcessStep(processRef)

const removeProcess = ref(false)
const editOpen = ref(false)
const barcodeListOpen = ref(false)
const barcodeTestOpen = ref(false)
const imageManagerOpen = ref(false)
const settingsOpen = ref(false)
const manualPreviewIndex = ref(0)
const manualShowNotFound = ref(false)
const testPreviewBarcode = ref<IBarcodeItem | null>(null)
const testShowNotFound = ref(false)
const barcodeTestActive = ref(false)

const emits = defineEmits(['close'])

const screwDevices = computed(() =>
  deviceStore.getDevices
    .filter((d: any) => d.type === 'BoringDevice')
    .map((d: any) => ({ label: d.name, value: d.id }))
)

const dropdownItems = computed(() => [[{
  label: props.process.pasif ? 'Aktif Yap' : 'Pasif Yap',
  icon: props.process.pasif ? 'i-lucide-check-circle' : 'material-symbols-light:hourglass-pause-outline',
  onSelect: async () => {
    try {
      await processStore.changeActivePassive(props.process.id)
    } catch (error: any) {
      if (error?.isOffline) {
        useToast().add({ title: 'Çevrimdışı', description: 'Değişiklik yerel olarak kaydedildi.', color: 'warning' })
      }
    }
  }
}, {
  label: 'Düzenle',
  icon: 'material-symbols:tv-options-edit-channels',
  onSelect: () => { editOpen.value = true }
}], [{
  label: 'İşlem Adımını Sil',
  icon: 'material-symbols-light:delete-outline-rounded',
  onSelect: () => { removeProcess.value = true }
}]])

const timmer = ref(0)
const timerColor = computed(() => {
  if (timmer.value <= station.getStation.nominalThreshold) return 'success'
  if (timmer.value < station.getStation.criticalThreshold) return 'warning'
  return 'error'
})

let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  intervalId = setInterval(() => { timmer.value++ }, 1000)
  if (!deviceStore.getDevices.length) {
    await deviceStore.getDeviceList()
  }
})

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
})

async function persistData(partial: Record<string, unknown>) {
  await saveData({ ...stepData.value, ...partial } as any)
}

async function onRemoveProcess() {
  try {
    await processStore.removeProcess(props.process.id)
    emits('close')
  } catch (error: any) {
    if (error?.isOffline) {
      useToast().add({ title: 'Çevrimdışı', description: 'Silme işlemi sıraya alındı.', color: 'warning' })
      emits('close')
    }
  }
}

async function onBarcodeListSave(data: IBarcodeStepData | IScrewStepData) {
  await saveData(data)
}

async function onImageSave(imageRefs: IProcessImageRef[]) {
  await persistData({ imageRefs })
}

async function onSettingsSave(settings: IProcessSettings) {
  await persistData({ settings })
}

async function onScrewSettingsUpdate(field: 'programNumber' | 'deviceId', value: number | undefined) {
  if (!isScrewStepData(stepData.value)) return
  await persistData({ [field]: value })
}

const supportsBarcodeList = computed(() =>
  props.process.processType === 'barcode' || props.process.processType === 'screw'
)

const barcodePreviewItems = computed(() => {
  if (!hasBarcodeList(stepData.value)) return []
  return stepData.value.barcodes.map((b, i) => ({ label: b.name, value: i }))
})

function onBarcodeTestPreviewChange(payload: { barcode: IBarcodeItem | null, showNotFound: boolean, active: boolean }) {
  barcodeTestActive.value = payload.active
  testPreviewBarcode.value = payload.barcode
  testShowNotFound.value = payload.showNotFound
}

const effectivePreviewBarcodeIndex = computed(() => manualPreviewIndex.value)

const effectivePreviewBarcode = computed(() =>
  barcodeTestActive.value ? testPreviewBarcode.value : null
)

const effectiveShowNotFound = computed(() =>
  barcodeTestActive.value ? testShowNotFound.value : manualShowNotFound.value
)
</script>

<template>
  <UDashboardPanel id="inbox-2" class="flex min-h-0 flex-col">
    <UDashboardNavbar
      :title="`${process.name} - ${process.pasif ? 'Pasif (İstasyonda gösterilmeyecek)' : 'Aktif'}`"
      :toggle="false"
    >
      <template #leading>
        <UButton icon="i-lucide-x" color="neutral" variant="ghost" class="-ms-1.5" @click="emits('close')" />
      </template>

      <template #right>
        <div v-if="supportsBarcodeList" class="flex items-center gap-0.5">
          <UTooltip text="Barkod Listesi">
            <UButton icon="i-lucide-barcode" color="neutral" variant="ghost" @click="barcodeListOpen = true" />
          </UTooltip>
          <UTooltip text="Barkod Test">
            <UButton icon="i-lucide-scan-barcode" color="neutral" variant="ghost" @click="barcodeTestOpen = true" />
          </UTooltip>
        </div>

        <UTooltip text="Resim Yönetimi">
          <UButton icon="i-lucide-image" color="neutral" variant="ghost" @click="imageManagerOpen = true" />
        </UTooltip>

        <UTooltip text="Ayarlar">
          <UButton icon="i-lucide-settings" color="neutral" variant="ghost" @click="settingsOpen = true" />
        </UTooltip>

        <UDropdownMenu :items="dropdownItems">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </template>
    </UDashboardNavbar>

    <div class="flex flex-col sm:flex-row justify-between gap-1 p-4 sm:px-6 border-b border-default">
      <div class="flex items-start gap-4 sm:my-1.5">
        <div class="min-w-0">
          <p class="font-semibold text-highlighted">{{ process.name }}</p>
          <p class="text-muted">{{ processTypeLabel(process.processType) }}</p>
        </div>
      </div>
      <div class="text-right">
        <p>{{ timmer }} sn</p>
        <UBadge v-if="saving" label="Kaydediliyor..." color="warning" variant="subtle" class="mt-1" />
        <p v-else class="font-semibold text-2xl text-green-400">OK</p>
      </div>
    </div>

    <UProgress v-model="timmer" size="sm" :max="station.getStation.tagTime" :color="timerColor" />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div v-if="supportsBarcodeList && hasBarcodeList(stepData) && !barcodeTestActive" class="flex flex-wrap items-center gap-2 px-4 pt-3 sm:px-6">
        <USelect
          v-if="barcodePreviewItems.length"
          v-model="manualPreviewIndex"
          :items="barcodePreviewItems"
          placeholder="Önizleme barkodu"
          class="max-w-xs"
        />
        <UButton
          :label="manualShowNotFound ? 'Normal Görünüm' : 'Malzeme Bulunamadı Önizle'"
          variant="soft"
          size="sm"
          @click="manualShowNotFound = !manualShowNotFound"
        />
      </div>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
      <ProcessPreviewsBarcodePreview
        v-if="process.processType === 'barcode' && isBarcodeStepData(stepData)"
        :data="stepData"
        :preview-barcode-index="effectivePreviewBarcodeIndex"
        :preview-barcode="effectivePreviewBarcode"
        :show-not-found="effectiveShowNotFound"
        @update:title="persistData({ title: $event })"
        @update:description="persistData({ description: $event })"
        @update:scanned-label="persistData({ scannedLabel: $event })"
      />

      <ProcessPreviewsScrewPreview
        v-else-if="process.processType === 'screw' && isScrewStepData(stepData)"
        :data="stepData"
        :preview-barcode-index="effectivePreviewBarcodeIndex"
        :preview-barcode="effectivePreviewBarcode"
        :show-not-found="effectiveShowNotFound"
        @update:title="persistData({ title: $event })"
        @update:screws="persistData({ screws: $event })"
        @update:description="persistData({ description: $event })"
        @update:scanned-label="persistData({ scannedLabel: $event })"
        @update:screw-points="persistData({ screwPoints: $event })"
      />

      <ProcessPreviewsGeneralPreview
        v-else-if="process.processType === 'general' && isGeneralStepData(stepData)"
        :data="stepData"
        @update:cta-title="persistData({ ctaTitle: $event })"
        @update:cta-description="persistData({ ctaDescription: $event })"
        @update:duration="persistData({ duration: $event })"
      />

      <ProcessPreviewsServerPreview
        v-else-if="process.processType === 'server' && isServerStepData(stepData)"
        :data="stepData"
        @update:title="persistData({ title: $event })"
        @update:description="persistData({ description: $event })"
        @update:endpoint="persistData({ endpoint: $event })"
        @update:method="persistData({ method: $event })"
        @update:payload="persistData({ payload: $event })"
      />
      
      </div>
    </div>
  </UDashboardPanel>

  <ProcessEdit v-model:open="editOpen" :process="process" />

  <ProcessBarcodeListSlideover
    v-if="hasBarcodeList(stepData)"
    v-model:open="barcodeListOpen"
    :step-data="stepData"
    @save="onBarcodeListSave"
  />

  <ProcessBarcodeTestSlideover
    v-if="hasBarcodeList(stepData)"
    v-model:open="barcodeTestOpen"
    :step-data="stepData"
    @preview-change="onBarcodeTestPreviewChange"
  />

  <ProcessImageManagerSlideover
    v-model:open="imageManagerOpen"
    :step-data="stepData"
    :process-id="process.id"
    :barcodes="hasBarcodeList(stepData) ? stepData.barcodes : undefined"
    @save="onImageSave"
  />

  <ProcessSettingsSlideover
    v-model:open="settingsOpen"
    :step-data="stepData"
    :process-type="process.processType"
    @save="onSettingsSave"
  >
    <template v-if="process.processType === 'screw' && isScrewStepData(stepData)" #screw-settings>
      <UFormField label="Program Numarası" description="Sıkıcının çalışacağı program numarası">
        <UInput
          :model-value="stepData.programNumber"
          type="number"
          class="w-full"
          @update:model-value="onScrewSettingsUpdate('programNumber', Number($event))"
        />
      </UFormField>
      <UFormField label="Sıkıcı Cihazı" description="Kullanılacak sıkıcı cihazını seçin">
        <USelect
          :model-value="stepData.deviceId"
          :items="[{ label: 'Seçilmedi', value: undefined }, ...screwDevices]"
          class="w-full"
          @update:model-value="onScrewSettingsUpdate('deviceId', $event as number | undefined)"
        />
      </UFormField>
    </template>
  </ProcessSettingsSlideover>

  <UModal v-model:open="removeProcess" title="Uyarı" description="Bu işlem adımını silmek istediğinizden emin misiniz?">
    <template #body>
      <div class="space-y-4">
        <p>Silinen işlem adımları istasyonda görüntülenemez ve geri alınamaz. Yine de silmek istediğinize emin misiniz?</p>
        <div class="flex justify-end">
          <UButton label="İşlem Adımını Sil" color="error" @click="onRemoveProcess" loading-auto />
        </div>
      </div>
    </template>
  </UModal>
</template>
