<script setup lang="ts">
import { useStationStore } from '~/store/Station'
import type { IProcess, IBarcodeItem } from '~/types/process'
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

const props = defineProps<{
  process: IProcess
  productVin: string
  vinData?: any[]
}>()

const emit = defineEmits<{
  advance: []
}>()

const station = useStationStore()
const stepData = computed(() => getProcessStepData(props.process))

const scanInput = ref('')
const matchedBarcode = computed<IBarcodeItem | null>(() => {
  if (!hasBarcodeList(stepData.value) || !scanInput.value.trim()) return null
  const index = findBarcodeIndexByScan(stepData.value.barcodes, scanInput.value)
  if (index < 0) return null
  return stepData.value.barcodes[index] ?? null
})

const vinBarcodes = computed(() => {
  if (!props.vinData || !Array.isArray(props.vinData)) return []
  return props.vinData.map(item => String(item.barcode || item.matnr || '')).filter(Boolean)
})

const showNotFound = computed(() =>
  hasBarcodeList(stepData.value) &&
  (scanInput.value.trim().length > 0 || showVinMismatch.value) &&
  !matchedBarcode.value
)

const showVinMismatch = computed(() => {
  if (!hasBarcodeList(stepData.value) || !vinBarcodes.value.length) return false
  const processBarcodes = stepData.value.barcodes.map(b => b.barcode)
  return !processBarcodes.some(pb => vinBarcodes.value.includes(pb))
})

const materialNotFoundAction = computed(() => stepData.value.settings?.materialNotFoundAction ?? 'wait')
const materialNotFoundDelay = computed(() => stepData.value.settings?.materialNotFoundDelay ?? 10)

const timmer = ref(0)
const remainingSeconds = ref(0)
const timerColor = computed(() => {
  if (timmer.value <= station.getStation.nominalThreshold) return 'success'
  if (timmer.value < station.getStation.criticalThreshold) return 'warning'
  return 'error'
})

let intervalId: ReturnType<typeof setInterval> | null = null
let advanceTimeoutId: ReturnType<typeof setTimeout> | null = null
let hasTriggeredAdvance = false
let countdownIntervalId: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  intervalId = setInterval(() => { timmer.value++ }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
  if (advanceTimeoutId) clearTimeout(advanceTimeoutId)
  if (countdownIntervalId) clearInterval(countdownIntervalId)
})

watch(showNotFound, (isNotFound) => {
  if (!isNotFound) {
    hasTriggeredAdvance = false
    if (advanceTimeoutId) {
      clearTimeout(advanceTimeoutId)
      advanceTimeoutId = null
    }
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId)
      countdownIntervalId = null
    }
    remainingSeconds.value = 0
    return
  }

  if (isNotFound && materialNotFoundAction.value !== 'wait' && !hasTriggeredAdvance && !advanceTimeoutId) {
    const delay = materialNotFoundAction.value === 'showAndAdvance' ? materialNotFoundDelay.value : 0

    remainingSeconds.value = delay
    if (delay > 0) {
      countdownIntervalId = setInterval(() => {
        remainingSeconds.value--
        if (remainingSeconds.value <= 0) {
          if (countdownIntervalId) {
            clearInterval(countdownIntervalId)
            countdownIntervalId = null
          }
        }
      }, 1000)
    }

    advanceTimeoutId = setTimeout(() => {
      hasTriggeredAdvance = true
      if (countdownIntervalId) {
        clearInterval(countdownIntervalId)
        countdownIntervalId = null
      }
      try {
        emit('advance')
      } catch (error) {
        console.error('Emit failed:', error)
      }
    }, delay * 1000)
  }
})

watch(() => props.process.id, () => {
  scanInput.value = ''
  timmer.value = 0
  hasTriggeredAdvance = false
  // Timeout'u temizlemiyoruz, çünkü zaten tetiklenmek üzere
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-default bg-default/50">
    <div class="flex flex-col gap-2 border-b border-default p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div class="min-w-0">
        <p class="font-semibold text-highlighted">{{ process.name }}</p>
      </div>
      <div class="text-right">
        <p>{{ timmer }} sn</p>
        <p class="font-semibold text-2xl text-warning">İşlem Bekleniyor</p>
      </div>
    </div>

    <UProgress v-model="timmer" size="sm" :max="station.getStation.tagTime" :color="timerColor" />

    <div class="flex min-h-0 flex-1 flex-col overflow-hidden p-4 sm:p-5">
      <ProcessPreviewsBarcodePreview
        v-if="process.processType === 'barcode' && isBarcodeStepData(stepData)"
        readonly
        :data="stepData"
        :preview-barcode="matchedBarcode"
        :show-not-found="showNotFound"
        :remaining-seconds="remainingSeconds"
      />

      <ProcessPreviewsScrewPreview
        v-else-if="process.processType === 'screw' && isScrewStepData(stepData)"
        readonly
        :data="stepData"
        :preview-barcode="matchedBarcode"
        :show-not-found="showNotFound"
        :remaining-seconds="remainingSeconds"
      />

      <ProcessPreviewsGeneralPreview
        v-else-if="process.processType === 'general' && isGeneralStepData(stepData)"
        readonly
        :data="stepData"
        @complate-process="emit('advance')"
      />

      <ProcessPreviewsServerPreview
        v-else-if="process.processType === 'server' && isServerStepData(stepData)"
        readonly
        :data="stepData"
      />
    </div>
  </div>
</template>
