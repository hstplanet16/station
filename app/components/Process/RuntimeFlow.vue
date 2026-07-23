<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import { useProcessStore } from '~/store/Process'
import type { IProcess } from '~/types/process'
import { processTypeLabel } from '~/utils/processData'
import { resolveTypeCodeFromVin } from '~/utils/productVin'

const props = defineProps<{
  productVin: string
  vinData?: any[]
}>()

const processStore = useProcessStore()
const toast = useToast()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const loading = ref(true)
const loadError = ref<string | null>(null)
const selectedProcess = ref<IProcess | null>(null)
const mobilePanelOpen = ref(false)

const route = useRoute()
const urlTypeCode = computed(() => String(route.query.typeCode ?? '').trim())

const resolvedTypeCode = computed(() => {
  if (urlTypeCode.value) return urlTypeCode.value
  return resolveTypeCodeFromVin(props.productVin, processStore.getTypes)
})

const resolvedType = computed(() =>
  processStore.getTypes.find(type => type.typeCode === resolvedTypeCode.value) ?? null
)

const activeProcesses = computed(() => {
  if (!processStore.getProcess?.processes) return []
  return processStore.getProcess.processes
    .filter((process : any) => !process.pasif)
    .sort((a, b) => a.processNumber - b.processNumber)
})

async function loadRuntimeProcess() {
  loading.value = true
  loadError.value = null

  try {
    if (!processStore.getTypes.length) {
      await processStore.findTypes()
    }

    const typeCode = resolvedTypeCode.value
    if (!typeCode) {
      loadError.value = 'Ürün VIN bilgisinden işlem tipi (AA/BB) çözümlenemedi.'
      return
    }

    await processStore.findProcess(typeCode)

    if (!activeProcesses.value.length) {
      loadError.value = `${resolvedType.value?.name ?? typeCode} için aktif işlem adımı bulunamadı.`
      return
    }

    selectedProcess.value = activeProcesses.value[0] ?? null
  } catch (error: any) {
    loadError.value = String(error?.message ?? error)
    toast.add({ title: 'Hata', description: loadError.value, color: 'error' })
  } finally {
    loading.value = false
  }
}

function selectProcess(process: IProcess) {
  selectedProcess.value = process
  const route = useRoute()
  navigateTo(`${route.path}/100?typeCode=${route.query.typeCode}`)
  if (isMobile.value) {
    mobilePanelOpen.value = true
  }
}

function advanceToNextProcess() {
  const currentIndex = activeProcesses.value.findIndex(p => p.id === selectedProcess.value?.id)
  if (currentIndex < 0 || currentIndex >= activeProcesses.value.length - 1) {
    selectedProcess.value = activeProcesses.value[0] ?? null
  } else {
    selectedProcess.value = activeProcesses.value[currentIndex + 1] ?? null
  }
}

watch(() => props.productVin, loadRuntimeProcess, { immediate: true })

watch(activeProcesses, (processes) => {
  if (!processes.length) {
    selectedProcess.value = null
    return
  }

  if (!selectedProcess.value || !processes.some(process => process.id === selectedProcess.value!.id)) {
    selectedProcess.value = processes[0] ?? null
  }
})
</script>

<template>
  <div class="flex h-full flex-1 flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-sm text-muted">Ürün VIN</p>
        <p class="text-xl font-semibold text-highlighted" v-if="resolvedType">{{ productVin }} - {{ resolvedType.name }} ({{ resolvedType.typeCode }})</p>
      </div>
      <UButton
        label="Yeni VIN Okut"
        icon="i-lucide-arrow-left"
        variant="soft"
        to="/barcode"
      />
    </div>

    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <UIcon name="i-lucide-loader-2" class="size-10 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="loadError"
      color="error"
      variant="subtle"
      icon="i-lucide-alert-circle"
      title="İşlem yüklenemedi"
      :description="loadError"
    />

    <div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row lg:gap-4">
      <div class="w-full shrink-0 overflow-hidden rounded-lg border border-default lg:w-72 xl:w-80 bg-default/30 backdrop-blur-md">
        <div class="max-h-48 overflow-y-auto divide-y divide-default lg:max-h-none ">
          <button
            v-for="process in activeProcesses"
            :key="process.id"
            type="button"
            class="w-full px-4 py-3 text-left transition-colors"
            :class="selectedProcess?.id === process.id
              ? 'border-l border-b-0 border-primary bg-primary/10'
              : 'border-l border-transparent hover:bg-primary/5'"
            @click="selectProcess(process)"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="font-medium text-highlighted">{{ process.name }}</span>
              <span class="text-sm text-muted">{{ process.processNumber }}</span>
            </div>
            <p class="truncate text-sm text-muted">{{ processTypeLabel(process.processType) }}</p>
          </button>
        </div>
      </div>

      <NuxtPage />
    </div>

    <ClientOnly>
      <USlideover v-if="isMobile" v-model:open="mobilePanelOpen">
        <template #content>
          <ProcessRuntimePanel
            v-if="selectedProcess"
            class="h-full"
            :process="selectedProcess"
            :product-vin="productVin"
            :vin-data="props.vinData"
            @advance="advanceToNextProcess"
          />
        </template>
      </USlideover>
    </ClientOnly>
  </div>
</template>
