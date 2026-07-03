import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_MAP_TYPE,
  DEFAULT_PLAY_SPEED,
  getStoredMapType,
  getStoredPlaySpeed,
  saveMapType,
  savePlaySpeed,
} from './appSettings'

describe('app settings', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns x1 when no play speed is stored', () => {
    expect(getStoredPlaySpeed()).toBe(DEFAULT_PLAY_SPEED)
  })

  it('returns a saved valid play speed', () => {
    window.localStorage.setItem('gpx-navigator:play-speed', '4')

    expect(getStoredPlaySpeed()).toBe(4)
  })

  it('falls back to x1 when the stored play speed is invalid', () => {
    window.localStorage.setItem('gpx-navigator:play-speed', '3')

    expect(getStoredPlaySpeed()).toBe(DEFAULT_PLAY_SPEED)
  })

  it('persists the selected play speed', () => {
    savePlaySpeed(10)

    expect(window.localStorage.getItem('gpx-navigator:play-speed')).toBe('10')
  })

  it('returns road when no map type is stored', () => {
    expect(getStoredMapType()).toBe(DEFAULT_MAP_TYPE)
  })

  it('returns a saved valid map type', () => {
    window.localStorage.setItem('gpx-navigator:map-type', 'satellite')

    expect(getStoredMapType()).toBe('satellite')
  })

  it('falls back to road when the stored map type is invalid', () => {
    window.localStorage.setItem('gpx-navigator:map-type', 'terrain')

    expect(getStoredMapType()).toBe(DEFAULT_MAP_TYPE)
  })

  it('persists the selected map type', () => {
    saveMapType('satellite')

    expect(window.localStorage.getItem('gpx-navigator:map-type')).toBe('satellite')
  })
})
