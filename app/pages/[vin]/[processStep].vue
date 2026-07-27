<template>
  <UDashboardPanel>
    <UDashboardNavbar class="bg-default/50">
      <template #title>
        <p class="font-semibold text-highlighted" v-if="process">{{ process.name }}</p>
      </template>
      <template #right>
        <div class="flex items-center gap-x-4">
          <div class="text-right">
            <p class="font-semibold text-2xl" :class="timerColor">{{ timmer }} sn</p>
          </div>
          <UButton icon="material-symbols:cancel" label="İşlemi Sonlandır" variant="ghost" color="neutral"
            @click="endWork" />
          <UButton icon="material-symbols:database" label="PLC Data" variant="ghost" color="neutral"
            @click="() => { isPlcSliderOpen = true }" />
        </div>
      </template>
    </UDashboardNavbar>
    <UProgress v-model="timmer" size="sm" :max="station.getStation.tagTime" />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5" v-if="process">

      <ProcessPreviewsBarcodePreview v-if="process.processType === 'barcode' && isBarcodeStepData(stepData)"
        :key="process.id" readonly
        :data="stepData" :preview-barcode="matchedBarcode" :show-not-found="showNotFound"
        :matched-barcode="matchedVinBarcode"
        @complate-process="advanceToNextProcess" />

      <ProcessPreviewsGeneralPreview v-else-if="process.processType === 'general' && isGeneralStepData(stepData)"
        :key="process.id" readonly :data="stepData" @complate-process="advanceToNextProcess" />

      <ProcessPreviewsScrewPreview v-else-if="process.processType === 'screw' && isScrewStepData(stepData)"
        :key="process.id" readonly
        :data="stepData" :preview-barcode="matchedBarcode" :show-not-found="showNotFound"
        @complate-process="advanceToNextProcess" />


    </div>

    <USlideover v-model:open="isPlcSliderOpen" side="right">
      <template #body>
        <div class="p-4">
          <h3 class="text-lg font-semibold mb-4">PLC Verileri</h3>

          <div class="mb-6">
            <h4 class="text-sm font-medium text-gray-500 mb-2">PLC'ye Yazılan Değerler</h4>
            <div class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 min-h-[100px]">
              <pre class="text-xs overflow-auto">{{ writtenPlcValues }}</pre>
            </div>
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
  </UDashboardPanel>

</template>

<script lang="ts" setup>
import { useProcessStore } from '~/store/Process';
import { useStationStore } from '~/store/Station';
import type { IBarcodeItem, IProcess } from '~/types/process';
import {
  getProcessStepData,
  hasBarcodeList,
  isBarcodeStepData,
  isGeneralStepData,
  isScrewStepData,
  isServerStepData,
  processTypeLabel,
  findBarcodeIndexByScan
} from '~/utils/processData'

const route = useRoute()
const processStore = useProcessStore()
const station = useStationStore()
const app = useAppConfig()

const { updateProcessReport } = useReportService()
const { plcData, writeValue: originalWriteValue, writeMultiple: originalWriteMultiple } = usePLC()

const writeValue = async (variableName: string, value: any) => {
  writtenPlcValues.value[variableName] = value
  return originalWriteValue(variableName, value)
}

const writeMultiple = async (dataObject: any) => {
  Object.assign(writtenPlcValues.value, dataObject)
  return originalWriteMultiple(dataObject)
}

const timmer = ref(0)
const isPlcSliderOpen = ref(false)
const writtenPlcValues = ref<any>({})

// Timer'ı localStorage'dan yükle veya sıfırdan başlat
onMounted(() => {
  const savedTimer = localStorage.getItem(`process-timer-${route.params.vin}`)
  if (savedTimer) {
    timmer.value = parseInt(savedTimer, 10)
  }
})

// Timer'ı localStorage'a kaydet
watch(timmer, (newValue) => {
  localStorage.setItem(`process-timer-${route.params.vin}`, newValue.toString())
})

const vinData = computed(() => useAppCookie(`vin-data-${route.params.vin}`).value)

const timerColor = computed(() => {
  if (timmer.value <= station.getStation.nominalThreshold) {
    app.ui.colors.primary = "green"
    return 'text-success'
  }
  if (timmer.value < station.getStation.criticalThreshold) {
    app.ui.colors.primary = "orange"
    return 'text-warning'
  }
  app.ui.colors.primary = "rose"
  return 'text-error'
})

const process = computed(() => {
  const active = processStore.getProcess?.processes.find(e => e.processNumber.toString() == route.params.processStep)
  return active as IProcess
})

const stepData = computed(() => { return getProcessStepData(process.value) })

const scanInput = ref('')
const matchedBarcode = computed<IBarcodeItem | null>(() => {
  if (!hasBarcodeList(stepData.value) || !scanInput.value.trim()) return null
  const index = findBarcodeIndexByScan(stepData.value.barcodes, scanInput.value)
  if (index < 0) return null
  return stepData.value.barcodes[index] ?? null
})

const vinBarcodes = computed(() => {
  if (!vinData.value || !Array.isArray(vinData.value)) return []
  return vinData.value.map(item => String(item.barcode || item.matnr || '')).filter(Boolean)
})

const showNotFound = computed(() =>
  hasBarcodeList(stepData.value) &&
  (scanInput.value.trim().length > 0 || showVinMismatch.value) &&
  !matchedBarcode.value
)

const matchedVinBarcode = computed(() => {
  if (!hasBarcodeList(stepData.value) || !vinBarcodes.value.length) return null

  const processBarcodes = stepData.value.barcodes.map(b =>
    b.barcode.trim().toUpperCase()
  )

  const vins = vinBarcodes.value.map(v => v.trim().toUpperCase())

  for (const pb of processBarcodes) {
    const match = vins.find(vb => vb.startsWith(pb))
    if (match) {
      return match
    }
  }

  return null
})

const showVinMismatch = computed(() => {
  return matchedVinBarcode.value === null
})

const endWork = () => {
  // Timer'ı temizle
  localStorage.removeItem(`process-timer-${route.params.vin}`)
  navigateTo("/barcode")
}

async function advanceToNextProcess() {
  if (processStore.getProcess && processStore.getProcess.processes) {
    const index = processStore.getProcess.processes.findIndex(e => e.processNumber.toString() == route.params.processStep)
    if (index > -1) {
      const nextStep = processStore.getProcess.processes[index + 1]
      if (nextStep) {
        navigateTo(`/${route.params.vin}/${nextStep.processNumber}?typeCode=${route.query.typeCode}`)
      } else {
        // Tüm proses tamamlandı, timer'ı temizle
        localStorage.removeItem(`process-timer-${route.params.vin}`)
        await updateProcessReport(route.params.vin as string)
        navigateTo("/barcode")
      }
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  intervalId = setInterval(() => {
    timmer.value++
    if (timmer.value == station.getStation.tagTime) {
      if (intervalId) clearInterval(intervalId)
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
})

</script>

<style></style>