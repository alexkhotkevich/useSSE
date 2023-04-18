import { createContext } from 'react'

export interface InternalContext {
  requests: {
    promise: Promise<any>
    id: number
    cancel: Function
  }[]
  resolved: boolean
  current: number
}
export interface DataContext {
  [k: string]: any
}

export const DataContext = createContext<DataContext>({})

export const InternalContext = createContext<InternalContext>({
  requests: [],
  resolved: false,
  current: 0,
})

declare global {
  interface Window {
    [k: string]: any
    _initialDataContext: object
  }
}
