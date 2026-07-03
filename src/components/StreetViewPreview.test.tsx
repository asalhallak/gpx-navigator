import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createGoogleMapsScriptUrl,
  loadGoogleMaps,
} from './StreetViewPreview'

describe('StreetViewPreview Google Maps loader', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
    delete window.google
    delete window.gm_authFailure
  })

  it('builds the Google Maps script URL with async loading enabled', () => {
    const url = new URL(createGoogleMapsScriptUrl('maps-key'))

    expect(url.origin).toBe('https://maps.googleapis.com')
    expect(url.pathname).toBe('/maps/api/js')
    expect(url.searchParams.get('key')).toBe('maps-key')
    expect(url.searchParams.get('loading')).toBe('async')
  })

  it('resolves when the Google Maps script exposes Street View', async () => {
    const promise = loadGoogleMaps('successful-key')
    const script = document.querySelector('script') as HTMLScriptElement

    window.google = {
      maps: {
        StreetViewPanorama: vi.fn(),
      },
    }
    script.dispatchEvent(new Event('load'))

    await expect(promise).resolves.toBeUndefined()
  })

  it('rejects when Google reports an authentication failure', async () => {
    const promise = loadGoogleMaps('auth-failure-key')

    window.gm_authFailure?.()

    await expect(promise).rejects.toThrow('Google Maps authentication failed.')
    expect(window.gm_authFailure).toBeUndefined()
  })
})
