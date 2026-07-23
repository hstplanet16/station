<script setup lang="ts">
import { breakpointsTailwind } from '@vueuse/core'
import { useProcessStore } from '~/store/Process'
import type { IProcess } from '~/types/process'

definePageMeta({ layout: 'fullscreen-barcode' })

const route = useRoute()
const productVin = computed(() => String(route.params.vin ?? '').trim())
const processStore = useProcessStore()
const loading = ref(true)
const loadError = ref<string | null>(null)

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')
const mobilePanelOpen = ref(false)

const open = ref(false)

const selectedProcess = ref<IProcess | null>(null)

function selectProcess(process: IProcess) {
  selectedProcess.value = process
  navigateTo(`/${route.params.vin}/${process.processNumber}?typeCode=${route.query.typeCode}`)
  if (isMobile.value) {
    mobilePanelOpen.value = true
  }
}

const urlTypeCode = computed(() => String(route.query.typeCode ?? '').trim())

const activeProcesses = computed(() => {
  if (!processStore.getProcess?.processes) return []
  return processStore.getProcess.processes
    .filter((process: any) => !process.pasif)
    .sort((a, b) => a.processNumber - b.processNumber)
})

const resolvedTypeCode = computed(() => {
  if (urlTypeCode.value) return urlTypeCode.value
  const route = useRoute()
  if (!route.params.vin) return urlTypeCode.value
  return resolveTypeCodeFromVin(route.params.vin as string, processStore.getTypes)
})

const resolvedType = computed(() =>
  processStore.getTypes.find(type => type.typeCode === resolvedTypeCode.value) ?? null
)

const activeProcessNumber = computed({
  get: () => String(route.params.processStep ?? ''),
  set: (value: string) => {
    const router = useRouter()
    router.replace({
      params: {
        ...route.params,
        processStep: value
      }
    })
  }
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
    useToast().add({ title: 'Hata', description: loadError.value, color: 'error' })
  } finally {
    loading.value = false
  }
}

onMounted(async () => { await loadRuntimeProcess() })

</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-default/50 backdrop-blur-md"
      :ui="{ footer: 'lg:border-t lg:border-default', body: 'sm:p-0 gap-0' }">
      <template #header="{ collapsed }">
        <div class="flex items-center justify-between w-full">
          <p v-if="!collapsed">{{ productVin }}</p>
          <ConnectionStatus v-if="!collapsed" />
        </div>
      </template>

      <template #default="{ collapsed }">

        <button v-for="process in activeProcesses" :key="process.id" type="button"
          class="w-full px-4 py-3 text-left transition-colors" :class="activeProcessNumber === String(process.processNumber)
            ? 'border-l border-b-0 border-primary bg-primary/10'
            : 'border-l border-transparent hover:bg-primary/5'" @click="selectProcess(process)">
          <div class="flex items-center justify-between gap-2">
            <span class="font-medium text-highlighted">{{ process.name }}</span>
            <span class="text-sm text-muted">{{ process.processNumber }}</span>
          </div>

          <p class="truncate text-sm text-muted">
            {{ processTypeLabel(process.processType) }}
          </p>
        </button>

      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <NuxtPage />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
