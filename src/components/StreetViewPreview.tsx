import { useEffect, useRef, useState } from 'react'
import { ImageOff, Loader2 } from 'lucide-react'
import type { RoutePoint } from '../types/route'

type StreetViewPreviewProps = {
  point?: RoutePoint
  heading?: number
}

type StreetViewStatus = 'loading' | 'ready' | 'error'

type GoogleLatLngLiteral = {
  lat: number
  lng: number
}

type GoogleStreetViewPanorama = {
  setPosition: (position: GoogleLatLngLiteral) => void
  setPov: (pov: { heading: number; pitch: number }) => void
  setVisible: (visible: boolean) => void
}

type GoogleMapsGlobal = {
  maps: {
    StreetViewPanorama: new (
      element: HTMLElement,
      options: {
        addressControl: boolean
        fullscreenControl: boolean
        linksControl: boolean
        motionTracking: boolean
        panControl: boolean
        position: GoogleLatLngLiteral
        pov: { heading: number; pitch: number }
        showRoadLabels: boolean
        visible: boolean
        zoomControl: boolean
      },
    ) => GoogleStreetViewPanorama
  }
}

declare global {
  interface Window {
    google?: GoogleMapsGlobal
  }
}

const scriptPromises = new Map<string, Promise<void>>()

export default function StreetViewPreview({ point, heading }: StreetViewPreviewProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const panoramaRef = useRef<GoogleStreetViewPanorama | null>(null)
  const [status, setStatus] = useState<StreetViewStatus>('loading')

  useEffect(() => {
    if (!apiKey || !point) {
      return undefined
    }

    let isCancelled = false
    setStatus('loading')

    loadGoogleMaps(apiKey)
      .then(() => {
        if (isCancelled || !containerRef.current || !window.google) {
          return
        }

        const position = {
          lat: point.lat,
          lng: point.lon,
        }
        const pov = {
          heading: heading ?? 0,
          pitch: 0,
        }

        if (!panoramaRef.current) {
          panoramaRef.current = new window.google.maps.StreetViewPanorama(
            containerRef.current,
            {
              addressControl: false,
              fullscreenControl: false,
              linksControl: true,
              motionTracking: false,
              panControl: true,
              position,
              pov,
              showRoadLabels: true,
              visible: true,
              zoomControl: true,
            },
          )
        } else {
          panoramaRef.current.setPosition(position)
          panoramaRef.current.setPov(pov)
          panoramaRef.current.setVisible(true)
        }

        setStatus('ready')
      })
      .catch(() => setStatus('error'))

    return () => {
      isCancelled = true
    }
  }, [apiKey, heading, point])

  if (!apiKey || !point) {
    return null
  }

  return (
    <div className="street-view-preview">
      <div ref={containerRef} className="street-view-preview__canvas" />
      {status !== 'ready' ? (
        <div className="street-view-preview__status" role="status">
          {status === 'loading' ? (
            <>
              <Loader2 size={16} aria-hidden="true" />
              <span>Loading Street View</span>
            </>
          ) : (
            <>
              <ImageOff size={16} aria-hidden="true" />
              <span>Street View unavailable</span>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps.StreetViewPanorama) {
    return Promise.resolve()
  }

  const existingPromise = scriptPromises.get(apiKey)
  if (existingPromise) {
    return existingPromise
  }

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    const params = new URLSearchParams({
      key: apiKey,
    })

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Maps could not be loaded.'))
    document.head.append(script)
  })

  scriptPromises.set(apiKey, promise)
  return promise
}
