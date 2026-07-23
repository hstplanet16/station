<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'
import { useProcessStore } from '~/store/Process'
import { useSyncService } from '~/composables/useSyncService'

const route = useRoute()
const processStore = useProcessStore()
const { checkConnectionAndFlush } = useSyncService()

const open = ref(false)

const links = computed(() => [[
  {
    label: 'Analiz',
    icon: 'i-lucide-house',
    to: '/',
    onSelect: () => {
      open.value = false
    }
  },
  {
    label: 'İşlem Adımları',
    icon: 'i-lucide-inbox',
    type: 'trigger',
    defaultOpen: true,
    children: (Array.isArray(processStore.getTypes) ? processStore.getTypes : []).map(type => ({
      label: type.name,
      to: `/process/${type.typeCode}`,
      onSelect: () => {
        open.value = false
      }
    }))
  },
  {
    label: 'Cihazlar',
    icon: 'i-lucide-users',
    to: '/devices',
    onSelect: () => {
      open.value = false
    }
  },
  {
    label: 'Ayarlar',
    to: '/settings',
    icon: 'i-lucide-settings',
    defaultOpen: true,
    type: 'trigger',
    children: [
      {
        label: 'Genel Ayarlar',
        to: '/settings',
        exact: true,
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Yetkiler',
        to: '/settings/members',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Bildirimler',
        to: '/settings/notifications',
        onSelect: () => {
          open.value = false
        }
      },
      {
        label: 'Güvenlik',
        to: '/settings/security',
        onSelect: () => {
          open.value = false
        }
      }
    ]
  },
  {
    label: 'Kullanıcılar',
    icon: 'i-lucide-users',
    to: '/users',
  },
  {
    label: 'Tipler',
    icon: 'i-lucide-users',
    to: '/types',
  },
]] satisfies NavigationMenuItem[][])

const groups = computed(() => [{
  id: 'links',
  label: 'Go to',
  items: links.value.flat()
}, {
  id: 'code',
  label: 'Code',
  items: [{
    id: 'source',
    label: 'View page source',
    icon: 'i-simple-icons-github',
    to: `https://github.com/nuxt-ui-templates/dashboard/blob/main/app/pages${route.path === '/' ? '/index' : route.path}.vue`,
    target: '_blank'
  }]
}])

onMounted(async () => {
  checkConnectionAndFlush()
  await processStore.findTypes()
})
</script>

<template>
  <UDashboardGroup unit="rem">
    <UDashboardSidebar id="default" v-model:open="open" collapsible resizable class="bg-elevated/25"
      :ui="{ footer: 'lg:border-t lg:border-default' }">
      <template #header="{ collapsed }">
        <div class="flex items-center justify-between w-full">
          <UUser :avatar="{ icon: 'material-icon-theme:dart-generated' }" />
          <p v-if="!collapsed">Next Solution</p>
          <ConnectionStatus v-if="!collapsed" />
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" label="Ara..." />

        <UNavigationMenu :collapsed="collapsed" :items="links[0]" orientation="vertical" tooltip popover />
      </template>

      <template #footer="{ collapsed }">
        <UserMenu :collapsed="collapsed" />
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <slot />

    <NotificationsSlideover />
  </UDashboardGroup>
</template>
