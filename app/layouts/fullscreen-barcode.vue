<script setup lang="ts">
import { useStation } from '~/composables/Station/Station'

const { getStation } = useStation()

onMounted(async () => {
  await getStation()
})
</script>

<template>
  <SkyBg />
  <div class="absolute z-[-1] size-60 transform rounded-full bg-primary blur-[300px] sm:size-100" />
  <div class="h-screen px-4 py-4">
    <slot />
  </div>
</template>
