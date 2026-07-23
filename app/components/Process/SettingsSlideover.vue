<script setup lang="ts">
import type { IProcessSettings, IProcessStepData } from '~/types/process'

const props = defineProps<{
  stepData: IProcessStepData
  processType: string
}>()

const open = defineModel<boolean>('open', { default: false })
const emit = defineEmits<{
  save: [settings: IProcessSettings]
}>()

const localSettings = ref<IProcessSettings>({ ...props.stepData.settings })

const materialNotFoundActions = [
  { label: 'Bekle (Operatör müdahalesi)', value: 'wait' },
  { label: 'Mesaj göster ve otomatik geç', value: 'showAndAdvance' },
  { label: 'Doğrudan otomatik geç', value: 'autoAdvance' }
]

const successActions = [
  { label: 'Bekle (Operatör onayı)', value: 'wait' },
  { label: 'Otomatik sonraki adıma geç', value: 'autoAdvance' },
  { label: 'Manuel onay butonu', value: 'manualConfirm' }
]

watch(open, (isOpen) => {
  if (isOpen) {
    localSettings.value = { ...props.stepData.settings }
  }
})

function save() {
  emit('save', { ...localSettings.value })
  open.value = false
}
</script>

<template>
  <USlideover v-model:open="open" title="İşlem Adımı Ayarları"
    description="Bu adımın operatör ekranındaki davranışlarını yapılandırın.">
    <template #body>
      <div class="space-y-6">
        <div class="space-y-4">
          <h3 class="font-semibold text-highlighted">Malzeme Bulunamadığında</h3>
          <UFormField label="Davranış">
            <USelect v-model="localSettings.materialNotFoundAction" :items="materialNotFoundActions" class="w-full" />
          </UFormField>
          <UFormField
            v-if="localSettings.materialNotFoundAction !== 'wait'"
            label="Bekleme Süresi (sn)"
            description="Bu süre sonunda otomatik olarak sonraki adıma geçilir"
          >
            <UInput v-model="localSettings.materialNotFoundDelay" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Hata Mesajı">
            <UTextarea v-model="localSettings.materialNotFoundMessage" :rows="3" class="w-full" />
          </UFormField>
        </div>

        <USeparator />

        <div class="space-y-4">
          <h3 class="font-semibold text-highlighted">İşlem Başarılı Olduğunda</h3>
          <UFormField label="Davranış">
            <USelect v-model="localSettings.onSuccessAction" :items="successActions" class="w-full" />
          </UFormField>
          <UFormField
            v-if="localSettings.onSuccessAction === 'autoAdvance'"
            label="Geçiş Süresi (sn)"
          >
            <UInput v-model="localSettings.onSuccessDelay" type="number" class="w-full" />
          </UFormField>
        </div>

        <USeparator />

        <div class="space-y-4">
          <h3 class="font-semibold text-highlighted">Genel</h3>
          <UFormField label="Zaman Aşımı (sn)" description="Bu adımda maksimum bekleme süresi">
            <UInput v-model="localSettings.timeout" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Yeniden Deneme Sayısı">
            <UInput v-model="localSettings.retryCount" type="number" class="w-full" />
          </UFormField>
          <UFormField label="Hata Durumunda Atla">
            <USwitch v-model="localSettings.skipOnError" />
          </UFormField>
        </div>

        <div v-if="processType === 'screw'" class="space-y-4">
          <USeparator />
          <h3 class="font-semibold text-highlighted">Sıkıcı Ayarları</h3>
          <slot name="screw-settings" />
        </div>

        <div v-if="processType === 'server'" class="space-y-4">
          <USeparator />
          <h3 class="font-semibold text-highlighted">Sunucu Ayarları</h3>
          <slot name="server-settings" />
        </div>

        <div class="flex justify-end pt-4">
          <UButton label="Kaydet" @click="save" loading-auto />
        </div>
      </div>
    </template>
  </USlideover>
</template>
