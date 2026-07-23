import type { IStationProcess, IType } from '~/types/process'
import { useStationStore } from '~/store/Station'

export const TYPES_CACHE_KEY = 'Next-Type'

export const DEFAULT_PROCESS_TYPES: IType[] = [
  { id: 1, name: 'T10F', typeCode: 'BB' },
  { id: 2, name: 'CSUV', typeCode: 'AA' }
]

export function getStationId(): number | null {
  return useStationStore().getStation?.id ?? null
}

export function getProcessCacheKey(typeCode: string): string {
  const stationId = getStationId()
  return stationId ? `Next-Process-${typeCode}-${stationId}` : `Next-Process-${typeCode}`
}

export function getTypesCacheKey(): string {
  return TYPES_CACHE_KEY
}

function normalizeTypeItem(item: unknown): IType | null {
  if (!item || typeof item !== 'object') return null

  const obj = item as Record<string, unknown>
  const typeCode = String(obj.typeCode ?? obj.TypeCode ?? '').trim()
  const name = String(obj.name ?? obj.Name ?? typeCode).trim()
  const id = Number(obj.id ?? obj.Id ?? 0)

  if (!typeCode) return null
  return { id, name, typeCode }
}

export function normalizeProcessTypes(value: unknown): IType[] {
  if (!value) return []

  if (typeof value === 'string') {
    try {
      return normalizeProcessTypes(JSON.parse(value))
    } catch {
      return []
    }
  }

  if (Array.isArray(value)) {
    return value.map(normalizeTypeItem).filter((type): type is IType => type !== null)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['data', 'types', 'value', 'result', 'items']) {
      if (Array.isArray(obj[key])) {
        return normalizeProcessTypes(obj[key])
      }
    }
  }

  return []
}

export function loadCachedProcessTypes(): IType[] {
  if (typeof localStorage === 'undefined') return []

  const keys = new Set<string>([TYPES_CACHE_KEY, 'Next-Process-Types'])
  const stationId = getStationId()
  if (stationId != null) {
    keys.add(`Next-Type-${stationId}`)
  }

  for (const key of keys) {
    const raw = localStorage.getItem(key)
    if (!raw || raw === 'null') continue

    try {
      const types = normalizeProcessTypes(JSON.parse(raw))
      if (types.length) {
        if (key !== TYPES_CACHE_KEY) {
          localStorage.setItem(TYPES_CACHE_KEY, JSON.stringify(types))
        }
        return types
      }
    } catch {
      continue
    }
  }

  return []
}

export function seedDefaultProcessTypes(): IType[] {
  const defaults = [...DEFAULT_PROCESS_TYPES]

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(TYPES_CACHE_KEY, JSON.stringify(defaults))
  }

  return defaults
}

export function resolveOfflineProcessTypes(cachedTypes: IType[]): IType[] {
  if (cachedTypes.length) return cachedTypes
  return seedDefaultProcessTypes()
}

function normalizeTypeHint(value: string): string {
  return value.trim().toLowerCase()
}

export function resolveTypeFromHint(typeHint: string, types: IType[]): IType | null {
  const hint = normalizeTypeHint(typeHint)
  if (!hint) return null

  return types.find(type =>
    normalizeTypeHint(type.typeCode) === hint ||
    normalizeTypeHint(type.name) === hint
  ) ?? null
}

export function matchesStationContext(process: IStationProcess | null | undefined): boolean {
  if (!process) return false

  const stationId = getStationId()
  return !!stationId && process.stationId === stationId
}

export function isMissingContainerError(error: unknown): boolean {
  return (error as any)?.response?.status === 404
}

export function isNotFoundError(error: unknown): boolean {
  return (error as any)?.response?.status === 404
}

export function mergeWithLocalProcess(
  serverProcess: IStationProcess,
  localProcess: IStationProcess
): IStationProcess {
  const localMap = new Map(localProcess.processes.map(p => [p.id, p]))
  const serverIds = new Set(serverProcess.processes.map(p => p.id))

  const mergedProcesses = serverProcess.processes.map(sp => {
    const local = localMap.get(sp.id)
    if (!local?.data || local.data === sp.data) return sp
    return {
      ...sp,
      name: local.name ?? sp.name,
      processNumber: local.processNumber ?? sp.processNumber,
      processType: local.processType ?? sp.processType,
      pasif: local.pasif ?? sp.pasif,
      data: local.data
    }
  })

  const pendingLocal = localProcess.processes.filter(p => p.id < 0 || !serverIds.has(p.id))

  return {
    ...serverProcess,
    processes: [...mergedProcesses, ...pendingLocal]
  }
}
