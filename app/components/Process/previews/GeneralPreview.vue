<script setup lang="ts">
import type { IGeneralStepData } from '~/types/process'
import { processPreviewCtaUi, processPreviewImageColumnClass, processPreviewImageGridHeight, processPreviewPlaceholderImageClass } from '~/utils/processPreviewLayout'
import { useProcessImages } from '~/composables/useProcessImages'

const props = defineProps<{
  data: IGeneralStepData
  readonly?: boolean
}>()

const emit = defineEmits<{
  'update:ctaTitle': [value: string]
  'update:ctaDescription': [value: string]
  'update:duration': [value: number]
  'complateProcess': [value: boolean]
}>()

const { getImage } = useProcessImages()
const { createReport, updateReport } = useReportService()

const remainingSeconds = ref(props.data.duration)

const displayImages = ref<string[]>([])

async function loadDisplayImages() {
  const images = await Promise.all(
    props.data.imageRefs.map(ref => getImage(ref.id))
  )
  displayImages.value = images.filter(Boolean) as string[]
}

let intervalId: ReturnType<typeof setInterval> | null = null


onMounted(async () => {
  await createReport()
  await loadDisplayImages()

  remainingSeconds.value = props.data.duration

  intervalId = setInterval(async () => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    }

    if (remainingSeconds.value === 0) {
      console.log("Çalışıyor....");
      
      if (intervalId) clearInterval(intervalId)
      await updateReport({
        result: "OK",
        timingData: props.data.duration
      })
      emit('complateProcess', true)
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId) clearInterval(intervalId)
})

watch(() => props.data, (val) => {
  remainingSeconds.value = val.duration
})
</script>

<template>
  <ProcessPreviewShell>
    <UPageCTA orientation="horizontal" variant="naked" class="h-full w-full" :ui="processPreviewCtaUi">
      <template #title>
        <ProcessEditableField :model-value="data.ctaTitle" tag="h1" class="text-4xl font-semibold" :readonly="readonly"
          @update:model-value="emit('update:ctaTitle', $event)" />
      </template>
      <template #description>
        <ProcessEditableField :model-value="data.ctaDescription" multiline placeholder="Sayfa açıklaması..."
          :readonly="readonly" @update:model-value="emit('update:ctaDescription', $event)" />
        <div class="mt-4 flex items-center gap-2">
          <UIcon name="i-lucide-timer" class="size-5 text-primary" />
          <span class="text-lg font-semibold">{{ remainingSeconds }} sn kaldı</span>
          <UButton v-if="!readonly" icon="i-lucide-refresh-cw" variant="ghost" size="xs"
            @click="() => { remainingSeconds = data.duration }" />
        </div>
        <UFormField v-if="!readonly" label="Süre (sn)" class="mt-4 max-w-xs">
          <UInput :model-value="data.duration" type="number"
            @update:model-value="emit('update:duration', Number($event))" />
        </UFormField>
      </template>
      <div :class="processPreviewImageColumnClass">
        <ProcessPreviewImageFrame v-if="displayImages.length">
          <UImagesGrid :images="displayImages" :height="processPreviewImageGridHeight" />
        </ProcessPreviewImageFrame>
        <ProcessPreviewImageFrame v-else>
          <img src="https://picsum.photos/640/728" alt="Örnek görsel"
            :class="[processPreviewPlaceholderImageClass, 'opacity-40']" loading="lazy">
        </ProcessPreviewImageFrame>
      </div>
    </UPageCTA>
  </ProcessPreviewShell>
</template>
