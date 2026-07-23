<template>
  <UModal v-model:open="open" title="Verileri Transfer Et" description="İşlem adımlarını bir tipten başka bir tipe aktarın.">
    <template #body>
      <div class="space-y-4">
        <div>
          <label class="text-sm font-medium">Kaynak Tip</label>
          <p class="text-xs text-muted-foreground mb-2">Verilerin alınacağı işlem tipi</p>
          <USelect v-model="selectedSourceType" :items="sourceTypeItems" class="w-full" />
        </div>
        
        <div>
          <label class="text-sm font-medium">Hedef Tip</label>
          <p class="text-xs text-muted-foreground mb-2">Verilerin aktarılacağı işlem tipi</p>
          <USelect v-model="selectedTargetType" :items="targetTypeItems" class="w-full" />
        </div>

        <div class="flex justify-end gap-2">
          <UButton label="İptal" color="neutral" variant="outline" @click="open = false" />
          <UButton label="Transfer Et" color="primary" :loading="isTransferring" :disabled="!canTransfer" @click="handleTransfer" />
        </div>
      </div>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { useProcessStore } from '~/store/Process'

const open = defineModel<boolean>('open', { default: false })
const processStore = useProcessStore()
const toast = useToast()

const selectedSourceType = ref<string>('')
const selectedTargetType = ref<string>('')
const isTransferring = ref(false)

const allTypes = computed(() => processStore.getTypes)

const sourceTypeItems = computed(() => {
  return allTypes.value.map(type => ({
    label: type.name,
    value: type.typeCode
  }))
})

const targetTypeItems = computed(() => {
  return allTypes.value
    .filter(type => type.typeCode !== selectedSourceType.value)
    .map(type => ({
      label: type.name,
      value: type.typeCode
    }))
})

const canTransfer = computed(() => {
  return selectedSourceType.value && selectedTargetType.value && selectedSourceType.value !== selectedTargetType.value
})

watch(open, (isOpen) => {
  if (isOpen) {
    const currentType = processStore.resolveType()
    if (currentType) {
      selectedSourceType.value = currentType.typeCode
    }
  } else {
    selectedSourceType.value = ''
    selectedTargetType.value = ''
  }
})

const handleTransfer = async () => {
  if (!canTransfer.value) return
  
  isTransferring.value = true
  try {
    const transferredCount = await processStore.transferProcesses(selectedSourceType.value, selectedTargetType.value)
    toast.add({ 
      title: "Başarılı", 
      description: `${transferredCount} işlem adımı transfer edildi.`, 
      color: 'success' 
    })
    open.value = false
  } catch (error: any) {
    toast.add({ title: "Hata", description: error?.message ?? String(error), color: 'error' })
  } finally {
    isTransferring.value = false
  }
}
</script>
