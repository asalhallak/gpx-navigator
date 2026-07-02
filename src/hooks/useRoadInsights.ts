import { useCallback, useEffect, useState } from 'react'
import { fetchRoadInsights } from '../lib/overpass'
import type { RoadInsight } from '../types/roadInsight'
import type { ImportedRoute } from '../types/route'

export type RoadInsightsStatus = 'idle' | 'loading' | 'loaded' | 'error'

export function useRoadInsights(route?: ImportedRoute) {
  const [insights, setInsights] = useState<RoadInsight[]>([])
  const [status, setStatus] = useState<RoadInsightsStatus>('idle')
  const [error, setError] = useState<string>()
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    if (!route) {
      setInsights([])
      setStatus('idle')
      setError(undefined)
      return undefined
    }

    const controller = new AbortController()
    setStatus('loading')
    setError(undefined)

    fetchRoadInsights(route, controller.signal)
      .then((nextInsights) => {
        setInsights(nextInsights)
        setStatus('loaded')
      })
      .catch((nextError: unknown) => {
        if (nextError instanceof DOMException && nextError.name === 'AbortError') {
          return
        }

        setInsights([])
        setStatus('error')
        setError(
          nextError instanceof Error
            ? nextError.message
            : 'OSM road cues could not be loaded.',
        )
      })

    return () => controller.abort()
  }, [refreshToken, route])

  const refresh = useCallback(() => {
    setRefreshToken((currentValue) => currentValue + 1)
  }, [])

  return {
    insights,
    status,
    error,
    refresh,
  }
}
