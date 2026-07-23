import { defineStore } from 'pinia'
import { useAPIHelper } from '~/composables/APIHelper'
import { useAppCookie } from '~/composables/useAppCookie'
import { useAxios } from '~/composables/useAxios'
import { useNotificationStore } from '~/store/Notification'
import { useStationStore } from '~/store/Station'
import { navigateTo } from '#imports'

export const useAuthStore = defineStore('AuthStore', {
  state: () => ({
    user: undefined as any
  }),
  getters: {
    getUser: state => {
       if (!state.user) {
          const cookieUser = useAppCookie("next-user")
          return cookieUser.value
       }
       return state.user
    },
    isLoggedIn: state => {
       const cookieUser = useAppCookie("next-user")
       return !!cookieUser.value || !!state.user
    }
  },
  actions: {
    LocalStoreLoginUserName(username: string, password: string) {
      const userList = useAppCookie("next-user-list")
      if (!userList.value?.length) return false

      const findUser = userList.value.find((e: any) => e.userName == username && e.password == password)
      if (findUser) {
        const user = useAppCookie("next-user")
        user.value = findUser
        this.user = findUser
        useNotificationStore().addLog(`Kullanıcı sisteme giriş yaptı: ${findUser.userName ?? username}`, 'success')
        return true
      }
      return false
    },
    async syncUserListFromServer() {
      const userList = useAppCookie('next-user-list')
      if (userList.value?.length) return

      const station = useStationStore().getStation
      if (!station?.id) return

      try {
        const { data: permissions } = await useAxios().get(`StationPermission/getPermissions?stationId=${station.id}`)
        const users = (permissions ?? []).map((p: any) => p.user).filter(Boolean)
        if (users.length) userList.value = users
      } catch {
        // ignore
      }
    },
    async loginWithUsernameandPassword(username: string, password: string) {
      try {
        await this.syncUserListFromServer()

        const localLogin = this.LocalStoreLoginUserName(username, password)
        if (localLogin) return

        const { data } = await useAxios().get(`Auth/UserNameAndPassword?username=${username}&password=${password}`)
        const user = useAppCookie("next-user")
        user.value = data
        this.user = data
        useNotificationStore().addLog(`Kullanıcı sisteme giriş yaptı: ${data.userName ?? username}`, 'success')
      } catch (error) {
        console.log(error);
        throw useAPIHelper().ErrorConvert(error)
      }
    },
    async loginWithCardNumber(cardNumber: string) {
      try {
        await this.syncUserListFromServer()

        const userList = useAppCookie('next-user-list')
        const localUser = userList.value?.find((e: any) => e.cardNumber == cardNumber)
        if (localUser) {
          const user = useAppCookie('next-user')
          user.value = localUser
          this.user = localUser
          useNotificationStore().addLog(`Kullanıcı kart ile giriş yaptı: ${localUser.userName ?? cardNumber}`, 'success')
          return
        }

        const { data } = await useAxios().get(`Auth/CardNumber?cardnumber=${cardNumber}`)
        const user = useAppCookie("next-user")
        user.value = data
        this.user = data
        useNotificationStore().addLog(`Kullanıcı kart ile giriş yaptı: ${data.userName ?? cardNumber}`, 'success')
      } catch (error) {
        throw useAPIHelper().ErrorConvert(error)
      }
    },
    logout() {
      const userName = this.getUser?.userName ?? 'Kullanıcı'
      const user = useAppCookie("next-user")
      user.value = undefined
      this.user = undefined
      useNotificationStore().addLog(`${userName} sistemden çıkış yaptı`, 'info')
      navigateTo('/auth/login')
    }
  }
})
