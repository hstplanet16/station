export interface IType {
    id: number
    name: string
    typeCode: string
}

export interface IStationProcess {
    id: number
    stationId: number
    uid: string
    typeId: number
    processes: IProcess[]
}

export interface IProcess {
    id: number
    name: string
    processType: string
    processNumber: number
    pasif: boolean
    data: string
    settings?: string
}

export type ProcessType = 'barcode' | 'screw' | 'general' | 'server'

export type MaterialNotFoundAction = 'wait' | 'autoAdvance' | 'showAndAdvance'
export type StepCompletionAction = 'wait' | 'autoAdvance' | 'manualConfirm'

export interface IProcessSettings {
    materialNotFoundAction: MaterialNotFoundAction
    materialNotFoundDelay: number
    materialNotFoundMessage: string
    onSuccessAction: StepCompletionAction
    onSuccessDelay: number
    timeout: number
    retryCount: number
    skipOnError: boolean
}

export interface IBarcodeItem {
    id: string
    name: string
    barcode: string
}

export interface IProcessImageRef {
    id: string
    barcodeId?: string
    label?: string
}

export interface IScrewPoint {
    id: string
    x: number
    y: number
    label: string
}

export interface IScrewItem {
    label: string
    description: string
    torqueValue: string
    angleValue: string
}

export interface IProcessStepDataBase {
    settings: IProcessSettings
    imageRefs: IProcessImageRef[]
}

export interface IBarcodeStepData extends IProcessStepDataBase {
    title: string
    description: string
    scannedLabel: string
    barcodes: IBarcodeItem[]
}

export interface IScrewStepData extends IProcessStepDataBase {
    title: string
    screws: IScrewItem[]
    screwPoints: IScrewPoint[]
    programNumber: number
    deviceId?: number
    description: string
    barcodes: IBarcodeItem[]
    scannedLabel: string
}

export interface IGeneralStepData extends IProcessStepDataBase {
    title: string
    description: string
    duration: number
    ctaTitle: string
    ctaDescription: string
}

export interface IServerStepData extends IProcessStepDataBase {
    title: string
    description: string
    endpoint: string
    method: 'GET' | 'POST'
    payload: string
}

export type IProcessStepData = IBarcodeStepData | IScrewStepData | IGeneralStepData | IServerStepData
