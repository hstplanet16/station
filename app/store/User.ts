import { defineStore } from 'pinia'
import type { IUser } from '~/types/user'

export const useUserStore = defineStore('UserStore', {
  state: () => ({
    users: [] as IUser[]
  }),
  getters: {
    getUsers: state => state.users,
  },
  actions: {
    async getAllUser() {
      try {
        const { data } = await useAxios().get("user/getAllUsers")
        this.users = data
      } catch (error) {

        const storeUserList = localStorage.getItem("next-user-list") || "[]"
        this.users = JSON.parse(storeUserList)

        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: 'error' })
      }
    },
    async create(userData: IUser) {
      try {
        const { data } = await useAxios().post("user/create", userData)
        this.users.push(data)
        localStorage.setItem("next-user-list", JSON.stringify(this.users))
      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: 'error' })
      }
    },
    async edit(userData: IUser) {
      try {
        const { data } = await useAxios().post("user/edit", userData)
        const index = this.users.findIndex(e => e.id == data.id)
        if (index > -1) {
          this.users[index] = data
        }
        localStorage.setItem("next-user-list", JSON.stringify(this.users))
      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: 'error' })
      }
    },
    async remove(userData: IUser) {
      try {
        const { data } = await useAxios().delete(`user/remove?id=${userData.id}`)
        const index = this.users.findIndex(e => e.id == data.id)
        if (index > -1) {
          this.users.splice(index, 1)
        }
        localStorage.setItem("next-user-list", JSON.stringify(this.users))
      } catch (error) {
        const message = useAPIHelper().ErrorConvert(error)
        useToast().add({ title: "Hata", description: message, color: 'error' })
      }
    },
  }
})

