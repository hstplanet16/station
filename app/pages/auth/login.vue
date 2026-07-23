<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useAuth } from '~/composables/Auth/Auth'

definePageMeta({ layout: "auth" })

const toast = useToast()
const show = ref(false)
const pin = ref<ComponentPublicInstance[]>()
const loadingUsers = ref(true)

const state = reactive({
    username: "",
    password: "",
    cardNumber: [] as string[],
    remember: true
})

onMounted(async () => {
    try {
        const { syncUserListFromServer } = useAuth()
        await syncUserListFromServer()
    } finally {
        loadingUsers.value = false
    }
})


const schema = z.object({
    username: z.string(),
    password: z.string(),
    cardNumber: z.any().optional(),
    remember: z.boolean()
})

type Schema = z.output<typeof schema>

async function onSubmit(payload: FormSubmitEvent<Schema>) {
    try {
        const { loginWithUsernameandPassword } = useAuth()
        await loginWithUsernameandPassword(payload.data.username, payload.data.password)
        navigateTo("/barcode")
    } catch (error) {
        useToast().add({ color: "error", title: "Hata", description: error as string })
    }
}

let unsubscribeCardReader: (() => void) | null = null

onMounted(() => {
    unsubscribeCardReader = (window as any).electronAPI.cardReaderStream(async (card: string) => {
        console.log("Card Reader : ", card);

        state.cardNumber = Array.from(card)
        if (state.cardNumber && state.cardNumber.length >= 10) {
            const cardNumber = state.cardNumber.join('')

            try {
                const { loginWithCardNumber } = useAuth()
                await loginWithCardNumber(cardNumber)
                navigateTo("/barcode")
            } catch (error) {
                useToast().add({ color: "error", title: "Hata", description: error as string })
                state.cardNumber = []
            }
        }
    })
})

onUnmounted(() => {
    if (unsubscribeCardReader) {
        unsubscribeCardReader()
    }
})

const onShow = () => {
    show.value = !show.value
}

</script>

<template>
    <div class="flex flex-col items-center justify-center gap-4 p-4 h-screen">
        <UPageCard class="w-full max-w-md">

            <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
                <UEmpty icon="material-icon-theme:dart-generated" title="Next Solution"
                    description="Sisteme giriş yapmak için kullanıcı adınızı girin veya kartınızı okutun."
                    variant="naked" />
                <UFormField name="username" label="Kullanıcı Adı" required>
                    <UInput v-model="state.username" class="w-full" placeholder="Kullanıcı Adı.." />
                </UFormField>
                <UFormField name="password" label="Şifre" required>
                    <UInput v-model="state.password" placeholder="Şifre" :type="show ? 'text' : 'password'"
                        :ui="{ trailing: 'pe-1' }" class="w-full">
                        <template #trailing>
                            <UButton color="neutral" variant="link" size="sm"
                                :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                                :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show"
                                aria-controls="password" @click="onShow" />
                        </template>
                    </UInput>
                </UFormField>
                <UFormField name="cardNumber" label="Kart Numarası" required>
                    <UPinInput ref="pin" v-model="state.cardNumber" :length="10" class="w-full" disabled />
                </UFormField>
                <UFormField name="remember" required>
                    <UCheckbox v-model="state.remember" label="Beni Hatırla" class="w-full" />
                </UFormField>
                <UButton label="Giriş Yap" variant="subtle" :ui="{ base: 'flex-1 w-full', label: 'text-center w-full' }"
                    type="submit" />
            </UForm>
        </UPageCard>
    </div>
</template>
