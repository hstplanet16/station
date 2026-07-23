<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { breakpointsTailwind } from '@vueuse/core'
import type { ButtonProps } from '@nuxt/ui'
import { useProcessStore } from '~/store/Process'
import type { IProcess } from '~/types/process'
import TransferModal from '~/components/Process/TransferModal.vue'

const tabItems = [{
  label: 'Tümü',
  value: 'all'
}, {
  label: 'Pasif',
  value: 'unread'
}]

const addNewProcess = ref(false)
const showTransferModal = ref(false)
const selectedTab = ref('all')
const processStore = useProcessStore()
const route = useRoute()

const currentTypeCode = computed(() => {
  const hint = route.params.type as string
  return processStore.resolveType(hint)?.typeCode ?? hint
})

const currentType = computed(() => processStore.resolveType(route.params.type as string))

const isCurrentTypeLoaded = computed(() => processStore.activeTypeCode === currentTypeCode.value)

const isEmptyProcess = computed(() => {
  if (!isCurrentTypeLoaded.value) return true
  return !processStore.getProcess
})

const process = computed(() => {
  if (!isCurrentTypeLoaded.value || !processStore.getProcess) {
    return []
  }
  return processStore.getProcess.processes ?? []
})

const filteredProcess = computed(() => {
  if (selectedTab.value === 'unread') {
    return process.value.filter((item: any) => !!item.pasif)
  }

  return process.value
})

const selectedProcess = ref<IProcess | null>()

const isProcessPanelOpen = computed({
  get() {
    return !!selectedProcess.value
  },
  set(value: boolean) {
    if (!value) {
      selectedProcess.value = null
    }
  }
})

watch(filteredProcess, () => {
  if (!filteredProcess.value.find((item: any) => item.id === selectedProcess.value?.id)) {
    selectedProcess.value = null
  }
})

watch(() => processStore.getProcess, (stationProcess) => {
  if (!isCurrentTypeLoaded.value || !stationProcess?.processes) return

  if (selectedProcess.value) {
    const updated = stationProcess.processes.find(p => p.id === selectedProcess.value!.id)
    if (updated) selectedProcess.value = updated
  }
}, { deep: true })

const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('lg')

const links = ref<ButtonProps[]>([
  {
    label: 'İşlem Adımı Oluştur',
    color: 'primary',
    onClick: () => {
      addNewProcess.value = true
    }
  },
  {
    label: 'Verileri Transfer Et',
    color: 'neutral',
    variant: 'outline',
    onClick: () => {
      showTransferModal.value = true
    }
  }
])

async function loadProcessForCurrentRoute() {
  const typeHint = route.params.type as string
  if (!typeHint) return

  if (!processStore.getTypes.length) {
    await processStore.findTypes()
  }

  const resolvedType = processStore.resolveType(typeHint)
  if (resolvedType?.typeCode && resolvedType.typeCode !== typeHint) {
    await navigateTo(`/process/${resolvedType.typeCode}`, { replace: true })
    return
  }

  selectedProcess.value = null
  await processStore.findProcess(typeHint)
}

watch(() => route.params.type, async (newType) => {
  if (!newType) return
  await loadProcessForCurrentRoute()
}, { immediate: true })

onMounted(() => {
  
})

</script>

<template>
  <div v-if="processStore.isLoading" class="flex-1 flex items-center justify-center h-full w-full">
    <UIcon name="i-lucide-loader-2" class="animate-spin size-12 text-primary" />
  </div>
  <template v-else>
    <UDashboardPanel id="inbox-1" :default-size="25" :min-size="20" :max-size="30" resizable v-if="!isEmptyProcess">
      <UDashboardNavbar :title="`${currentType?.name ?? currentTypeCode} Adımları`">
      <template #leading>
        <UDashboardSidebarCollapse />
      </template>
      <template #trailing>
        <UBadge :label="filteredProcess.length" variant="subtle" />
      </template>

      <template #right>
        <UTabs v-model="selectedTab" :items="tabItems" :content="false" size="xs" />
      </template>
    </UDashboardNavbar>
    <InboxList v-model="selectedProcess" :process="filteredProcess" />
  </UDashboardPanel>

  <InboxMail v-if="selectedProcess" :process="selectedProcess" @close="selectedProcess = null" />

  <div v-else class="hidden lg:flex flex-1 items-center justify-center">
    <UPageCTA title="Yeni İşlem Adımı"
      :description="`Yeni bir ${currentType?.name ?? currentTypeCode} adımı oluşturun.`"
      :links="links" variant="naked" />
  </div>

  <ClientOnly>
    <USlideover v-if="isMobile" v-model:open="isProcessPanelOpen">
      <template #content>
        <InboxMail v-if="selectedProcess" :process="selectedProcess" @close="selectedProcess = null" />
      </template>
    </USlideover>
  </ClientOnly>
  </template>

  <ProcessCreate
    v-model:open="addNewProcess"
    :type-code="currentTypeCode"
  />

  <TransferModal v-model:open="showTransferModal" />
</template>
