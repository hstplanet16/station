<script setup lang="ts">
import type { StepperItem } from '#ui/types';
import * as z from 'zod'
import { useDeviceStore } from '~/store/Device';
import { useNotificationStore } from '~/store/Notification';
import { useStationStore } from '~/store/Station';


const open = defineModel("open", { default: false })
const props = defineProps(["data"])

const stepperIndex = ref(0)
const form = useTemplateRef('form')
const stepper = useTemplateRef('stepper')
const deviceStore = useDeviceStore()
const stationStore = useStationStore()

const deviceList = computed(() => {
  return deviceStore.getDevices.map(e => {
    return { value: e.id, label: e.name }
  })
})

const comPortList = ref<{ value: string, label: string }[]>([])

const items = ref<StepperItem[]>([
  {
    title: 'Cihaz Bilgileri',
    description: 'Cihazının genel bilgilerini tanımlayın.',
    slot: 'deviceInformation'
  },
  {
    title: 'Bağlantı Ayarlar',
    description: 'Cihazın bağlantı kurabilmesi için bağlatıyı yapılandırın.',
    slot: 'connection'
  },
  {
    title: 'Onay',
    description: 'Cihazınızı oluşturmadan önce onaylayın.',
    slot: 'confirm'
  }
])

const state = reactive({
  type: "",
  connectionType: "",
  name: "",
  description: "",
  icon: "",
  ipaddress: undefined,
  port: undefined,
  comport: "",
  boundRate: 9600,
  dataBlock: undefined,
  deviceId: undefined,
  screwNumber: undefined
})

const deviceSchema = z.object({
  name: z.string().min(2, 'En az 2 karakter olmalıdır.'),
  description: z.string().min(12, "En az 12 karakter bir açıklama yazın.")
})

const barcodeSchema = z.object({
  comport: z.string().min(4, 'COM port en az 4 karakter olmalıdır.'),
  boundRate: z.int32()
})

const boringDeviceSchema = z.object({
  deviceId: z.number(),
  screwNumber: z.number()
})

const cameraSchema = z.object({
  ipAddress: z.string()/*.regex(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    "Geçerli bir IP adresi giriniz"
  )*/,
  port: z.int32()
})

const plcSchema = z.object({
  ipAddress: z.string()/*.regex(
    /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/,
    "Geçerli bir IP adresi giriniz"
  )*/,
  port: z.number(),
  dataBlock: z.number()
})


const nextStepper = async () => {
  if (stepperIndex.value == 2) {
    await createDevice()
    return
  }
  try {
    //@ts-ignore
    await form.value?.validate({ silent: true })
    stepper.value?.next()
  } catch (error) {
    console.log('Form hatalı', error)
  }
}

const createDevice = async () => {
  try {
    const { data } = await useAxios().post("Device/editDevice", { ...state, id: props.data.id, StationId: stationStore.getStation.id, active: true })
    deviceStore.changeDevice(data)
    useToast().add({ title: "Başarılı", description: "Cihaz başarıyla güncelendi.", color: "success" })
    useNotificationStore().addLog(`${data.name} cihazınızın bilgileri güncellendi`, "success")
    resetForm()
  } catch (error) {
    const message = useAPIHelper().ErrorConvert(error)
    useNotificationStore().addLog(`Cihazınızın bilgileri güncellenemedi : ${message}`, "error")
    useToast().add({ title: "Hata", description: message, color: "error" })
  } finally {
    open.value = false
  }
}

const resetForm = () => {
  state.boundRate = 9600
  state.comport = ""
  state.connectionType = ""
  state.dataBlock = undefined
  state.description = ""
  state.deviceId = undefined
  state.icon = ""
  state.ipaddress = undefined
  state.name = ""
  state.port = undefined
  state.type = ""
  stepperIndex.value = 0
}

onMounted(async () => {
  //@ts-ignore
  const ports = await window.electronAPI.getComPorts();
  comPortList.value = ports.map((e: any) => {
    return { label: e.path, value: e.path }
  })
  if (comPortList.value.length > 0) {
    state.comport = comPortList.value[0]?.value ?? "";
  }
})

watch(open, (value) => {
  if (value) {
    state.boundRate = props.data.boundRate
    state.comport = props.data.comport
    state.connectionType = props.data.connectionType
    state.dataBlock = props.data.dataBlock
    state.description = props.data.description
    state.deviceId = props.data.deviceId
    state.icon = props.data.icon
    state.ipaddress = props.data.ipaddress
    state.name = props.data.name
    state.port = props.data.port
    state.type = props.data.type
    stepperIndex.value = 0
  }
})

</script>

<template>
  <UModal v-model:open="open" title="Düzenle" description="Bu istasyonda çalışan cihaz bilgilerini güncelleyin."
    :ui="{ content: 'min-w-1/2' }">
    <template #body>
      <UStepper :items="items" ref="stepper" v-model="stepperIndex" size="sm" disabled>
        <template #deviceInformation>
          <UForm class="space-y-4" ref="form" :schema="deviceSchema" :state="state">
            <UFormField name="name" label="Cihaz Adı" description="Cihazının görünecek adını girin">
              <UInput v-model="state.name" class="w-full" />
            </UFormField>
            <UFormField name="description" label="Açıklama"
              description="Cihazın ne için kullanılacağı ile ilgili kısa bir açıklama yazın.">
              <UTextarea v-model="state.description" :rows="3" class="w-full" />
            </UFormField>
          </UForm>
        </template>
        <template #connection>
          <!-- Barkod Okuyucu -->
          <UForm class="space-y-4" v-if="state.type == 'Barcode'" ref="form" :schema="barcodeSchema" :state="state">
            <UFormField name="comport" label="COM Port" description="Cihazının bağlı olduğu COM Portu seçin">
              <USelect v-model="state.comport" :items="comPortList" value-key="value" label-key="label"
                class="w-full" />
            </UFormField>
            <UFormField name="boundRate" label="Baund Rate" description="Cihazın haberleşme hızını seçin">
              <USelect v-model="state.boundRate" :items="[9600, 19200, 38400, 57600, 74880, 115200]" class="w-full" />
            </UFormField>
          </UForm>
          <!-- Sıkıcı -->
          <UForm class="space-y-4" v-else-if="state.type == 'BoringDevice'" ref="form" :schema="boringDeviceSchema"
            :state="state">
            <UPageCTA title="Uyarı"
              description="Sıkıcı tanımı yapılacak bir PLC cihazı yok. Lütfen sıkıcının bağlı olduğu bir PLC tanımlayın."
              v-if="deviceList.length == 0" />
            <div class="space-y-4" v-else>
              <UFormField name="deviceId" label="PLC" description="Cihazının bağlı olduğu PLC seçin">
                <USelect v-model="state.deviceId" :items="deviceList" class="w-full" />
              </UFormField>
              <UFormField name="screwNumber" label="Sıkıcı Numrası" description="Cihazının bağlı olduğu PLC seçin">
                <UInputNumber v-model="state.screwNumber" :items="deviceList" class="w-full" />
              </UFormField>
              <UAlert title="Bilgilendirme" description="Sıkıcı ayarlarınızı sizin için yapacağız." variant="subtle" />
            </div>
          </UForm>
          <!-- Kamera -->
          <UForm class="space-y-4" v-else-if="state.type == 'Camera'" ref="form" :schema="cameraSchema" :state="state">
            <UFormField name="ipAddress" label="Server IP Adresi"
              description="Bağlantı kurulacak server ip adresini girin.">
              <UInput v-model="state.ipaddress" class="w-full" />
            </UFormField>
            <UFormField name="port" label="Port" description="Server port numarasını girin.">
              <UInput type="number" v-model="state.port" class="w-full" />
            </UFormField>
          </UForm>
          <!-- Kart Okuyucu -->
          <UAlert title="Bilgilendirme" description="Kart okuyucu için gerekli ayarlamaları yapacağız." variant="subtle"
            v-else-if="state.type == 'CardReader'" />
          <!-- PLC -->
          <UForm class="space-y-4" v-else-if="state.type == 'PLC'" ref="form" :schema="plcSchema" :state="state">
            <UFormField name="ipaddress" label="Server IP Adresi"
              description="Bağlantı kurulacak PLC için IP adresini girin.">
              <UInput v-model="state.ipaddress" class="w-full" />
            </UFormField>
            <UFormField name="port" label="Port" description="Bağlantı kurulacak PLC için port numarasını girin.">
              <UInput type="number" v-model="state.port" class="w-full" />
            </UFormField>
            <UFormField name="dataBlock" label="DataBlok"
              description="Bağlantı kurulacak PLC için datablok numarasını girin.">
              <UInput type="number" v-model="state.dataBlock" class="w-full" />
            </UFormField>
          </UForm>
        </template>
        <template #confirm>
          <UPageCTA :ui="{ container: 'xl:p-4' }" title="Neredeyse Tamam"
            description="Cihazınızın bilgilerini onayınız ile düzenleyeceğiz. Cihaz düzenlendikten sonra kullanılabilir olacak."
            variant="naked" />
        </template>
      </UStepper>
    </template>
    <template #footer>
      <div class="flex justify-between w-full">
        <UButton label="Önceki" v-if="stepper?.hasPrev" @click="stepper.prev()" />
        <UButton :label="stepper?.hasNext ? 'Sonraki' : 'Düzenle'" class="ml-auto" @click="nextStepper"
          :disabled="state.type == 'BoringDevice' && deviceList.length == 0 && stepperIndex == 2" loading-auto />
      </div>
    </template>
  </UModal>
</template>
