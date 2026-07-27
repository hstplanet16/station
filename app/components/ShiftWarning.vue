<script setup lang="ts">
import { useShiftStore } from '~/store/Shift'
import { useAuthStore } from '~/store/Auth'

const shiftStore = useShiftStore()
const authStore = useAuthStore()

const showWarning = ref(false)
const showAutoLogout = ref(false)
const minutesRemaining = ref(0)

let checkInterval: ReturnType<typeof setInterval> | null = null

function checkShiftTime() {
  const activeShift = shiftStore.getActiveShift()
  
  if (!activeShift) {
    // Aktif vardiya yok, hiçbir şey yapma
    return
  }
  
  const minutesUntilEnd = shiftStore.getMinutesUntilShiftEnd()
  
  if (minutesUntilEnd <= 0) {
    // Vardiya bitti, otomatik çıkış
    showAutoLogout.value = true
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
    }
    setTimeout(() => {
      authStore.logout()
      navigateTo('/auth/login')
    }, 5000) // 5 saniye sonra çıkış
  } else if (minutesUntilEnd <= 5) {
    // 5 dakika veya daha az kaldı, uyarı göster
    if (!showWarning.value) {
      showWarning.value = true
      minutesRemaining.value = minutesUntilEnd
      
      // 5 saniye sonra uyarıyı kapat
      setTimeout(() => {
        showWarning.value = false
      }, 5000)
    }
  } else {
    // Uyarıyı kapat
    showWarning.value = false
  }
}

onMounted(() => {
  // Her dakika kontrol et
  checkInterval = setInterval(checkShiftTime, 60000)
  // İlk kontrol
  checkShiftTime()
})

onBeforeUnmount(() => {
  if (checkInterval) {
    clearInterval(checkInterval)
  }
})
</script>

<template>
  <!-- 5 dakika uyarısı -->
  <UModal v-model:open="showWarning" :ui="{ footer: 'hidden' }">
    <template #body>
      <div class="text-center space-y-4">
        <div class="text-6xl">⏰</div>
        <h3 class="text-xl font-semibold">Vardiya Bitiyor!</h3>
        <p class="text-muted">
          Vardiyanın bitmesine <span class="font-bold text-highlighted">{{ minutesRemaining }}</span> dakika kaldı.
        </p>
        <p class="text-sm text-muted">
          Lütfen işlerinizi tamamlayın.
        </p>
      </div>
    </template>
  </UModal>

  <!-- Otomatik çıkış uyarısı -->
  <UModal v-model:open="showAutoLogout" :close="false" :ui="{ footer: 'hidden' }">
    <template #body>
      <div class="text-center space-y-4">
        <div class="text-6xl">🚪</div>
        <h3 class="text-xl font-semibold">Vardiya Bitti</h3>
        <p class="text-muted">
          Vardiya süresi doldu. Tüm oturumlar kapatılıyor...
        </p>
        <div class="flex justify-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </template>
  </UModal>
</template>
