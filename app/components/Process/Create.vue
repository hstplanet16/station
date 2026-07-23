<template>
  <UModal v-model:open="open" title="Yeni İşlem Adımı" description="Bu istasyon için yeni bir işlem adımı oluşturun.">
    <slot />
    <template #body>
      <UForm class="space-y-4" :state="state" :schema="schema" @submit="addProcess">
        <UFormField name="name" label="İşlem Adı" description="İşlemi tanımlayan bir isim verin.">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>
        <UFormField name="processNumber" label="Adım Numarası"
          description="İşlemleri sıralamak için adım numarası belirleyin. Varolan bir işlemin yerine adım numarası yazabilirsiniz.">
          <UInput v-model="state.processNumber" type="number" class="w-full" />
        </UFormField>
        <UFormField name="processType" label="İşlem Tipi"
          description="Bu işlemde yapılacakları sizin için planlayacağız lütfen işlem tipini seçin.">
          <USelect v-model="state.processType" :items="processType" class="w-full" />
        </UFormField>
        <div class="flex justify-end">
          <UButton label="Oluştur" type="submit" loading-auto />
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import * as z from 'zod'
import { useProcessStore } from '~/store/Process'
import { useStationStore } from '~/store/Station'

const stationStore = useStationStore()
const processStore = useProcessStore()

const open = defineModel('open', { default: false })
const props = defineProps<{
  typeCode: string
}>()

const processType = ref([
  { label: "Barkod Okutma", value: 'barcode' },
  { label: "Sıkıcı", value: 'screw' },
  { label: "Süreli Sayfa", value: 'general' },
  { label: "Sunucu İşlemleri", value: 'server' }
])

const state = reactive({
  name: "",
  processType: "barcode",
  processNumber: 100,
})

const schema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  processType: z.string(),
  processNumber: z.int32()
})


function resetForm() {
  state.name = ""
  state.processNumber = 100
  state.processType = "barcode"
}

const addProcess = async () => {
  try {
    await processStore.createProcess(state, props.typeCode)
    open.value = false
    resetForm()
    useToast().add({ title: "Başarılı", description: "Yeni iş adımı eklendi.", color: 'success' })
  } catch (error: any) {
    if (error.isOffline) {
      open.value = false
      resetForm()
      useToast().add({ title: "Çevrimdışı", description: "İş adımı yerel olarak eklendi, bağlantı gelince senkronize edilecek.", color: 'warning' })
    } else {
      useToast().add({ title: "Hata", description: error?.message ?? String(error), color: 'error' })
    }
  }
}
</script>

<style></style>