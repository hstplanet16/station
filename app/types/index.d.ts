import type { AvatarProps } from '@nuxt/ui'

export type UserStatus = 'subscribed' | 'unsubscribed' | 'bounced'
export type SaleStatus = 'paid' | 'failed' | 'refunded'

export interface User {
  id: number
  name: string
  email: string
  avatar?: AvatarProps
  status: UserStatus
  location: string
}

export interface Mail {
  id: number
  name: string
  processType: string
  processNumber: number
  pasif: boolean
}

export interface Member {
  name: string
  username: string
  role: 'member' | 'owner'
  avatar: AvatarProps
}

export interface Stat {
  title: string
  icon: string
  value: number | string
  variation: number
  formatter?: (value: number) => string
}

export interface Sale {
  id: string
  date: string
  status: SaleStatus
  email: string
  amount: number
}

export interface NotificationDetail {
  status?: number
  statusText?: string
  method?: string
  url?: string
  message?: string
  code?: string
  response?: unknown
}

export interface Notification {
  //id: number
  unread?: boolean
  sender: User
  body: string
  date: string
  type?: 'info' | 'error' | 'success'
  detail?: NotificationDetail,
  stationId: number
}

export type Period = 'daily' | 'weekly' | 'monthly'

export interface Range {
  start: Date
  end: Date
}
