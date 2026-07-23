import { customRef } from 'vue'

const isClient = typeof window !== 'undefined'

export function useAppCookie<T = any>(key: string) {
  return customRef<T | null>((track, trigger) => {
    return {
      get() {
        track()
        if (!isClient) return null
        
        const val = localStorage.getItem(key)
        if (val === null || val === 'null') return null
        if (val === 'undefined') return undefined as any
        if (val === '[object Object]') return null // Bad data'yı temizle
        
        try {
          return JSON.parse(val)
        } catch {
          return val as unknown as T
        }
      },
      set(newValue) {
        if (!isClient) return
        
        if (newValue === null || newValue === undefined) {
          localStorage.removeItem(key)
        } else {
          localStorage.setItem(key, typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue))
        }
        trigger()
      }
    }
  })
}
