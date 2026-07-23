import type { Ref } from 'vue'
import type { IProcess, IProcessStepData, ProcessType } from '~/types/process'
import { useProcessStore } from '~/store/Process'
import {
  getProcessStepData,
  mergeProcessStepData,
  serializeProcessData
} from '~/utils/processData'
import { useNotificationStore } from '~/store/Notification'

export function useProcessStep(process: Ref<IProcess>) {
  const processStore = useProcessStore()
  const toast = useToast()
  const route = useRoute()

  const processType = computed(() => process.value.processType as ProcessType)

  const stepData = computed<IProcessStepData>(() =>
    getProcessStepData(process.value)
  )

  const saving = ref(false)

  async function saveData(data: IProcessStepData) {
    saving.value = true
    try {
      await processStore.updateProcess({
        id: process.value.id,
        name: process.value.name,
        processNumber: process.value.processNumber,
        processType: process.value.processType,
        data: serializeProcessData(data, processType.value)
      }, route.params.type as string)
    } catch (error: any) {
      toast.add({ title: 'Hata', description: String(error), color: 'error' })
    } finally {
      saving.value = false
    }
  }

  async function updateField(partial: Partial<IProcessStepData>) {
    const merged = mergeProcessStepData(process.value, partial)
    await saveData(merged)
  }



  return { stepData, saving, saveData, updateField}
}
