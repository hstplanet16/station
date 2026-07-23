<script setup lang="ts">
import type { IScrewPoint } from '~/types/process'
import { generateId } from '~/utils/processData'

const props = defineProps<{
  imageSrc: string
  points: IScrewPoint[]
  readonly?: boolean,
  screwData: any[]
}>()

const emit = defineEmits<{
  'update:points': [points: IScrewPoint[]]
}>()

const LONG_PRESS_MS = 450
const MOVE_THRESHOLD = 10

const containerRef = ref<HTMLElement | null>(null)
const localPoints = ref<IScrewPoint[]>([...props.points])
const selectedId = ref<string | null>(null)
const draggingId = ref<string | null>(null)
const activePointerCleanup = ref<(() => void) | null>(null)

watch(
  () => props.points,
  (points) => {
    if (!draggingId.value) {
      localPoints.value = [...points]
    }
  },
  { deep: true }
)

function emitPoints() {
  emit('update:points', [...localPoints.value])
}

function getRelativePos(clientX: number, clientY: number) {
  const container = containerRef.value
  if (!container) return { x: 0, y: 0 }

  const rect = container.getBoundingClientRect()
  return {
    x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
    y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100))
  }
}

function clearActivePointer() {
  activePointerCleanup.value?.()
  activePointerCleanup.value = null
}

function cancelEditing() {
  const hadInteraction = !!selectedId.value || !!draggingId.value || !!activePointerCleanup.value
  clearActivePointer()
  selectedId.value = null
  draggingId.value = null
  localPoints.value = [...props.points]
  return hadInteraction
}

function addPoint(x: number, y: number) {
  const newPoint: IScrewPoint = {
    id: generateId(),
    x,
    y,
    label: `${localPoints.value.length + 1}. Vida`
  }
  localPoints.value = [...localPoints.value, newPoint]
  selectedId.value = newPoint.id
  emitPoints()
}

function updatePointPosition(id: string, x: number, y: number) {
  localPoints.value = localPoints.value.map(p =>
    p.id === id ? { ...p, x, y } : p
  )
}

function removeSelectedPoint() {
  if (!selectedId.value) return
  localPoints.value = localPoints.value.filter(p => p.id !== selectedId.value)
  selectedId.value = null
  emitPoints()
}

function onContainerPointerDown(e: PointerEvent) {
  if (props.readonly) return
  if ((e.target as HTMLElement).closest('[data-screw-point]')) return

  clearActivePointer()

  const startX = e.clientX
  const startY = e.clientY
  let longPressFired = false
  let cancelled = false

  const timer = setTimeout(() => {
    if (cancelled) return
    longPressFired = true
    const pos = getRelativePos(startX, startY)
    addPoint(pos.x, pos.y)
  }, LONG_PRESS_MS)

  const onMove = (moveEvent: PointerEvent) => {
    if (Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > MOVE_THRESHOLD) {
      clearTimeout(timer)
    }
  }

  const onUp = () => {
    clearTimeout(timer)
    if (!longPressFired && !cancelled && !(e.target as HTMLElement).closest('[data-screw-point]')) {
      selectedId.value = null
    }
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (activePointerCleanup.value === cleanup) {
      activePointerCleanup.value = null
    }
  }

  const cleanup = () => {
    cancelled = true
    clearTimeout(timer)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  activePointerCleanup.value = cleanup
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function onPointPointerDown(e: PointerEvent, pointId: string) {
  if (props.readonly) return
  e.stopPropagation()
  e.preventDefault()

  clearActivePointer()

  const startX = e.clientX
  const startY = e.clientY
  const startPoints = [...localPoints.value]
  let longPressFired = false
  let isDragging = false
  let cancelled = false

  const timer = setTimeout(() => {
    if (cancelled) return
    longPressFired = true
    isDragging = true
    draggingId.value = pointId
    selectedId.value = pointId
  }, LONG_PRESS_MS)

  const onMove = (moveEvent: PointerEvent) => {
    if (cancelled) return
    if (!isDragging && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > MOVE_THRESHOLD) {
      clearTimeout(timer)
    }
    if (isDragging) {
      const pos = getRelativePos(moveEvent.clientX, moveEvent.clientY)
      updatePointPosition(pointId, pos.x, pos.y)
    }
  }

  const onUp = () => {
    clearTimeout(timer)
    if (cancelled) return
    if (!longPressFired) {
      selectedId.value = pointId
    } else if (isDragging) {
      emitPoints()
    }
    isDragging = false
    draggingId.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    if (activePointerCleanup.value === cleanup) {
      activePointerCleanup.value = null
    }
  }

  const cleanup = () => {
    cancelled = true
    clearTimeout(timer)
    localPoints.value = startPoints
    isDragging = false
    draggingId.value = null
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  activePointerCleanup.value = cleanup
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

const hasActiveInteraction = computed(() =>
  !!selectedId.value || !!draggingId.value || !!activePointerCleanup.value
)

function onKeyDown(e: KeyboardEvent) {
  if (props.readonly) return
  if (e.key === 'Escape') {
    if (cancelEditing()) {
      e.preventDefault()
    }
    return
  }

  if (e.key !== 'Delete' && e.key !== 'Backspace') return
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
  if (!selectedId.value) return

  e.preventDefault()
  removeSelectedPoint()
}

useGlobalEditCancel(cancelEditing, hasActiveInteraction)

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => {
  clearActivePointer()
  window.removeEventListener('keydown', onKeyDown)
})

const pointStats = computed(() => {
  return (index : number) => {
    const item = props.screwData.find(
      x => x.NoktaIndex - 1 === index
    )

    if (!item) {
      return 'bg-gray-600'
    }

    return item.TighteningStatus
      ? 'bg-green-400'
      : 'bg-red-500'
  }
})

</script>

<template>
  <div class="space-y-2">
    <p v-if="!readonly" class="text-sm text-muted">
      Resme basılı tutarak kırmızı nokta ekleyin. Noktaya kısa basarak seçin, basılı tutarak taşıyın. Seçili noktayı
      Delete ile silin. ESC ile iptal edin.
    </p>
    <ProcessPreviewImageFrame>
      <div ref="containerRef" class="relative h-full w-full select-none touch-none"
        :class="readonly ? '' : 'cursor-crosshair'" @pointerdown="onContainerPointerDown" @contextmenu.prevent>
        <img :src="imageSrc" class="pointer-events-none block h-full w-full object-contain" alt="Sıkım noktaları"
          draggable="false">
        <div v-for="(point, index) in localPoints" :key="point.id" data-screw-point
          class="absolute -translate-x-1/2 -translate-y-1/2 z-10" :style="{ left: `${point.x}%`, top: `${point.y}%` }">
          <div
            class="size-6 rounded-full border-2 shadow-lg flex items-center justify-center transition-transform"
            :class="[
              selectedId === point.id ? 'border-yellow-300 ring-2 ring-yellow-400 scale-125' : 'border-white',
              draggingId === point.id ? 'cursor-grabbing' : 'cursor-pointer',
              pointStats(index) 
            ]" @pointerdown="onPointPointerDown($event, point.id)">
            <span class="text-[10px] font-bold text-white">{{ index + 1 }}</span>
          </div>
        </div>
      </div>
    </ProcessPreviewImageFrame>
    <p v-if="localPoints.length" class="text-sm text-muted">
      {{ localPoints.length }} vida noktası tanımlı
      <span v-if="selectedId"> — seçili nokta: {{localPoints.findIndex(p => p.id === selectedId) + 1}}</span>
    </p>
  </div>
</template>
