<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useStation } from '~/composables/Station/Station'

const { getStation, stationData, setStationData } = useStation()
import { sendConfigToElectron } from '~/utils/stationSetup'

const difficultyLevel = [
  { label: 'Çok zor', value: 1 },
  { label: 'Kolay', value: 2 },
  { label: 'Çok kolay', value: 3 }
]

const profileSchema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  tagTime: z.number(),
  difficultyLevel: z.number().optional(),
  description: z.string().optional(),
  ergonomiActive: z.boolean().optional(),
  stationActive: z.boolean().optional(),
  listenToPrev: z.boolean().optional(),
  listenToBack: z.boolean().optional(),
  nominalThreshold: z.number().int().min(120, "120 saniyeden küçük olamaz").max(180, "180 saniyeden büyük olamaz"),
  criticalThreshold: z.number().int().min(150, "150 saniyeden küçük olamaz"),
  prevIpaddress: z.string().optional(),
})

type ProfileSchema = z.output<typeof profileSchema>

const profile = reactive<Partial<ProfileSchema>>({
  name: '',
  tagTime: 180,
  difficultyLevel: 1,
  description: undefined,
  ergonomiActive: false,
  stationActive: true,
  listenToPrev: true,
  listenToBack: true,
  nominalThreshold: 150,
  criticalThreshold: 180,
  prevIpaddress: "",
})

const toast = useToast()

async function onSubmit(event: FormSubmitEvent<ProfileSchema>) {

  try {
    const station = stationData() as any
    const { data } = await useAxios().post("Station/updateStation", { ...event.data, id: station.id })
    setStationData(data)
    toast.add({
      title: 'Başarılı',
      description: 'İstasyon bilgileri başarıyla güncellendi.',
      icon: 'i-lucide-check',
      color: 'success'
    })
    const storedStation = useAppCookie('next-station').value
    if (storedStation?.id) {
      sendConfigToElectron(storedStation)
    }
  } catch (error) {
    toast.add({
      title: 'Hata',
      description: 'İstasyon bilgileri güncellenemedi.',
      icon: 'i-lucide-check',
      color: 'error'
    })
  }
}

onMounted(async () => {
  try {
    await getStation()
    const data = stationData() as any
    profile.name = data.name
    profile.tagTime = data.tagTime
    profile.description = data.description
    profile.difficultyLevel = data.difficultyLevel
    profile.ergonomiActive = data.ergonomiActive
    profile.stationActive = data.stationActive
    profile.prevIpaddress = data.prevIpaddress
    profile.listenToPrev = data.listenToPrev
    profile.listenToBack = data.listenToBack
  } catch (error) {
    useToast().add({ color: "error", title: "Hata", description: `${error}` })
  }
})


</script>

<template>
  <UForm id="settings" :schema="profileSchema" :state="profile" @submit="onSubmit" class="space-y-4">
    <UPageCard title="Genel Ayarlar"
      description="İstasyon bilgilerini değiştirin. İstasyonlarınızı yapılmakta olan iş için özelliştirin."
      variant="naked" orientation="horizontal" class="mb-4">
      <UButton form="settings" label="Kaydet ve Düzenle" color="neutral" type="submit" class="w-fit lg:ms-auto" />
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField name="name" label="İstasyon Adı" description="İstasyonun görünen adını belirtin." required
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="profile.name" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField name="tagTime" label="Çevrim Zamanı"
        description="İstasyonun bir ürünü üretmesi için gereken en uzun süre" required
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInput v-model="profile.tagTime" autocomplete="off">
          <template #trailing>
            <div id="character-count" class="text-xs text-muted tabular-nums" aria-live="polite" role="status">
              Saniye
            </div>
          </template>
        </UInput>
      </UFormField>
      <USeparator />
      <UFormField name="difficultyLevel" label="Zorluk Seviyesi"
        description="İstasyonun bir personel için zorluk seviyesini seçin." required
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInputMenu :items="difficultyLevel" v-model="profile.difficultyLevel" value-key="value" label-key="label"
          type="username" autocomplete="off" />
      </UFormField>
      <USeparator />
      <UFormField name="description" label="Açıklama"
        description="İstasyonun yapmakta olduğu iş hakkında kısa açıklama."
        class="flex max-sm:flex-col justify-between items-start gap-4" :ui="{ container: 'w-full' }">
        <UTextarea v-model="profile.description" :rows="5" autoresize class="w-full" />
      </UFormField>
    </UPageCard>

    <UPageCard variant="subtle">
      <UFormField name="ergonomiActive" label="Ergonomi" description="İstasyonun görünen adını belirtin."
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="profile.ergonomiActive" @update:model-value="" />
      </UFormField>
      <USeparator />
      <UFormField name="stationActive" label="Aktif" description="İstasyonun görünen adını belirtin."
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="profile.stationActive" @update:model-value="" />
      </UFormField>
      <UFormField name="listenToPrev" label="Verileri önceki istasyondan al"
        description="İşlenen verileri istasyonların kendi aralarında paylaşmasına izin ver."
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="profile.listenToBack" @update:model-value="" />
      </UFormField>
      <UFormField name="listenToPrev" label="Verileri sonraki istasyona gönder"
        description="İşlenen verileri istasyonların kendi aralarında paylaşmasına izin ver."
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <USwitch v-model="profile.listenToPrev" @update:model-value="" />
      </UFormField>
      <UFormField name="prevIpaddress" label="IP Adresi" description="Verilerin gönderileceği istasyon IP Adresi."
        class="flex max-sm:flex-col justify-between items-start gap-4" v-if="profile.listenToPrev">
        <UInput v-model="profile.prevIpaddress" @update:model-value="" />
      </UFormField>
    </UPageCard>
    <UPageCard variant="subtle">
      <UFormField name="nominalThreshold" label="Normal Eşik Değeri"
        description="Bu istasyonun normalde kaç saniyede işlemleri tamamlayacağını belirtin." required
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInputNumber v-model="profile.nominalThreshold" />

      </UFormField>
      <USeparator />
      <UFormField name="criticalThreshold" label="Kritik Eşik"
        description="Bu istasyonun en fazla kaç saniyede işlemleri tamamlayacağını belirtin." required
        class="flex max-sm:flex-col justify-between items-start gap-4">
        <UInputNumber v-model="profile.criticalThreshold" />
      </UFormField>
    </UPageCard>
  </UForm>
</template>
