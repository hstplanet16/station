<template>
  <div
    class="grid h-full w-full gap-1 overflow-hidden rounded-xl"
    :class="isSingle ? '' : gridClass"
    :style="height ? { height } : undefined"
  >
  <template v-for="(image, index) in visibleImages" :key="index">
    <div
      class="relative overflow-hidden"
      :class="isSingle ? 'flex items-center justify-center' : itemClass(index)"
    >
      <img
        :src="image"
        class="transition-all duration-300"
        :class="[
          isSingle
            ? 'h-full w-full object-contain'
            : 'h-full w-full object-cover',

          visible >= 0 && index !== visible ? 'blur-md' : ''
        ]"
      />

      <div
        v-if="visible >= 0 && index !== visible"
        class="absolute inset-0 flex items-center justify-center"
      >
        <Icon name="material-symbols:lock-open-circle" class="text-5xl" />
      </div>
    </div>
  </template>
</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  images: string[]
  height?: string
  visible?: number
}>(), {
  height: undefined,
  visible: -1
})

const isSingle = computed(() => props.images.length === 1)
const visibleImages = computed(() => props.images.slice(0, 5))

const gridClass = computed(() => {
  switch (props.images.length) {
    case 1:
      return 'grid-cols-1'
    case 2:
      return 'grid-cols-2'
    case 3:
      return 'grid-cols-2 grid-rows-2'
    case 4:
      return 'grid-cols-2 grid-rows-2'
    default:
      return 'grid-cols-2 grid-rows-3'
  }
})

function itemClass(index: number) {
  const count = props.images.length

  if (count === 3 && index === 0)
    return 'row-span-2'

  if (count >= 5 && index === 4)
    return 'col-span-2'

  return ''
}
</script>