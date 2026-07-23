<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { usePermissionStore } from '~/store/Permission';

const props = defineProps<{
  members: any[]
}>()

const removePermissionModal = ref(false)
const selectPerson = ref()


const items = (row: any) => {
  return [{
    label: 'Yetkiyi Kaldır',
    color: 'error' as const,
    onSelect: () => {
      removePermissionModal.value = true
      selectPerson.value = row
    }
  }] satisfies DropdownMenuItem[]
}

const onRemove = async () => {
  try {
    const { data } = await useAxios().delete(`StationPermission/removePermission?id=${selectPerson.value.id}`)
    usePermissionStore().removePermission(data)
    const userList = useAppCookie("next-user-list")
    if (userList.value) {
      userList.value = userList.value.filter(
        (e: any) => e.id !== data.user.id
      )
    }
  } catch (error) {
    useToast().add({ color: "error", title: "Hata", description: "Kullanıcı yetkisi kaldırılırken bir hata oluştu." })
  } finally {
    removePermissionModal.value = false
  }
}

</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li v-for="(member, index) in members" :key="index"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6">
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar :src="member.user.image" size="md" />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ member.user.displayName }}
          </p>
          <p class="text-muted truncate">
            {{ member.user.userName }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <p>{{ member.user.systemAdmin ? 'Sistem Yöneticisi' : 'Operatör' }}</p>

        <UDropdownMenu :items="items(member)" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </div>
    </li>
  </ul>

  <UModal v-model:open="removePermissionModal" title="Uyarı"
    description="Personelin yetkisini bu istasyon kaldırmak istediğinizden emin misiniz?">
    <template #body>
      <div class="space-y-4">
        <p>Personelin yetkisini bu istasyondan kaldırmak üzeresiniz. Yekiyi kaldırdığınızda kullanıcı artık bu
          istasyonda oturum açamaz ve üretime dahil olamaz.</p>
        <div class="flex justify-end">
          <UButton label="Yetkiyi Kaldır" variant="subtle" color="error" loading-auto @click="onRemove" />
        </div>
      </div>
    </template>
  </UModal>
</template>
