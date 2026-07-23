<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { useProcessStore } from '~/store/Process';
import { useUserStore } from '~/store/User';
import type { IType } from '~/types/process';

const props = defineProps<{
  members: IType[]
}>()

const removeTypeModal = ref(false)
const editTypeModal = ref(false)
const selectType = ref()
const processStore = useProcessStore()

const items = (row: any) => {
  return [{
    label: 'Düzenle',
    onSelect: () => {
      editTypeModal.value = true
      selectType.value = row
    }
  }, {
    label: 'Tipi Kaldır',
    color: 'error' as const,
    onSelect: () => {
      removeTypeModal.value = true
      selectType.value = row
    }
  }] satisfies DropdownMenuItem[]
}

const onRemove = async () => {
  try {
    await processStore.removeType(selectType.value)
  } finally {
    removeTypeModal.value = false
  }
}

</script>

<template>
  <ul role="list" class="divide-y divide-default">
    <li v-for="(member, index) in members" :key="index"
      class="flex items-center justify-between gap-3 py-3 px-4 sm:px-6">
      <div class="flex items-center gap-3 min-w-0">
        <UAvatar :text="member.typeCode" size="md" />

        <div class="text-sm min-w-0">
          <p class="text-highlighted font-medium truncate">
            {{ member.name }}
          </p>
          <p class="text-muted truncate">
            {{ member.typeCode }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <UDropdownMenu :items="items(member)" :content="{ align: 'end' }">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" />
        </UDropdownMenu>
      </div>
    </li>
  </ul>

  <TypesEdit v-model:open="editTypeModal" :data="selectType" />

  <UModal v-model:open="removeTypeModal" title="Uyarı"
    description="Tipi kaldırmak istediğinizden emin misiniz?">
    <template #body>
      <div class="space-y-4">
        <p>Tipi kaldırmak üzeresiniz. Tipi kaldırdığınızda tüm istasyonlardaki tasarladığınız işlem süreçlerinide kaybedeceksiniz. Bu işlem geri alınamaz.</p>
        <div class="flex justify-end">
          <UButton label="Tipi Kaldır" variant="subtle" color="error" loading-auto @click="onRemove" />
        </div>
      </div>
    </template>
  </UModal>
</template>
