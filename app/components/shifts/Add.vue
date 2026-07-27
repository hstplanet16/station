<template>
  <UModal v-model:open="open" title="Yeni Vardiya" description="Sisteme yeni bir vardiya ekleyin.">
    <slot />
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <!-- Vardiya Adı -->
        <UFormField label="Vardiya Adı" name="name" required>
          <UInput v-model="state.name" placeholder="Örn. Sabah Vardiyası" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <!-- Başlangıç Zamanı -->
          <UFormField label="Başlangıç Zamanı" name="startTime" required>
            <UInput v-model="state.startTime" placeholder="Örn. 800" class="w-full" />
          </UFormField>

          <!-- Bitiş Zamanı -->
          <UFormField label="Bitiş Zamanı" name="endTime" required>
            <UInput v-model="state.endTime" placeholder="Örn. 1530" class="w-full" />
          </UFormField>
        </div>

        <!-- Form Butonları -->
        <div class="flex justify-end">
          <UButton type="submit" color="primary" loading-auto>Vardiya Ekle</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { useShiftStore } from '~/store/Shift'

const shiftStore = useShiftStore()

const open = defineModel("open", { default: false })

const schema = z.object({
  name: z.string().min(1, 'Vardiya adı alanı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  startTime: z.string().min(3, 'Başlangıç zamanı HHMM formatında olmalıdır (örn. 800).').max(4, 'Başlangıç zamanı HHMM formatında olmalıdır (örn. 800).'),
  endTime: z.string().min(3, 'Bitiş zamanı HHMM formatında olmalıdır (örn. 1530).').max(4, 'Bitiş zamanı HHMM formatında olmalıdır (örn. 1530).'),
})

const state = reactive({
  name: '',
  startTime: '',
  endTime: '',
})


async function onSubmit(event: FormSubmitEvent<any>) {
  await shiftStore.createShift(event.data)
  resetForm()
  open.value = false
}

function resetForm() {
  state.name = ''
  state.startTime = 0
  state.endTime = 0
}
</script>
