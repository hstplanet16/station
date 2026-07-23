<script setup lang="ts">
import { useDeviceStore } from '~/store/Device';

const props = withDefaults(defineProps<{
  count?: number,
  rows?: any
}>(), {
  count: 0,
  rows: []
})

const open = ref(false)
const deviceStore = useDeviceStore()

async function onSubmit() {
  try {
    for (const element of props.rows) {
      await useAxios().delete(
        `Device/removeDevice?id=${element.original.id}`
      );

      deviceStore.removeDevice(element.original);
    }

    open.value = false;
  } catch (error) {
    const message = useAPIHelper().ErrorConvert(error);
    useToast().add({
      title: "Hata",
      description: message,
      color: "error"
    });
  }
}

</script>

<template>
  <UModal v-model:open="open" :title="`${count} adet cihazı sil`"
    :description="`Seçili cihazı/cihazları silmek istediğinize emin misiniz?`">
    <slot />

    <template #body>
      <div class="flex justify-end gap-2">
        <UButton label="İptal" color="neutral" variant="subtle" @click="open = false" />
        <UButton label="Cihazı Sil" color="error" variant="solid" loading-auto @click="onSubmit" />
      </div>
    </template>
  </UModal>
</template>
