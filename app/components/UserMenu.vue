<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useAuth } from '~/composables/Auth/Auth';
import { useUser } from '~/composables/User/User';

defineProps<{
  collapsed?: boolean
}>()

const plcTest = ref(false)
const plcTestState = reactive({
  variable: "",
  value: undefined
})

const { writeValue } = usePLC()

const onTest = () => {
  writeValue(plcTestState.variable, plcTestState.value)
}

const { UserData } = useUser()

const colorMode = useColorMode()
const appConfig = useAppConfig()

const colors = [{
  label: 'Warning',
  value: 'orange'
},
{
  label: 'Success',
  value: 'green'
},
{
  label: 'Error',
  value: 'rose'
}]

const neutrals = ['slate', 'gray', 'zinc', 'neutral', 'stone']

const user = computed(() => {
  var userData = UserData()
  return {
    name: userData.displayName,
    avatar: {
      src: userData.image,
      alt: userData.displayName
    },
    systemAdmin: userData.systemAdmin
  }
})

const items = computed<DropdownMenuItem[][]>(() => {
  const isAdmin = user.value.systemAdmin



  const result: DropdownMenuItem[][] = [
    [
      {
        type: 'label',
        label: user.value.name,
        avatar: user.value.avatar
      }
    ],
    [
      {
        type: 'link',
        label: 'Kullanıcı Profili',
        icon: 'i-lucide-user'
      }
    ]
  ]

  if (isAdmin) {
    result.push([
      {
        type: 'link',
        label: 'Ayarlar',
        icon: 'i-lucide-settings',
        to: '/settings'
      },
      {
        type: 'link',
        label: 'İstasyon Durumu',
        icon: 'i-lucide-palette',
        children: colors.map(color => ({
          type: 'checkbox',
          label: color.label,
          chip: color.value,
          checked: appConfig.ui.colors.primary === color.value,
          onSelect: (e: Event) => {
            e.preventDefault()
            appConfig.ui.colors.primary = color.value
          }
        }))
      },
      {
        type: 'link',
        label: 'Dev Tool',
        icon: 'fluent:window-dev-tools-16-regular',
        onSelect: (e: Event) => {
          (window as any).electronAPI.toggleDevTools()
        }
      },
      {
        type: 'link',
        label: 'Barkod Ekranı',
        icon: 'iconoir:scan-barcode',
        onSelect: (e: Event) => {
          navigateTo('/barcode')
        }
      },
      {
        type: 'link',
        label: 'Mode',
        icon: 'i-lucide-sun-moon',
        children: [
          {
            type: 'checkbox',
            label: 'Light',
            checked: colorMode.value === 'light',
            onSelect(e: Event) {
              e.preventDefault()
              colorMode.preference = 'light'
            }
          },
          {
            type: 'checkbox',
            label: 'Dark',
            checked: colorMode.value === 'dark',
            onSelect(e: Event) {
              e.preventDefault()
              colorMode.preference = 'dark'
            }
          }
        ]
      },
      {
        label: "PLC Test",
        onSelect: () => { plcTest.value = true }
      }
    ])
  }

  result.push([
    {
      type: 'link',
      label: 'Dökümantasyon',
      icon: 'i-lucide-book-open',
    },
    {
      type: 'link',
      label: 'Çıkış Yap',
      icon: 'i-lucide-log-out',
      onSelect(e: Event) {
        e.preventDefault()
        const { logout } = useAuth()
        logout()
        navigateTo('/auth/login')
      }
    }
  ])

  return result
})
</script>

<template>
  <UDropdownMenu :items="items" :content="{ align: 'center', collisionPadding: 12 }"
    :ui="{ content: collapsed ? 'w-48' : 'w-(--reka-dropdown-menu-trigger-width)' }">
    <UButton v-bind="{
      ...user,
      label: collapsed ? undefined : user?.name,
      trailingIcon: collapsed ? undefined : 'i-lucide-chevrons-up-down'
    }" color="neutral" variant="ghost" block :square="collapsed" class="data-[state=open]:bg-elevated" :ui="{
      trailingIcon: 'text-dimmed'
    }" />

    <template #chip-leading="{ item }">
      <div class="inline-flex items-center justify-center shrink-0 size-5">
        <span class="rounded-full ring ring-bg bg-(--chip-light) dark:bg-(--chip-dark) size-2" :style="{
          '--chip-light': `var(--color-${(item as any).chip}-500)`,
          '--chip-dark': `var(--color-${(item as any).chip}-400)`
        }" />
      </div>
    </template>
  </UDropdownMenu>

  <UModal v-model:open="plcTest" title="PLC Test"
    description="Bu alan ile PLC üzerinde bir alanın verisini değiştirebiliriniz.">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Değişken Adı">
          <UInput v-model="plcTestState.variable" class="w-full" />
        </UFormField>
        <UFormField label="Değer">
          <UInput v-model="plcTestState.value" class="w-full" />
        </UFormField>
        <div class="flex justify-end">
          <UButton label="Test" @click="onTest" />
        </div>
      </div>
    </template>
  </UModal>
</template>
