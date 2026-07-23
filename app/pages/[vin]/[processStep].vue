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
        </div>
      </template>
    </UDashboardNavbar>
    <UProgress v-model="timmer" size="sm" :max="station.getStation.tagTime" />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5" v-if="process">

      <ProcessPreviewsBarcodePreview v-if="process.processType === 'barcode' && isBarcodeStepData(stepData)" readonly
        :data="stepData" :preview-barcode="matchedBarcode" :show-not-found="showNotFound"
        :remaining-seconds="remainingSeconds" :matched-barcode="matchedVinBarcode"
        @complate-process="advanceToNextProcess" />

      <ProcessPreviewsGeneralPreview v-else-if="process.processType === 'general' && isGeneralStepData(stepData)"
        readonly :data="stepData" @complate-process="advanceToNextProcess" />

      <ProcessPreviewsScrewPreview v-else-if="process.processType === 'screw' && isScrewStepData(stepData)" readonly
        :data="stepData" :preview-barcode="matchedBarcode" :show-not-found="showNotFound"
        :remaining-seconds="remainingSeconds"  @complate-process="advanceToNextProcess" />


    </div>
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

const timmer = ref(0)
const remainingSeconds = ref(0)

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
        await updateProcessReport(route.params.vin as string)
        navigateTo("/barcode")
      }
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null
let advanceTimeoutId: ReturnType<typeof setTimeout> | null = null
let hasTriggeredAdvance = false
let countdownIntervalId: ReturnType<typeof setInterval> | null = null

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
  if (advanceTimeoutId) clearTimeout(advanceTimeoutId)
  if (countdownIntervalId) clearInterval(countdownIntervalId)
})

</script>

<style></style>