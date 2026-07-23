<template>
  <UModal v-model:open="open" title="Düzenle" description="Tip bilgilerini düzenleyin.">
    <slot />
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <div class="grid grid-cols-2 gap-4">
          <!-- Adı -->
          <UFormField label="Tip Adı" name="name" required>
            <UInput v-model="state.name" placeholder="Örn. CSUV" class="w-full" />
          </UFormField>

          <!-- Soyadı -->
          <UFormField label="Tip Kodu" name="typeCode" required>
            <UInput v-model="state.typeCode" placeholder="Örn. AA" class="w-full" />
          </UFormField>
        </div>

        <!-- Form Butonları -->
        <div class="flex justify-end">
          <UButton type="submit" color="primary" loading-auto>Düzenle</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { useProcessStore } from '~/store/Process'

const processStore = useProcessStore()

const open = defineModel("open", { default: false })
const props = defineProps(['data'])

const schema = z.object({
  name: z.string().min(1, 'Tip adı alanı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  typeCode: z.string().min(1, 'Tip kodu alanı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
})

const state = reactive({
  name: '',
  typeCode: '',
})


async function onSubmit(event: FormSubmitEvent<any>) {
  await processStore.editType({id : props.data.id , ...event.data})
  resetForm()
  open.value = false
}

function resetForm() {
  state.name = '',
  state.typeCode = ''
}

watch(open, (value) => {
  if (value) {
    state.name = props.data.name
    state.typeCode = props.data.typeCode
  }
})
</script>