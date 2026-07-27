import { defineStore } from 'pinia'

export interface IShift {
  id: number
  name: string
  startTime: string
  endTime: string
}

export const useShiftStore = defineStore('shift', () => {
  const shifts = ref<IShift[]>([])

  // LocalStorage'dan yükle
  function loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('shifts')
      if (saved) {
        shifts.value = JSON.parse(saved)
      }
    } catch (error) {
      console.error('LocalStorage load error:', error)
    }
  }

  // LocalStorage'a kaydet
  function saveToLocalStorage() {
    try {
      localStorage.setItem('shifts', JSON.stringify(shifts.value))
    } catch (error) {
      console.error('LocalStorage save error:', error)
    }
  }

  async function getShifts() {
    try {
      const { data } = await useAxios().get('Shift/getShifts')
      shifts.value = data
      saveToLocalStorage()
    } catch (error) {
      console.error('Shifts fetch error:', error)
      // API endpoint bulunamazsa, local state'i koru
      if ((error as any).response?.status === 404) {
        console.warn('API endpoint bulunamadı, local state kullanılıyor')
        loadFromLocalStorage()
      }
    }
  }

  async function createShift(shiftData: Omit<IShift, 'id'>) {
    try {
      const { data } = await useAxios().post('Shift/createShift', shiftData)
      shifts.value.push(data)
      saveToLocalStorage()
      return data
    } catch (error) {
      console.error('Shift creation error:', error)
      // API endpoint bulunamazsa, local'e ekle
      if ((error as any).response?.status === 404) {
        const newShift = { ...shiftData, id: Date.now() }
        shifts.value.push(newShift)
        saveToLocalStorage()
        console.warn('API endpoint bulunamadı, local ekleme yapıldı')
        return newShift
      }
      throw error
    }
  }

  async function updateShift(shiftData: IShift) {
    try {
      const { data } = await useAxios().post('Shift/updateShift', shiftData)
      const index = shifts.value.findIndex(s => s.id === shiftData.id)
      if (index > -1) {
        shifts.value[index] = data
      }
      saveToLocalStorage()
      return data
    } catch (error) {
      console.error('Shift update error:', error)
      // API endpoint bulunamazsa, local'de güncelle
      if ((error as any).response?.status === 404) {
        const index = shifts.value.findIndex(s => s.id === shiftData.id)
        if (index > -1) {
          shifts.value[index] = shiftData
        }
        saveToLocalStorage()
        console.warn('API endpoint bulunamadı, local güncelleme yapıldı')
        return shiftData
      }
      throw error
    }
  }

  async function removeShift(shiftId: number) {
    try {
      await useAxios().delete(`Shift/removeShift/${shiftId}`)
      shifts.value = shifts.value.filter(s => s.id !== shiftId)
      saveToLocalStorage()
    } catch (error) {
      console.error('Shift removal error:', error)
      // API endpoint bulunamazsa, sadece local'den sil
      if ((error as any).response?.status === 404) {
        shifts.value = shifts.value.filter(s => s.id !== shiftId)
        saveToLocalStorage()
        console.warn('API endpoint bulunamadı, sadece local silme yapıldı')
      } else {
        throw error
      }
    }
  }

  function getShiftsList() {
    return shifts.value
  }

  // Aktif vardiya bul
  function getActiveShift(): IShift | null {
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    
    for (const shift of shifts.value) {
      const start = parseInt(shift.startTime)
      const end = parseInt(shift.endTime)
      
      // Gece vardiyası için (örn. 23:00 - 07:00)
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return shift
        }
      } else {
        // Normal vardiya
        if (currentTime >= start && currentTime <= end) {
          return shift
        }
      }
    }
    return null
  }

  // Vardiya bitişine kalan dakika
  function getMinutesUntilShiftEnd(): number {
    const activeShift = getActiveShift()
    if (!activeShift) return -1
    
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    const endTime = parseInt(activeShift.endTime)
    
    let endMinutes = Math.floor(endTime / 100) * 60 + (endTime % 100)
    let currentMinutes = now.getHours() * 60 + now.getMinutes()
    
    // Gece vardiyası için
    if (parseInt(activeShift.startTime) > endTime) {
      if (currentTime >= parseInt(activeShift.startTime)) {
        // Ertesi güne geçiş
        endMinutes += 24 * 60
      }
    }
    
    return endMinutes - currentMinutes
  }

  // Başlangıçta localStorage'dan yükle
  loadFromLocalStorage()

  return {
    shifts,
    getShifts,
    createShift,
    updateShift,
    removeShift,
    getShiftsList,
    getActiveShift,
    getMinutesUntilShiftEnd
  }
})
