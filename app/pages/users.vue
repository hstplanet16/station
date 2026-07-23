<script setup lang="ts">
import { useUserStore } from '~/store/User'

const userStore = useUserStore()

const q = ref('')
const addPermissionModal = ref(false)

const filteredMembers = computed(() => {
  return userStore.getUsers.map(e => {
    return { user: e }
  }).filter((member: any) => {
    return member.user.displayName.search(new RegExp(q.value, 'i')) !== -1 || member.user.userName.search(new RegExp(q.value, 'i')) !== -1
  })
})

onMounted(async () => {
  await userStore.getAllUser()
})

</script>

<template>
  <UContainer class="py-20">
    <UPageCard title="Personeller"
      description="İstasyonda oturum açma yetkisine sahip kullanıcıları tanımlayın. Yetkilerini düzenleyin."
      variant="naked" orientation="horizontal" class="mb-4">
      <UsersAdd v-model:open="addPermissionModal">
        <UButton label="Personel Ekle" color="neutral" class="w-fit lg:ms-auto" />
      </UsersAdd>
    </UPageCard>

    <UPageCard variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput v-model="q" icon="i-lucide-search" placeholder="Personel Ara..." autofocus class="w-full" />
      </template>

      <UsersMembersList :members="filteredMembers" />
    </UPageCard>
  </UContainer>
</template>
