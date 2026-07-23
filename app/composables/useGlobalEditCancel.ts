type CancelHandler = () => void

const handlers = new Set<CancelHandler>()
let listenerRegistered = false

function onEscape(e: KeyboardEvent) {
  if (e.key !== 'Escape' || handlers.size === 0) return

  handlers.forEach(handler => handler())
  e.preventDefault()
  e.stopPropagation()
}

function ensureListener() {
  if (listenerRegistered || typeof window === 'undefined') return
  listenerRegistered = true
  window.addEventListener('keydown', onEscape, true)
}

export function registerEditCancel(handler: CancelHandler) {
  handlers.add(handler)
  ensureListener()
  return () => {
    handlers.delete(handler)
  }
}

export function useGlobalEditCancel(handler: CancelHandler, active: Ref<boolean>) {
  let unregister: (() => void) | null = null

  watch(active, (isActive) => {
    unregister?.()
    unregister = null
    if (isActive) {
      unregister = registerEditCancel(handler)
    }
  }, { immediate: true })

  onBeforeUnmount(() => {
    unregister?.()
  })
}
