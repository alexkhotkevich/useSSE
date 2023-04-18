import React, { ComponentPropsWithoutRef, DependencyList, ElementType, useContext, useEffect, useState } from 'react'

import { DataContext, InternalContext } from 'ctx'

/**
 *
 * @param effect runction returning promise
 * @param dependencies  list of dependencies like in useEffect
 */
export function useSSE<T>(effect: () => Promise<any>, dependencies?: DependencyList): T[] {
  const internalContext = useContext(InternalContext)
  let callId = internalContext.current
  internalContext.current++
  const ctx = useContext(DataContext)
  const [data, setData] = useState(ctx[callId]?.data || null)
  const [error, setError] = useState(ctx[callId]?.error || null)

  if (!internalContext.resolved) {
    let cancel = Function.prototype

    const effectPr = new Promise((resolve) => {
      cancel = () => {
        if (!ctx[callId]) {
          ctx[callId] = { error: { message: 'timeout' }, id: callId }
        }
        resolve(callId)
      }
      return effect()
        .then((res) => {
          return res
        })
        .then((res) => {
          ctx[callId] = { data: res }
          resolve(callId)
        })
        .catch((error) => {
          ctx[callId] = { error: error }
          resolve(callId)
        })
    })

    internalContext.requests.push({
      id: callId,
      promise: effectPr,
      cancel: cancel,
    })
  }

  useEffect(() => {
    if (internalContext.resolved && !ctx[callId]) {
      effect()
        .then((res) => {
          setData(res)
        })
        .catch((error) => {
          setError(error)
        })
    }
    delete ctx[callId]
  }, dependencies)

  return [data, error]
}

export const createBroswerContext = (variableName: string = '_initialDataContext') => {
  const initial = window && window[variableName] ? window[variableName] : {}
  let internalContextValue: InternalContext = {
    current: 0,
    resolved: true,
    requests: [],
  }
  function BroswerDataContext<T extends ElementType>({ children }: ComponentPropsWithoutRef<T>) {
    return (
      <InternalContext.Provider value={internalContextValue}>
        <DataContext.Provider value={initial}>{children}</DataContext.Provider>
      </InternalContext.Provider>
    )
  }

  return BroswerDataContext
}

const wait = (time: number) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject({ error: 'timeout' })
    }, time)
  })
}

export const createServerContext = () => {
  let ctx: DataContext = {}
  let internalContextValue: InternalContext = {
    current: 0,
    resolved: false,
    requests: [],
  }
  function ServerDataContext<T extends ElementType>(props: ComponentPropsWithoutRef<T>) {
    return (
      <InternalContext.Provider value={internalContextValue}>
        <DataContext.Provider value={ctx}>{props.children}</DataContext.Provider>
      </InternalContext.Provider>
    )
  }
  const resolveData = async (timeout?: number) => {
    const effects = internalContextValue.requests.map((item) => item.promise)

    if (timeout) {
      const timeOutPr = wait(timeout)

      await Promise.all(
        internalContextValue.requests.map((effect, index) => {
          return Promise.race([effect.promise, timeOutPr]).catch(() => {
            return effect.cancel()
          })
        })
      )
    } else {
      await Promise.all(effects)
    }

    internalContextValue.resolved = true
    internalContextValue.current = 0
    return {
      data: ctx,
      toJSON: function () {
        return this.data
      },
      toHtml: function (variableName: string = '_initialDataContext') {
        return `<script>window.${variableName} = ${JSON.stringify(this)};</script>`
      },
    }
  }
  return {
    ServerDataContext,
    resolveData,
  }
}
