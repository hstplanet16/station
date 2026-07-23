import type {
  IBarcodeItem,
  IBarcodeStepData,
  IGeneralStepData,
  IProcess,
  IProcessImageRef,
  IProcessSettings,
  IProcessStepData,
  IScrewPoint,
  IScrewItem,
  IScrewStepData,
  IServerStepData,
  ProcessType
} from '~/types/process'

export function defaultSettings(): IProcessSettings {
  return {
    materialNotFoundAction: 'showAndAdvance',
    materialNotFoundDelay: 10,
    materialNotFoundMessage: 'Malzeme Numarası Bulunamadı. Lütfen takım lideriniz ile iletişime geçin. Bu ürün VIN içerisinde tanımlı değil.',
    onSuccessAction: 'autoAdvance',
    onSuccessDelay: 3,
    timeout: 120,
    retryCount: 3,
    skipOnError: false
  }
}

function textOrDefault(value: string | undefined, fallback: string): string {
  return value?.trim() ? value : fallback
}

function mergeBaseStepData<T extends IProcessStepData>(
  parsed: Partial<T>,
  defaults: T
): T {
  return {
    ...defaults,
    ...parsed,
    settings: { ...defaults.settings, ...parsed.settings },
    imageRefs: parsed.imageRefs ?? defaults.imageRefs
  } as T
}

function mergeBarcodeStepData(
  parsed: Partial<IBarcodeStepData>,
  defaults: IBarcodeStepData
): IBarcodeStepData {
  return {
    ...mergeBaseStepData(parsed, defaults),
    title: textOrDefault(parsed.title, defaults.title),
    description: textOrDefault(parsed.description, defaults.description),
    scannedLabel: parsed.scannedLabel ?? defaults.scannedLabel,
    barcodes: parsed.barcodes ?? defaults.barcodes
  }
}

function mergeScrewStepData(
  parsed: Partial<IScrewStepData>,
  defaults: IScrewStepData
): IScrewStepData {
  return {
    ...mergeBaseStepData(parsed, defaults),
    title: textOrDefault(parsed.title, defaults.title),
    description: textOrDefault(parsed.description, defaults.description),
    scannedLabel: parsed.scannedLabel ?? defaults.scannedLabel,
    barcodes: parsed.barcodes ?? defaults.barcodes,
    screws: parsed.screws ?? defaults.screws,
    screwPoints: parsed.screwPoints ?? defaults.screwPoints,
    programNumber: parsed.programNumber ?? defaults.programNumber,
    deviceId: parsed.deviceId ?? defaults.deviceId
  }
}

function mergeGeneralStepData(
  parsed: Partial<IGeneralStepData>,
  defaults: IGeneralStepData
): IGeneralStepData {
  return {
    ...mergeBaseStepData(parsed, defaults),
    title: textOrDefault(parsed.title, defaults.title),
    description: textOrDefault(parsed.description, defaults.description),
    duration: parsed.duration ?? defaults.duration,
    ctaTitle: textOrDefault(parsed.ctaTitle, defaults.ctaTitle),
    ctaDescription: textOrDefault(parsed.ctaDescription, defaults.ctaDescription)
  }
}

function mergeServerStepData(
  parsed: Partial<IServerStepData>,
  defaults: IServerStepData
): IServerStepData {
  return {
    ...mergeBaseStepData(parsed, defaults),
    title: textOrDefault(parsed.title, defaults.title),
    description: textOrDefault(parsed.description, defaults.description),
    endpoint: parsed.endpoint ?? defaults.endpoint,
    method: parsed.method ?? defaults.method,
    payload: parsed.payload ?? defaults.payload
  }
}

function mergeStepDataByType(
  parsed: Partial<IProcessStepData>,
  defaults: IProcessStepData,
  type: ProcessType
): IProcessStepData {
  switch (type) {
    case 'barcode':
      return mergeBarcodeStepData(parsed as Partial<IBarcodeStepData>, defaults as IBarcodeStepData)
    case 'screw':
      return mergeScrewStepData(parsed as Partial<IScrewStepData>, defaults as IScrewStepData)
    case 'general':
      return mergeGeneralStepData(parsed as Partial<IGeneralStepData>, defaults as IGeneralStepData)
    case 'server':
      return mergeServerStepData(parsed as Partial<IServerStepData>, defaults as IServerStepData)
    default:
      return mergeBaseStepData(parsed, defaults)
  }
}

export function createDefaultProcessData(type: ProcessType): string {
  return serializeProcessData(parseDefaultProcessData(type), type)
}

export function parseDefaultProcessData(type: ProcessType): IProcessStepData {
  const base = { settings: defaultSettings(), imageRefs: [] as IProcessImageRef[] }

  switch (type) {
    case 'barcode':
      return {
        ...base,
        title: 'Lütfen ürün barkodunu okutun.',
        description: 'Ürün üzerindeki {barcodeName} barkodunu barkod okuyucu ile okutarak işlemlere devam edin.',
        scannedLabel: 'Okuttuğunuz barkod değeri : {barcodeName}',
        barcodes: [] as IBarcodeItem[]
      } satisfies IBarcodeStepData
    case 'screw':
      return {
        ...base,
        title: 'Vida Sıkma İşlemi',
        description: 'Lütfen belirtilen alanlardaki vidaları sırası ile sıkıp işlemleri tamamlayın.',
        scannedLabel: '',
        barcodes: [] as IBarcodeItem[],
        screws: [{
          label: '1. Vida',
          description: '1. vidayı sıkın',
          torqueValue: '2.01 Nm',
          angleValue: '214 Derece'
        }] as IScrewItem[],
        screwPoints: [] as IScrewPoint[],
        programNumber: 1,
        deviceId: undefined
      } satisfies IScrewStepData
    case 'general':
      return {
        ...base,
        title: 'Süreli İşlem',
        description: 'Bu adım belirli bir süre gösterilecektir.',
        duration: 30,
        ctaTitle: 'Lütfen bekleyin',
        ctaDescription: 'İşlem tamamlandığında otomatik olarak sonraki adıma geçilecektir.'
      } satisfies IGeneralStepData
    case 'server':
      return {
        ...base,
        title: 'Sunucu İşlemi',
        description: 'Sunucu tarafında işlem gerçekleştirilecektir.',
        endpoint: '',
        method: 'POST',
        payload: '{}'
      } satisfies IServerStepData
    default:
      return {
        ...base,
        title: '',
        description: '',
        duration: 30,
        ctaTitle: '',
        ctaDescription: ''
      } satisfies IGeneralStepData
  }
}

export function parseProcessData(data: string | null | undefined, type: ProcessType): IProcessStepData {
  const defaults = parseDefaultProcessData(type)

  if (!data || data.trim() === '') {
    return defaults
  }

  try {
    const parsed = JSON.parse(data) as Partial<IProcessStepData>
    return mergeStepDataByType(parsed, defaults, type)
  } catch {
    return defaults
  }
}

export function serializeProcessData(data: IProcessStepData, type: ProcessType): string {
  const normalized = mergeStepDataByType(data, parseDefaultProcessData(type), type)
  return JSON.stringify(normalized)
}

export function getProcessStepData(process: Pick<IProcess, 'data' | 'processType'>): IProcessStepData {
  return parseProcessData(process.data, process.processType as ProcessType)
}

export function mergeProcessStepData(
  process: Pick<IProcess, 'data' | 'processType'>,
  partial: Partial<IProcessStepData>
): IProcessStepData {
  const current = getProcessStepData(process)
  return mergeStepDataByType(
    { ...current, ...partial },
    parseDefaultProcessData(process.processType as ProcessType),
    process.processType as ProcessType
  )
}

export function serializeProcessUpdate(
  process: Pick<IProcess, 'data' | 'processType'>,
  partial: Partial<IProcessStepData>
): string {
  return serializeProcessData(mergeProcessStepData(process, partial), process.processType as ProcessType)
}

export function replaceBarcodePlaceholders(text: string, barcodeName: string): string {
  return text.replace(/\{barcodeName\}/g, barcodeName)
}

function normalizeScanValue(value: string): string {
  return value.trim().toLowerCase()
}

export function findBarcodeIndexByScan(barcodes: IBarcodeItem[], scanValue: string): number {
  const query = normalizeScanValue(scanValue)
  if (!query) return -1

  return barcodes.findIndex(barcode =>
    normalizeScanValue(barcode.barcode) === query ||
    normalizeScanValue(barcode.name) === query
  )
}

export function countImagesForBarcode(imageRefs: IProcessImageRef[], barcodeId?: string): number {
  if (!barcodeId) {
    return imageRefs.filter(ref => !ref.barcodeId).length
  }
  return imageRefs.filter(ref => ref.barcodeId === barcodeId || !ref.barcodeId).length
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function processTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    barcode: 'Barkod Okutma',
    screw: 'Sıkıcı',
    general: 'Süreli Sayfa',
    server: 'Sunucu İşlemleri'
  }
  return labels[type] ?? type
}

export function isBarcodeStepData(data: IProcessStepData): data is IBarcodeStepData {
  return 'barcodes' in data && !('screws' in data)
}

export function isScrewStepData(data: IProcessStepData): data is IScrewStepData {
  return 'screws' in data
}

export function hasBarcodeList(data: IProcessStepData): data is IBarcodeStepData | IScrewStepData {
  return isBarcodeStepData(data) || isScrewStepData(data)
}

export function isGeneralStepData(data: IProcessStepData): data is IGeneralStepData {
  return 'duration' in data && !('endpoint' in data)
}

export function isServerStepData(data: IProcessStepData): data is IServerStepData {
  return 'endpoint' in data
}
