import type { MaybeRefOrGetter } from 'vue'
import type { IProcessSettings, MaterialNotFoundAction } from '~/types/process'

/**
 * Readonly process önizlemesinde "Malzeme Numarası Bulunamadı" davranışını yönetir.
 *
 * - wait: overlay gösterir, operatör "Sayfayı geç" ile ilerler
 * - showAndAdvance: overlay + geri sayım, süre bitince ilerler
 * - autoAdvance: overlay göstermeden hemen ilerler
 */
export function useMaterialNotFoundAdvance(options: {
  showNotFound: MaybeRefOrGetter<boolean>
  settings: MaybeRefOrGetter<IProcessSettings | undefined>
  readonly: MaybeRefOrGetter<boolean | undefined>
  onComplete: () => void
}) {
  const remainingSeconds = ref(0)
  const hasTriggeredAdvance = ref(false)

  let advanceTimeoutId: ReturnType<typeof setTimeout> | null = null
  let countdownIntervalId: ReturnType<typeof setInterval> | null = null

  const action = computed<MaterialNotFoundAction>(() =>
    toValue(options.settings)?.materialNotFoundAction ?? 'wait'
  )

  const delay = computed(() =>
    toValue(options.settings)?.materialNotFoundDelay ?? 10
  )

  const isReadonly = computed(() => !!toValue(options.readonly))
  const isNotFound = computed(() => !!toValue(options.showNotFound))

  /** Overlay yalnızca mesaj gösterilecek aksiyonlarda görünür */
  const displayNotFound = computed(() => {
    if (!isNotFound.value) return false
    if (!isReadonly.value) return true
    return action.value !== 'autoAdvance'
  })

  const isOperatorWait = computed(() =>
    isReadonly.value && isNotFound.value && action.value === 'wait'
  )

  const isCountdown = computed(() =>
    isReadonly.value && isNotFound.value && action.value === 'showAndAdvance'
  )

  function clearTimers() {
    if (advanceTimeoutId) {
      clearTimeout(advanceTimeoutId)
      advanceTimeoutId = null
    }
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId)
      countdownIntervalId = null
    }
    remainingSeconds.value = 0
  }

  function complete() {
    if (hasTriggeredAdvance.value) return
    hasTriggeredAdvance.value = true
    clearTimers()
    options.onComplete()
  }

  function skipNotFound() {
    if (!isReadonly.value) return
    complete()
  }

  function startAdvance(seconds: number) {
    remainingSeconds.value = seconds

    if (seconds <= 0) {
      complete()
      return
    }

    countdownIntervalId = setInterval(() => {
      remainingSeconds.value--
      if (remainingSeconds.value <= 0 && countdownIntervalId) {
        clearInterval(countdownIntervalId)
        countdownIntervalId = null
      }
    }, 1000)

    advanceTimeoutId = setTimeout(() => {
      complete()
    }, seconds * 1000)
  }

  watch(
    [isNotFound, isReadonly, action, delay],
    ([notFound], oldValue) => {
      const wasNotFound = oldValue?.[0] ?? false

      // Yeni bir not-found oturumu: önceki complete flag'ini sıfırla
      if (notFound && !wasNotFound) {
        hasTriggeredAdvance.value = false
      }

      clearTimers()

      if (!isNotFound.value) {
        hasTriggeredAdvance.value = false
        return
      }

      if (!isReadonly.value || hasTriggeredAdvance.value) return

      if (action.value === 'wait') return

      if (action.value === 'autoAdvance') {
        startAdvance(0)
        return
      }

      // showAndAdvance
      startAdvance(delay.value)
    },
    { immediate: true }
  )

  onBeforeUnmount(() => {
    clearTimers()
  })

  return {
    remainingSeconds,
    displayNotFound,
    isOperatorWait,
    isCountdown,
    skipNotFound,
  }
}
