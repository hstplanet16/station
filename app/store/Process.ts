import { defineStore } from 'pinia'
import type { IStationProcess, IType } from '~/types/process'
import { useStationStore } from './Station'
import { useNotificationStore } from '~/store/Notification'
import { useSyncStore } from '~/store/Sync'
import { useAPIHelper } from '~/composables/APIHelper'
import { useAppCookie } from '~/composables/useAppCookie'
import { useAxios } from '~/composables/useAxios'
import { useRoute } from '#imports'
import { createDefaultProcessData } from '~/utils/processData'
import { isNetworkError, bufferOfflineRequest } from '~/composables/requestBufferUtils'
import {
  getProcessCacheKey,
  getTypesCacheKey,
  isMissingContainerError,
  isNotFoundError,
  matchesStationContext,
  mergeWithLocalProcess,
  loadCachedProcessTypes,
  normalizeProcessTypes,
  resolveOfflineProcessTypes,
  resolveTypeFromHint
} from '~/utils/processContext'

interface UpdateProcessPayload {
  id: number
  name: string
  processNumber: number
  processType: string
  data: string
}

interface CreateProcessPayload {
  name: string
  processType: string
  processNumber: number
}

export const useProcessStore = defineStore('ProcessStore', {
  state: () => ({
    types: [] as IType[],
    process: undefined as undefined | IStationProcess,
    activeTypeCode: null as string | null,
    loading: false,
    error: null as string | null
  }),
  getters: {
    getTypes: state => normalizeProcessTypes(state.types),
    getProcess: state => state.process,
    isLoading: state => state.loading,
    getError: state => state.error,
    isOnline: () => useSyncStore().isOnline
  },
  actions: {
    getTypeCode() {
      return useRoute().params.type as string
    },
    resolveType(typeHint?: string): IType | null {
      const hint = typeHint ?? this.getTypeCode() ?? this.activeTypeCode
      if (!hint) return null
      if (!this.types.length) {
        return { id: 0, name: hint, typeCode: hint }
      }
      return resolveTypeFromHint(hint, this.types)
    },
    getLocalProcess(typeCode: string) {
      return useAppCookie<IStationProcess>(getProcessCacheKey(typeCode))
    },
    setProcessForType(data: IStationProcess | undefined, typeCode: string) {
      const localProcess = this.getLocalProcess(typeCode)

      if (data && matchesStationContext(data)) {
        localProcess.value = data
        if (this.activeTypeCode === typeCode) {
          this.process = data
        }
        return
      }

      localProcess.value = null
      if (this.activeTypeCode === typeCode) {
        this.process = undefined
      }
    },
    applyLocalProcess(typeCode: string) {
      const localProcess = this.getLocalProcess(typeCode)
      if (matchesStationContext(localProcess.value)) {
        this.setProcessForType(localProcess.value!, typeCode)
        return true
      }

      this.setProcessForType(undefined, typeCode)
      return false
    },
    async getStationProcessByType(typeCode: string) {
      const station = useStationStore()
      return useAxios().get(
        `Process/getStationProcess?stationId=${station.getStation.id}&typeCode=${typeCode}`
      ) as Promise<{ data: IStationProcess }>
    },
    buildCreateRequestBody(payload: CreateProcessPayload, typeCode: string) {
      const station = useStationStore()
      return {
        ...payload,
        pasif: false,
        stationId: station.getStation.id,
        data: createDefaultProcessData(payload.processType as any),
        type: typeCode,
        typeCode
      }
    },
    async findTypes() {
      this.loading = true
      this.error = null

      const localType = useAppCookie(getTypesCacheKey())
      const cachedTypes = loadCachedProcessTypes()
      if (cachedTypes.length) {
        this.types = cachedTypes
      } else if (localType.value) {
        localType.value = null
      }

      const canReachServer = typeof navigator === 'undefined' || navigator.onLine
      if (!canReachServer) {
        this.types = resolveOfflineProcessTypes(this.types)
        localType.value = this.types
        this.loading = false
        return
      }

      try {
        const { data } = await useAxios().get('Process/getTypes', { timeout: 8000 })
        const types = normalizeProcessTypes(data)

        if (types.length) {
          this.types = types
          localType.value = types
          useSyncStore().setOnline(true)
        } else if (!this.types.length) {
          this.error = 'İşlem tipleri alınamadı.'
        }
      } catch (error: any) {
        if (isNetworkError(error)) {
          useSyncStore().setOnline(false)
          if (!this.types.length) {
            this.types = resolveOfflineProcessTypes([])
            localType.value = this.types
          }
        } else if (!this.types.length) {
          this.error = useAPIHelper().ErrorConvert(error)
        }
      } finally {
        this.loading = false
      }
    },
    async findProcess(typeHint: string, options?: { silent?: boolean }) {
      if (!this.types.length) {
        await this.findTypes()
      }

      const type = this.resolveType(typeHint)
      const typeCode = type?.typeCode ?? typeHint
      const silent = options?.silent ?? false

      this.activeTypeCode = typeCode
      this.error = null

      if (!silent) {
        this.loading = true
        this.process = undefined
      }

      if (!this.isOnline) {
        this.applyLocalProcess(typeCode)
        if (!silent) {
          this.loading = false
        }
        return
      }

      try {
        const { data: process } = await this.getStationProcessByType(typeCode)

        if (this.activeTypeCode !== typeCode) return

        const localProcess = this.getLocalProcess(typeCode).value
        const merged = process && matchesStationContext(localProcess)
          ? mergeWithLocalProcess(process, localProcess!)
          : process

        this.setProcessForType(merged ?? undefined, typeCode)
      } catch (error: any) {
        if (this.activeTypeCode !== typeCode) return

        if (isNetworkError(error)) {
          useSyncStore().setOnline(false)
          this.applyLocalProcess(typeCode)
        } else if (isMissingContainerError(error)) {
          this.setProcessForType(undefined, typeCode)
        } else {
          this.error = useAPIHelper().ErrorConvert(error)
          this.applyLocalProcess(typeCode)
        }
      } finally {
        if (!silent && this.activeTypeCode === typeCode) {
          this.loading = false
        }
      }
    },
    updateProcessLocally(payload: UpdateProcessPayload) {
      if (!this.process?.processes || !this.activeTypeCode) return
      const index = this.process.processes.findIndex(p => p.id === payload.id)
      if (index === -1) return

      const existing = this.process.processes[index]
      if (!existing) return

      this.process.processes[index] = {
        ...existing,
        name: payload.name,
        processNumber: payload.processNumber,
        processType: payload.processType,
        data: payload.data
      }
      this.setProcessForType({ ...this.process }, this.activeTypeCode)
    },
    createProcessOffline(payload: CreateProcessPayload, explicitTypeHint?: string) {
      const type = this.resolveType(explicitTypeHint ?? this.getTypeCode())
      const typeCode = type?.typeCode ?? explicitTypeHint ?? this.getTypeCode()
      if (!typeCode) return

      const stationId = useStationStore().getStation?.id
      if (!stationId) return

      this.activeTypeCode = typeCode

      const localProcess = this.getLocalProcess(typeCode)
      const baseProcess = matchesStationContext(localProcess.value)
        ? localProcess.value!
        : (matchesStationContext(this.process) && this.activeTypeCode === typeCode && this.process
          ? this.process
          : {
            id: -1,
            stationId,
            uid: crypto.randomUUID(),
            typeId: type?.id ?? 0,
            processes: []
          })

      const tempId = -Date.now()
      const defaultData = createDefaultProcessData(payload.processType as any)
      const newProcess = {
        id: tempId,
        name: payload.name,
        processType: payload.processType,
        processNumber: payload.processNumber,
        pasif: false,
        data: defaultData
      }
      const updated: IStationProcess = {
        ...baseProcess,
        processes: [...(baseProcess.processes ?? []), newProcess]
      }

      this.setProcessForType(updated, typeCode)
      useNotificationStore().addLog(`Çevrimdışı: "${payload.name}" yerel olarak eklendi.`, 'info')
    },
    async createProcess(payload: CreateProcessPayload, explicitTypeHint?: string) {
      if (!this.types.length) {
        await this.findTypes()
      }

      const type = this.resolveType(explicitTypeHint ?? this.getTypeCode())
      const typeCode = type?.typeCode ?? explicitTypeHint ?? this.getTypeCode()
      if (!typeCode) {
        throw new Error('Geçersiz işlem tipi seçildi.')
      }

      const requestBody = this.buildCreateRequestBody(payload, typeCode)

      if (!this.isOnline) {
        this.createProcessOffline(payload, typeCode)
        bufferOfflineRequest('POST', 'Process/createProcess', requestBody)
        throw { isOffline: true, message: 'Çevrimdışı: İstek sıraya alındı.' }
      }

      try {
        await useAxios().post('Process/createProcess', requestBody)
        await this.findProcess(typeCode, { silent: true })
        useNotificationStore().addLog(`Yeni iş adımı eklendi: ${payload.name}`, 'success')
      } catch (error: any) {
        if (error.isOffline || isNetworkError(error)) {
          useSyncStore().setOnline(false)
          this.createProcessOffline(payload, typeCode)
          throw { isOffline: true, message: 'Çevrimdışı: İstek sıraya alındı.' }
        }
        throw error instanceof Error ? error : useAPIHelper().ErrorConvert(error)
      }
    },
    async updateProcess(payload: UpdateProcessPayload, explicitTypeHint?: string) {
      const type = this.resolveType(explicitTypeHint ?? this.getTypeCode())
      const typeCode = type?.typeCode ?? explicitTypeHint ?? this.getTypeCode()
      if (!typeCode) throw new Error('Geçersiz işlem tipi seçildi.')

      this.updateProcessLocally(payload)

      if (!this.isOnline) {
        useNotificationStore().addLog(`"${payload.name}" yerel olarak kaydedildi.`, 'info')
        return
      }

      const station = useStationStore()
      const existingProcess = this.process?.processes?.find(p => p.id === payload.id)
      const pasif = existingProcess?.pasif ?? false

      // Parse data JSON to extract settings
      let dataObj: any = {}
      let settingsStr = ''
      try {
        dataObj = JSON.parse(payload.data)
        settingsStr = JSON.stringify(dataObj.settings || {})
        // Remove settings from data
        const { settings, ...dataWithoutSettings } = dataObj
        dataObj = dataWithoutSettings
      } catch (e) {
        // If parsing fails, use original data
        dataObj = payload.data
      }

      const requestBody = {
        id: payload.id,
        name: payload.name,
        processType: payload.processType,
        processNumber: payload.processNumber,
        pasif: pasif,
        stationId: station.getStation.id,
        data: typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj),
        settings: settingsStr,
        type: typeCode
      }

      try {
        await useAxios().post('Process/updateProcess', requestBody)
        await this.findProcess(typeCode, { silent: true })
        useNotificationStore().addLog(`İş adımı güncellendi: ${payload.name}`, 'success')
      } catch (error: any) {
        if (isNotFoundError(error)) {
          useNotificationStore().addLog(`Hata: İş adımı bulunamadı (ID: ${payload.id})`, 'error')
          throw new Error('İş adımı bulunamadı')
        }
        if (error.isOffline || isNetworkError(error)) {
          useSyncStore().setOnline(false)
          useNotificationStore().addLog(`Çevrimdışı: "${payload.name}" yerel olarak kaydedildi.`, 'info')
          return
        }
        throw error instanceof Error ? error : useAPIHelper().ErrorConvert(error)
      }
    },
    async changeActivePassive(id: number) {
      const type = this.resolveType(this.getTypeCode())
      const typeCode = type?.typeCode ?? this.getTypeCode()
      if (!typeCode) return

      if (!this.isOnline) {
        this.toggleActiveLocally(id)
        throw { isOffline: true, message: 'Çevrimdışı: Değişiklik yerel olarak kaydedildi.' }
      }

      try {
        await useAxios().get(`Process/changeActivePassive?Id=${id}`)
        await this.findProcess(typeCode, { silent: true })
      } catch (error: any) {
        if (error.isOffline || isNetworkError(error)) {
          useSyncStore().setOnline(false)
          this.toggleActiveLocally(id)
          throw { isOffline: true, message: 'Çevrimdışı: Değişiklik yerel olarak kaydedildi.' }
        }
        throw error instanceof Error ? error : useAPIHelper().ErrorConvert(error)
      }
    },
    toggleActiveLocally(id: number) {
      if (!this.process?.processes || !this.activeTypeCode) return

      const index = this.process.processes.findIndex(p => p.id === id)
      if (index === -1) return

      const existing = this.process.processes[index]
      if (!existing) return

      existing.pasif = !existing.pasif
      this.setProcessForType({ ...this.process }, this.activeTypeCode)
    },
    async removeProcess(id: number) {
      const type = this.resolveType(this.getTypeCode())
      const typeCode = type?.typeCode ?? this.getTypeCode()
      if (!typeCode) return

      const removedName = this.process?.processes?.find(p => p.id === id)?.name

      this.removeProcessLocally(id)

      if (!this.isOnline) {
        bufferOfflineRequest('DELETE', `Process/removeProcess?Id=${id}`)
        useNotificationStore().addLog(
          removedName ? `Çevrimdışı: "${removedName}" yerel olarak silindi.` : 'Çevrimdışı: İş adımı yerel olarak silindi.',
          'info'
        )
        throw { isOffline: true, message: 'Çevrimdışı: İstek sıraya alındı.' }
      }

      try {
        await useAxios().delete(`Process/removeProcess?Id=${id}`)
        await this.findProcess(typeCode, { silent: true })
        useNotificationStore().addLog(
          removedName ? `İş adımı silindi: ${removedName}` : `İş adımı silindi (ID: ${id})`,
          'info'
        )
      } catch (error: any) {
        if (error.isOffline || isNetworkError(error)) {
          useSyncStore().setOnline(false)
          bufferOfflineRequest('DELETE', `Process/removeProcess?Id=${id}`)
          useNotificationStore().addLog(
            removedName ? `Çevrimdışı: "${removedName}" yerel olarak silindi.` : 'Çevrimdışı: İş adımı yerel olarak silindi.',
            'info'
          )
          throw { isOffline: true, message: 'Çevrimdışı: İstek sıraya alındı.' }
        }
        throw error instanceof Error ? error : useAPIHelper().ErrorConvert(error)
      }
    },
    removeProcessLocally(id: number) {
      if (!this.process?.processes || !this.activeTypeCode) return

      const updated: IStationProcess = {
        ...this.process,
        processes: this.process.processes.filter(p => p.id !== id)
      }
      this.setProcessForType(updated, this.activeTypeCode)
    },
    async createType(type: IType) {
      try {
        const { data } = await useAxios().post("process/typeCreate", type)
        this.types.push(data)
        const typeData = useAppCookie("Next-Type")
        typeData.value = JSON.stringify(this.types)
        useNotificationStore().addLog(`${data.name} tipi başarıyla sisteme eklendi.`, "success")
        useToast().add({ title: "Başarılı", description: `${data.name} tipi başarıyla sisteme eklendi.`, color: "success" })
      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: "error" })
        useNotificationStore().addLog(message, "error")
      }
    },
    async removeType(type: IType) {
      try {
        const { data } = await useAxios().delete(`process/typeRemove?id=${type.id}`)
        const index = this.types.findIndex(e => e.id == data.id)
        if (index > -1) {
          this.types.splice(index, 1)
          const typeData = useAppCookie("Next-Type")
          typeData.value = JSON.stringify(this.types)
          useNotificationStore().addLog(`${data.name} tipi başarıyla sistemden silindi.`, "success")
          useToast().add({ title: "Başarılı", description: `${data.name} tipi başarıyla sistemden silindi.`, color: "success" })
        }

      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: "error" })
        useNotificationStore().addLog(message, "error")
      }
    },
    async editType(type: IType) {
      try {
        const { data } = await useAxios().post("process/typeEdit", type)
        const index = this.types.findIndex(e => e.id == data.id)
        if (index > -1) {
          this.types[index] = data
          const typeData = useAppCookie("Next-Type")
          typeData.value = JSON.stringify(this.types)
          useNotificationStore().addLog(`${data.name} tipi başarıyla güncellendi.`, "success")
          useToast().add({ title: "Başarılı", description: `${data.name} tipi başarıyla güncellendi.`, color: "success" })
        }
      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: "error" })
        useNotificationStore().addLog(message, "error")
      }
    },
    async transferProcesses(sourceTypeCode: string, targetTypeCode: string) {
      if (!this.isOnline) {
        throw new Error('Çevrimdışı modda veri transferi yapılamaz.')
      }

      try {
        // Get source processes
        const sourceProcess = await this.getStationProcessByType(sourceTypeCode)
        if (!sourceProcess?.data?.processes || sourceProcess.data.processes.length === 0) {
          throw new Error('Kaynak tipte transfer edilecek işlem adımı bulunamadı.')
        }

        // Get target processes to avoid duplicates (handle 404 error)
        let targetProcessIds = new Set<number>()
        try {
          const targetProcess = await this.getStationProcessByType(targetTypeCode)
          targetProcessIds = new Set(targetProcess?.data?.processes?.map(p => p.id) || [])
        } catch (error: any) {
          // If target type doesn't have any processes yet, that's fine
          console.log('Hedef tip için işlem listesi bulunamadı, yeni işlemler oluşturulacak')
        }

        // Transfer each process
        const station = useStationStore()
        let transferredCount = 0

        for (const process of sourceProcess.data.processes) {
          // Skip if already exists in target
          if (targetProcessIds.has(process.id)) {
            continue
          }

          // Parse data JSON to extract settings (similar to updateProcess)
          let dataObj: any = {}
          let settingsStr = ''
          try {
            dataObj = JSON.parse(process.data)
            
            // Settings data içinde yoksa, process objesinde kontrol et
            if (!dataObj.settings) {
              if (process.settings) {
                settingsStr = process.settings
              } else {
                // Default settings kullan
                const defaultSettings = {
                  materialNotFoundAction: "showAndAdvance",
                  materialNotFoundDelay: 10,
                  materialNotFoundMessage: "Malzeme Numarası Bulunamadı. Lütfen takım lideriniz ile iletişime geçin. Bu ürün VIN içerisinde tanımlı değil.",
                  onSuccessAction: "autoAdvance",
                  onSuccessDelay: 1,
                  timeout: 120,
                  retryCount: 3,
                  skipOnError: false
                }
                settingsStr = JSON.stringify(defaultSettings)
              }
            } else {
              settingsStr = JSON.stringify(dataObj.settings || {})
              
              // Remove settings from data
              const { settings, ...dataWithoutSettings } = dataObj
              dataObj = dataWithoutSettings
            }
          } catch (e) {
            // If parsing fails, use original data
            dataObj = process.data
            // Default settings kullan
            const defaultSettings = {
              materialNotFoundAction: "showAndAdvance",
              materialNotFoundDelay: 10,
              materialNotFoundMessage: "Malzeme Numarası Bulunamadı. Lütfen takım lideriniz ile iletişime geçin. Bu ürün VIN içerisinde tanımlı değil.",
              onSuccessAction: "autoAdvance",
              onSuccessDelay: 1,
              timeout: 120,
              retryCount: 3,
              skipOnError: false
            }
            settingsStr = JSON.stringify(defaultSettings)
          }

          const requestBody = {
            name: process.name,
            processType: process.processType,
            processNumber: process.processNumber,
            pasif: process.pasif || false,
            stationId: station.getStation.id,
            data: typeof dataObj === 'string' ? dataObj : JSON.stringify(dataObj),
            settings: settingsStr,
            type: targetTypeCode,
            typeCode: targetTypeCode
          }

          await useAxios().post('Process/createProcess', requestBody)
          transferredCount++
        }

        // Refresh target type processes
        try {
          await this.findProcess(targetTypeCode, { silent: true })
        } catch (error) {
          // If refresh fails, that's okay - the processes were created
          console.log('Hedef tip yenileme başarısız, ama işlemler oluşturuldu')
        }
        
        useNotificationStore().addLog(`${transferredCount} işlem adımı ${targetTypeCode} tipine transfer edildi.`, 'success')
        return transferredCount
      } catch (error: any) {
        if (isNetworkError(error)) {
          useSyncStore().setOnline(false)
          throw new Error('Ağ hatası: Veri transferi başarısız oldu.')
        }
        throw error instanceof Error ? error : useAPIHelper().ErrorConvert(error)
      }
    },
  }
})
