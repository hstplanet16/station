<script setup lang="ts">
import { format, isToday } from 'date-fns'
import type { Mail } from '~/types'
import type { IProcess } from '~/types/process';
import { processTypeLabel } from '~/utils/processData'

const props = defineProps<{
  process: IProcess[]
}>()

const processRefs = ref<Record<number, Element | null>>({})

const selectedProcess = defineModel<IProcess | null>()

watch(selectedProcess, () => {
  if (!selectedProcess.value) {
    return
  }
  const ref = processRefs.value[selectedProcess.value.id]
  if (ref) {
    ref.scrollIntoView({ block: 'nearest' })
  }
})

defineShortcuts({
  arrowdown: () => {
    const index = props.process.findIndex((process: IProcess) => process.id === selectedProcess.value?.id)

    if (index === -1) {
      selectedProcess.value = props.process[0]
    } else if (index < props.process.length - 1) {
      selectedProcess.value = props.process[index + 1]
    }
  },
  arrowup: () => {
    const index = props.process.findIndex((process: IProcess) => process.id === selectedProcess.value?.id)

    if (index === -1) {
      selectedProcess.value = props.process[props.process.length - 1]
    } else if (index > 0) {
      selectedProcess.value = props.process[index - 1]
    }
  },
  delete: () => { 
    console.log("Delete");
    
  }
})
</script>

<template>
  <div class="overflow-y-auto divide-y divide-default">
    <div v-for="(proces, index) in process" :key="index"
      :ref="(el) => { processRefs[proces.id] = el as Element | null }">
      <div class="p-4 sm:px-6 text-sm cursor-pointer border-l-2 transition-colors" :class="[
        proces.pasif ? 'text-highlighted' : 'text-toned',
        selectedProcess && selectedProcess.id === proces.id
          ? 'border-primary bg-primary/10'
          : 'border-bg hover:border-primary hover:bg-primary/5'
      ]" @click="selectedProcess = proces">
        <div class="flex items-center justify-between" :class="[proces.pasif && 'font-semibold']">
          <div class="flex items-center gap-3">
            {{ proces.name }}
            <UChip v-if="proces.pasif" />
          </div>

          <span>{{ proces.processNumber }}</span>
        </div>
        <p class="truncate text-muted" :class="[proces.pasif && 'font-semibold']">
          {{ processTypeLabel(proces.processType) }}
        </p>

      </div>
    </div>
  </div>
</template>
