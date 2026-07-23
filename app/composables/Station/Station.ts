export const useStation = () => {

  const getStation = async () => {

    const settingsLocal = useAppCookie('next-station')
    if (settingsLocal.value) {
      return ref(settingsLocal.value)
    }

    const stationId = useAppCookie('next-station-uid')
    if (stationId.value) {
      try {
        const { data: station } = await useAxios().get(`Station/getStationUID?uid=${stationId.value}`)
        settingsLocal.value = station
        return ref(station)
      } catch (error) {
        throw error;
      }
    }
    throw "İstasyon UID bilgisi Application Next Cookie için tanımlı değil.";
  }

  const stationData = () => {
    const settingsLocal = useAppCookie('next-station')
    return settingsLocal.value
  }

  const setStationData = (data: any) => {
    const settingsLocal = useAppCookie('next-station')
    settingsLocal.value = data
  }

  return { getStation, stationData, setStationData }
}


