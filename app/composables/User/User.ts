export const useUser = () => {

  const UserData : any = () => {
    const user = useAppCookie("next-user")
    if (!user.value) return navigateTo("/auth/login")

    return user.value
  }


  return { UserData }
}


