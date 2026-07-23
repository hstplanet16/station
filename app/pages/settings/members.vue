<script setup lang="ts">
import { useStation } from '~/composables/Station/Station'
import { usePermissionStore } from '~/store/Permission'

const { stationData } = useStation()

const permissionStore = usePermissionStore()
const { data: users } = await useAxios().get(`User/getAllUsers`)

const q = ref('')
const addPermissionModal = ref(false)
const station = stationData() as any

const filteredMembers = computed(() => {
  return permissionStore.getPermissionList.filter((member: any) => {
    return member.user.displayName.search(new RegExp(q.value, 'i')) !== -1 || member.user.userName.search(new RegExp(q.value, 'i')) !== -1
  })
})

const selectUser = ref()

const userList = computed(() => {

  if (users.length > 0) {
    selectUser.value = {
      label: users[0].displayName,
      value: users[0].id,
      avatar: {
        src: users[0].image,
        alt: users[0].userName,
        loading: 'lazy' as const
      }
    }
  }

  return users.map((e: any) => {
    return {
      label: e.displayName,
      value: e.id,
      avatar: {
        src: e.image,
        alt: e.userName,
        loading: 'lazy' as const
      }
    }
  })
})

const addUserPermission = async () => {
  try {
    const { data } = await useAxios().post("StationPermission/createPermission", { userId: selectUser.value.value, stationId: station.id })
    const userList = useAppCookie('next-user-list')
    if (!userList.value) {
      userList.value = [data.user]
    } else {
      const index = [...userList.value].findIndex(e => e.id == data.user.id)
      if (index < 0) {
        userList.value = [...userList.value , data.user]
      }
    }
    permissionStore.pushPermission(data)
  } catch (error) {
    useToast().add({ color: "error", title: "Hata", description: "Kullanıcı yetkisi oluşturulurken bir hata oluştu." })
  } finally {
    addPermissionModal.value = false
  }
}

onMounted(async () => {
  await permissionStore.getAllPermission()
})

</script>

<template>
  <div>
    <UPageCard title="Yetkiler"
      description="İstasyonda oturum açma yetkisine sahip kullanıcıları tanımlayın. Yetkilerini düzenleyin."
      variant="naked" orientation="horizontal" class="mb-4">
      <UModal title="Personel Ekle" description="İstasyonda oturum açma yetkisi olacak bir personel ekleyin."
        v-model:open="addPermissionModal">
        <UButton label="Personel Ekle" color="neutral" class="w-fit lg:ms-auto" />
        <template #body>
          <UForm class="space-y-4">
            <UFormField label="Personel" description="Personel listenizden bir personel seçin.">
              <USelectMenu v-model="selectUser" :avatar="selectUser?.avatar" :items="userList" class="w-full"
                size="xl" />
            </UFormField>
            <div class="flex justify-end">
              <UButton label="Personel Ekle" variant="subtle" @click="addUserPermission" />
            </div>
          </UForm>
        </template>
      </UModal>
    </UPageCard>

    <UPageCard variant="subtle"
      :ui="{ container: 'p-0 sm:p-0 gap-y-0', wrapper: 'items-stretch', header: 'p-4 mb-0 border-b border-default' }">
      <template #header>
        <UInput v-model="q" icon="i-lucide-search" placeholder="Personel Ara..." autofocus class="w-full" />
      </template>

      <SettingsMembersList :members="filteredMembers" />
    </UPageCard>


  </div>
</template>
