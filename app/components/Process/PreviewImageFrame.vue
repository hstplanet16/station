<script setup lang="ts">
import { processPreviewImageFrameClass } from '~/utils/processPreviewLayout'
</script>

<template>
  <div :class="[processPreviewImageFrameClass, 'flex flex-col']">
    <div class="min-h-0 flex-1">
      <slot />
    </div>
  </div>
</template>
