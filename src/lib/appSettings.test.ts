import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_PLAY_SPEED,
  getStoredPlaySpeed,
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
})
