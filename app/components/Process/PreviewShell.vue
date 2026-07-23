<script setup lang="ts">
defineProps<{
  showNotFound?: boolean
}>()
</script>

<template>
  <div class="relative flex h-full min-h-0 w-full flex-1 flex-col">
    <div class="flex min-h-0 flex-1 w-full items-stretch justify-center overflow-auto">
      <slot />
    </div>

    <div
      v-if="showNotFound"
      class="absolute inset-0 z-10 flex items-center justify-center bg-accented/30 backdrop-blur-md"
    >
      <slot name="not-found" />
    </div>
  </div>
</template>
