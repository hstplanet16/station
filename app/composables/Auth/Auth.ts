import { useNotificationStore } from '~/store/Notification'

export const useAuth = () => {
  const notificationStore = useNotificationStore()

  const { writeValue } = usePLC()

  const syncUserListFromServer = async () => {
    const userList = useAppCookie('next-user-list')
    if (userList.value?.length) return

    const station = useAppCookie('next-station').value
    if (!station?.id) return

    try {
      const { data: permissions } = await useAxios().get(`StationPermission/getPermissions?stationId=${station.id}`)
      const users = (permissions ?? []).map((p: any) => p.user).filter(Boolean)
      if (users.length) {
        userList.value = users
      }
    } catch {
      // Çevrimdışı veya sunucu hatası — API girişi denenebilir
    }
  }

  const mergeUserIntoList = (userData: any) => {
    if (!userData?.id) return

    const userList = useAppCookie('next-user-list')
    const existing = userList.value ?? []
    const index = existing.findIndex((e: any) => e.id === userData.id)

    if (index >= 0) {
      const updated = [...existing]
      updated[index] = userData
      userList.value = updated
    } else {
      userList.value = [...existing, userData]
    }
  }

  const tryLocalLogin = (username: string, password: string) => {
    const userList = useAppCookie('next-user-list')
    if (!userList.value?.length) return false

    const findUser = userList.value.find((e: any) => e.userName == username && e.password == password)
    if (!findUser) return false

    useAppCookie('next-user').value = findUser
    writeValue("Persoel_Ad_Soyad", findUser.displayName)
    notificationStore.addLog(`Kullanıcı sisteme giriş yaptı: ${findUser.userName ?? username}`, 'success')
    return true
  }

  const loginWithUsernameandPassword = async (username: string, password: string) => {
    await syncUserListFromServer()

    if (tryLocalLogin(username, password)) return

    try {
      const { data } = await useAxios().get(`Auth/UserNameAndPassword?username=${username}&password=${password}`)
      useAppCookie('next-user').value = data
      writeValue("Persoel_Ad_Soyad", data.displayName)
      mergeUserIntoList(data)
      notificationStore.addLog(`Kullanıcı sisteme giriş yaptı: ${data.userName ?? username}`, 'success')
    } catch (error) {
      console.log(error)
      throw useAPIHelper().ErrorConvert(error)
    }
  }

  const loginWithCardNumber = async (cardNumber: string) => {
    await syncUserListFromServer()

    const userList = useAppCookie('next-user-list')
    const localUser = userList.value?.find((e: any) => e.cardNumber == cardNumber)
    if (localUser) {
      useAppCookie('next-user').value = localUser
      writeValue("Persoel_Ad_Soyad", localUser.displayName)
      notificationStore.addLog(`Kullanıcı kart ile giriş yaptı: ${localUser.userName ?? cardNumber}`, 'success')
      return
    }

    try {
      const { data } = await useAxios().get(`Auth/CardNumber?cardnumber=${cardNumber}`)
      useAppCookie('next-user').value = data
      writeValue("Persoel_Ad_Soyad", data.displayName)
      mergeUserIntoList(data)
      notificationStore.addLog(`Kullanıcı kart ile giriş yaptı: ${data.userName ?? cardNumber}`, 'success')
    } catch (error) {
      throw useAPIHelper().ErrorConvert(error)
    }
  }

  const logout = () => {
    const user = useAppCookie('next-user')
    const userName = user.value?.userName ?? user.value?.displayName ?? 'Kullanıcı'
    user.value = undefined
    writeValue("Persoel_Ad_Soyad", "")
    notificationStore.addLog(`${userName} sistemden çıkış yaptı`, 'info')
  }

  return { loginWithUsernameandPassword, loginWithCardNumber, logout, syncUserListFromServer }
}
