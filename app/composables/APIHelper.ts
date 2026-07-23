import axios from "axios"

export const useAPIHelper = () => {
  const ErrorConvert = (error: unknown) => {
    if (axios.isAxiosError(error)) {
      return error.response?.data ?? error.message
    }

    if (typeof error === "string") {
      return error
    }

    if (error instanceof Error) {
      return error.message
    }

    return "Bilinmeyen bir hata oluştu."
  }

  return { ErrorConvert }
}
