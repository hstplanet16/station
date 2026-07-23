<script setup lang="ts">
import { useStationStore } from '~/store/Station'
import { useProcessStore } from '~/store/Process'
import { useDeviceStore } from '~/store/Device'
import { usePermissionStore } from '~/store/Permission'
import { useNotificationStore } from '~/store/Notification'
import { useUserStore } from '~/store/User'
import { useAuthStore } from '~/store/Auth'

const toast = useToast()
const isSyncing = ref(false)

const remove = async () => {
  try {
    const { data } = await useAxios().delete("Station/removeStation")
    useStationStore().removeStation()
  } catch (error) {
    toast.add({ color: "error", title: "Hata", description: "İstasyon kaldırılamadı. Lütfen daha sonra tekrar deneyin." })
  }
}

const syncAllData = async () => {
  try {
    isSyncing.value = true
    console.log('Senkronizasyon başlıyor...')
    
    // Önce localStorage'ı temizle (istasyon ve kullanıcı bilgileri hariç)
    console.log('LocalStorage temizleniyor (istasyon ve kullanıcı bilgileri korunuyor)...')
    const stationData = localStorage.getItem('next-station')
    const stationUID = localStorage.getItem('next-station-uid')
    const userData = localStorage.getItem('next-user')
    
    localStorage.clear()
    
    // İstasyon ve kullanıcı bilgilerini geri yükle
    if (stationData) localStorage.setItem('next-station', stationData)
    if (stationUID) localStorage.setItem('next-station-uid', stationUID)
    if (userData) localStorage.setItem('next-user', userData)
    
    console.log('LocalStorage temizlendi (istasyon ve kullanıcı bilgileri korundu)')
    
    // Station verilerini yeniden çek
    console.log('Station verileri çekiliyor...')
    const stationStore = useStationStore()
    await stationStore.setStation()
    console.log('Station verileri çekildi')
    
    // Process/Types verilerini yeniden çek
    console.log('Process/Types verileri çekiliyor...')
    const processStore = useProcessStore()
    await processStore.findTypes()
    console.log('Process/Types verileri çekildi')
    
    // Device verilerini yeniden çek
    console.log('Device verileri çekiliyor...')
    const deviceStore = useDeviceStore()
    await deviceStore.getDeviceList()
    console.log('Device verileri çekildi')
    
    // Permission verilerini yeniden çek
    console.log('Permission verileri çekiliyor...')
    const permissionStore = usePermissionStore()
    await permissionStore.getAllPermission()
    console.log('Permission verileri çekildi')
    
    // Notification verilerini yeniden çek
    console.log('Notification verileri çekiliyor...')
    const notificationStore = useNotificationStore()
    await notificationStore.fetchNotifications()
    console.log('Notification verileri çekildi')
    
    // User verilerini yeniden çek
    console.log('User verileri çekiliyor...')
    const userStore = useUserStore()
    await userStore.getAllUser()
    console.log('User verileri çekildi')
    
    // Auth user list sync
    console.log('Auth user list senkronize ediliyor...')
    const authStore = useAuthStore()
    await authStore.syncUserListFromServer()
    console.log('Auth user list senkronize edildi')
    
    // Sayfayı yenile
    console.log('Sayfa yenileniyor...')
    /*setTimeout(() => {
      window.location.reload()
    }, 500)*/
    
    toast.add({ 
      color: "success", 
      title: "Başarılı", 
      description: "Tüm ayarlar başarıyla senkronize edildi." 
    })
  } catch (error) {
    console.error('Senkronizasyon hatası:', error)
    toast.add({ 
      color: "error", 
      title: "Hata", 
      description: "Senkronizasyon başarısız oldu. Lütfen daha sonra tekrar deneyin." 
    })
  } finally {
    isSyncing.value = false
  }
}

</script>

<template>
  <UPageCard title="İstasyonu Kaldır"
    description="Bu istasyonu sistemden kaldırabilirsiniz. Ancak istasyon silindiğinde tanımlı bilgilerinde silineceğini ve geri alınamayacağını unutmayın."
    class="bg-linear-to-tl from-error/10 from-5% to-default">
    <template #footer>
      <UModal title="Uyarı" description="Bu istasyonu kaldırmak istediğinize emin misiniz.">
        <UButton label="İstasyonu Kaldır" color="error" />
        <template #body>
          <div class="space-y-4">
            <p>İstasyonu kaldırdığınızda bu işlem geri alınamaz. Devam etmek istediğinize emin misiniz?</p>
            <div class="flex justify-end">
              <UButton label="İstasyonu Kaldır" color="error" @click="remove" loading-auto />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UPageCard>

  <UPageCard title="Bütün Ayarları Senkronize Et"
    description="LocalStorage'ı temizleyip veritabanından en baştan tüm bilgileri çeker. Veritabanında olmayan veriler silinir, yeni veriler eklenir."
    class="mt-4 bg-linear-to-tl from-primary/10 from-5% to-default">
    <template #footer>
      <UModal title="Uyarı" description="Tüm ayarları senkronize etmek istediğinize emin misiniz?">
        <UButton label="Senkronize Et" color="primary" :loading="isSyncing" />
        <template #body>
          <div class="space-y-4">
            <p>Bu işlem localStorage'ı temizleyip veritabanından en baştan tüm bilgileri çekecek. Veritabanında olmayan veriler silinecek, yeni veriler eklenecek. Devam etmek istediğinize emin misiniz?</p>
            <div class="flex justify-end">
              <UButton label="Senkronize Et" color="primary" @click="syncAllData" :loading="isSyncing" />
            </div>
          </div>
        </template>
      </UModal>
    </template>
  </UPageCard>
</template>
