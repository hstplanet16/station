<template>
  <UModal v-model:open="open" title="Yeni Personel" description="Sisteme yeni bir personel ekleyin.">
    <slot />
    <template #body>
      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">

        <div class="grid grid-cols-2 gap-4">
          <!-- Adı -->
          <UFormField label="Adı" name="firstName" required>
            <UInput v-model="state.firstName" placeholder="Örn: Ahmet" class="w-full" />
          </UFormField>

          <!-- Soyadı -->
          <UFormField label="Soyadı" name="lastName" required>
            <UInput v-model="state.lastName" placeholder="Örn: Yılmaz" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Kullanıcı Adı -->
          <UFormField label="Kullanıcı Adı" name="userName" required>
            <UInput v-model="state.userName" placeholder="Örn: ahmetyilmaz" class="w-full" />
          </UFormField>

          <!-- E-posta Adresi -->
          <UFormField label="E-posta Adresi" name="emailAddress" required>
            <UInput v-model="state.emailAddress" type="email" placeholder="orn@sirket.com" class="w-full" />
          </UFormField>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <!-- Şifre -->
          <UFormField label="Şifre" name="password" required>
            <UInput v-model="state.password" type="password" placeholder="••••••••" class="w-full" />
          </UFormField>

          <!-- Ünvan/Görev -->
          <UFormField label="Ünvan" name="title">
            <UInput v-model="state.title" placeholder="Örn: Yazılım Geliştirici" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Kart Numarası" name="cardNumber">
          <UInput v-model="state.cardNumber" placeholder="Örn: CARD123456" class="w-full" />
        </UFormField>

        <!-- Sistem Yöneticisi mi? (Checkbox) -->
        <UFormField name="systemAdmin" class="pt-2">
          <UCheckbox v-model="state.systemAdmin" label="Sistem Yöneticisi (System Admin)" />
        </UFormField>

        <!-- Form Butonları -->
        <div class="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
          <UButton type="submit" color="primary" loading-auto>Personel Ekle</UButton>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script lang="ts" setup>
import { reactive } from 'vue'
import { z } from 'zod'
import type { FormSubmitEvent } from '#ui/types'
import { useUserStore } from '~/store/User'

const userStore = useUserStore()

const open = defineModel("open", { default: false })

const schema = z.object({
  firstName: z.string().min(1, 'Ad alanı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  lastName: z.string().min(1, 'Soyad alanı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  emailAddress: z.string().min(1, 'E-posta adresi zorunludur.').email('Geçersiz e-posta adresi.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  userName: z.string().min(1, 'Kullanıcı adı zorunludur.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır.').max(50, 'En fazla 50 karakter girebilirsiniz.'),
  title: z.string().max(50, 'Ünvan en fazla 50 karakter olabilir.').optional().or(z.literal('')),
  systemAdmin: z.boolean().default(false),
  cardNumber: z.string().max(50, 'Kart numarası en fazla 50 karakter olabilir.').optional().or(z.literal(''))
})

const state = reactive({
  firstName: '',
  lastName: '',
  emailAddress: '',
  userName: '',
  password: '',
  title: '',
  systemAdmin: false,
  cardNumber: ''
})


async function onSubmit(event: FormSubmitEvent<any>) {
  await userStore.create(event.data)
  resetForm()
  open.value = false
}

function resetForm() {
  state.firstName = ''
  state.lastName = ''
  state.emailAddress = ''
  state.userName = ''
  state.password = ''
  state.title = ''
  state.systemAdmin = false
  state.cardNumber = ''
}
</script>