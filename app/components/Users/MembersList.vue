<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { usePermissionStore } from '~/store/Permission';
import { useUserStore } from '~/store/User';

const props = defineProps<{
  members: any[]
}>()

const removePermissionModal = ref(false)
const editUserModal = ref(false)
const selectPerson = ref()
const userStore = useUserStore()

const items = (row: any) => {
  return [{
    label: 'Düzenle',
    onSelect: () => {
      editUserModal.value = true
      selectPerson.value = row
    }
  }, {
    label: 'Personeli Kaldır',
    color: 'error' as const,
    onSelect: () => {
      removePermissionModal.value = true
      selectPerson.value = row
    }
  }] satisfies DropdownMenuItem[]
}

const onRemove = async () => {
  try {
    await userStore.remove(selectPerson.value.user)
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

  <UsersEdit v-model:open="editUserModal" :data="selectPerson" />

  <UModal v-model:open="removePermissionModal" title="Uyarı"
    description="Personeli kaldırmak istediğinizden emin misiniz?">
    <template #body>
      <div class="space-y-4">
        <p>Personeli kaldırmak üzeresiniz. Personeli kaldırdığınızda artık
          istasyonlarda oturum açamaz ve üretime dahil olamaz.</p>
        <div class="flex justify-end">
          <UButton label="Personeli Kaldır" variant="subtle" color="error" loading-auto @click="onRemove" />
        </div>
      </div>
    </template>
  </UModal>
</template>
