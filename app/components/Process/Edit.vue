<script setup lang="ts">
import * as z from 'zod'
import { useProcessStore } from '~/store/Process'
import type { IProcess } from '~/types/process'

const props = defineProps<{
  process: IProcess
}>()

const open = defineModel<boolean>('open', { default: false })
const processStore = useProcessStore()
const toast = useToast()

const processTypeItems = [
  { label: 'Barkod Okutma', value: 'barcode' },
  { label: 'Sıkıcı', value: 'screw' },
  { label: 'Süreli Sayfa', value: 'general' },
  { label: 'Sunucu İşlemleri', value: 'server' }
]

const state = reactive({
  name: '',
  processType: 'barcode',
  processNumber: 100
})

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  processType: z.string(),
  processNumber: z.number().int()
})

watch(open, (isOpen) => {
  if (isOpen) {
    state.name = props.process.name
    state.processType = props.process.processType
    state.processNumber = props.process.processNumber
  }
})

const onSubmit = async () => {
  try {
    await processStore.updateProcess({
      id: props.process.id,
      name: state.name,
      processNumber: state.processNumber,
      processType: state.processType,
      data: props.process.data
    })
    toast.add({ title: 'Başarılı', description: 'İşlem adımı güncellendi.', color: 'success' })
    open.value = false
  } catch (error: any) {
    if (error?.isOffline) {
      toast.add({ title: 'Çevrimdışı', description: 'Değişiklikler yerel olarak kaydedildi, bağlantı gelince senkronize edilecek.', color: 'warning' })
      open.value = false
    } else {
      toast.add({ title: 'Hata', description: String(error), color: 'error' })
    }
  }
}
</script>

<template>
  <UModal v-model:open="open" title="İşlem Adımını Düzenle" description="İşlem adımının temel bilgilerini güncelleyin.">
    <template #body>
      <UForm class="space-y-4" :state="state" :schema="schema" @submit="onSubmit">
        <UFormField name="name" label="İşlem Adı">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField name="processNumber" label="Adım Numarası">
          <UInput v-model="state.processNumber" type="number" class="w-full" />
        </UFormField>
        <UFormField name="processType" label="İşlem Tipi">
          <USelect v-model="state.processType" :items="processTypeItems" class="w-full" />
        </UFormField>
        <div class="flex justify-end">
          <UButton label="Kaydet" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
