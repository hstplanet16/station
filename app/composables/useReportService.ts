import { useAuthStore } from "~/store/Auth"
import { useNotificationStore } from "~/store/Notification"
import { useProcessStore } from "~/store/Process"
import { useStationStore } from "~/store/Station"

export const useReportService = () => {

  const stationStore = useStationStore()
  const authStore = useAuthStore()

  const ProcessStepReport = async (request: Function) => {
    try {
      const processLocal = useAppCookie("next-process").value
      const processStore = useProcessStore()
      const route = useRoute()
      if (processLocal && processStore.getProcess && processStore.getProcess.processes.length > 0 && route.params.processStep) {
        const processStep = route.params.processStep;
        const process = processStore.getProcess.processes.find(e => e.processNumber.toString() == processStep)
        request({
          processId: process?.id,
          processReportId: processLocal.id,
          result: "İşlem Bekleniyor",
        });

      }
    } catch (error) {
      const message = useAPIHelper().ErrorConvert(error)
      useNotificationStore().addLog(`İşlem adımı için rapor oluşturulurken hata oluştu : ${message}`, "error")
    }
  }

  const createReport = async (materialCode?: string) => {
    await ProcessStepReport(async (e: any) => {
      console.log({ ...e, materialCode : materialCode });
      
      const { data } = await useAxios().post("Report/createProcessStepReport", { ...e, materialCode : materialCode })
    })
  }

  const updateReport = async (updateData: any) => {
    await ProcessStepReport(async (e: any) => {
      const { data } = await useAxios().post("Report/updateProcessStepReport", {
        ...e,
        ...updateData
      })
    })
  }

  const createProcessReport = async (vin: string) => {
    const { data: processReport } = await useAxios().post(`Report/createProcessReport`, {
      result: "Bekleniyor",
      StationId: stationStore.getStation.id,
      UsersId: authStore.getUser.id,
      vin: vin
    })

    const localProcess = useAppCookie("next-process")
    localProcess.value = processReport
  }

  const updateProcessReport = async (vin: string) => {
    const { data: processReport } = await useAxios().post(`Report/updateProcessReport`, {
      result: "OK",
      vin: vin
    })

    const localProcess = useAppCookie("next-process")
    localProcess.value = processReport
  }

  return { createReport, updateReport, createProcessReport, updateProcessReport }
}
