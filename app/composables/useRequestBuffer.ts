import { ref } from 'vue'

export interface BufferedRequest {
  id: string
  method: string
  url: string
  data?: any
  headers?: any
  timestamp: number
}

const STORAGE_KEY = 'next-request-buffer'
const isClient = typeof window !== 'undefined'
const pendingRequests = ref<BufferedRequest[]>([])
let isInitialized = false

function persist() {
  if (!isClient) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingRequests.value))
}

function loadFromStorage() {
  if (!isClient) return

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return

  try {
    pendingRequests.value = JSON.parse(stored)
  } catch {
    pendingRequests.value = []
    persist()
  }
}

function ensureInitialized() {
  if (!isClient || isInitialized) return
  loadFromStorage()
  isInitialized = true
}

export const useRequestBuffer = () => {
  ensureInitialized()

  const enqueue = (request: Omit<BufferedRequest, 'id' | 'timestamp'>) => {
    pendingRequests.value.push({
      ...request,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    })
    persist()
  }

  const dequeue = (id: string) => {
    pendingRequests.value = pendingRequests.value.filter(req => req.id !== id)
    persist()
  }

  const clear = () => {
    pendingRequests.value = []
    persist()
  }

  const getRequests = () => {
    return [...pendingRequests.value].sort((a, b) => a.timestamp - b.timestamp)
  }

  return {
    pendingRequests,
    enqueue,
    dequeue,
    clear,
    getRequests
  }
}
