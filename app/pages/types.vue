<script setup lang="ts">
import { useProcessStore } from '~/store/Process'
import { useUserStore } from '~/store/User'

const processStore = useProcessStore()

const q = ref('')
const addPermissionModal = ref(false)

const filteredMembers = computed(() => {
  return processStore.getTypes.filter((member: any) => {
    return member.name.search(new RegExp(q.value, 'i')) !== -1 || member.typeCode.search(new RegExp(q.value, 'i')) !== -1
  })
})

onMounted(async () => {
  await processStore.findTypes()
})

</script>

<template>
  <UContainer class="py-20">
    <UPageCard title="Tipler"
      description="Ürünleriniz farklı üretim süreçlerine tabi olabilir. Bu durumlarda ürünlerinizin üretim süreçlerini ayırmak için tipleri kullanın."
      variant="naked" orientation="horizontal" class="mb-4">
      <TypesAdd v-model:open="addPermissionModal">
        <UButton label="Tip Ekle" color="neutral" class="w-fit lg:ms-auto" />
      </TypesAdd>
    </UPageCard>

    <UPageCard variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput v-model="q" icon="i-lucide-search" placeholder="Tip Ara..." autofocus class="w-full" />
      </template>

      <TypesList :members="filteredMembers" />
    </UPageCard>
  </UContainer>
</template>
