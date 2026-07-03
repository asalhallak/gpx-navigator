export const PLAY_SPEEDS = [1, 2, 4, 6, 8, 10] as const
export const DEFAULT_PLAY_SPEED: PlaySpeed = 1

export type PlaySpeed = (typeof PLAY_SPEEDS)[number]

const PLAY_SPEED_STORAGE_KEY = 'gpx-navigator:play-speed'

export function getStoredPlaySpeed(): PlaySpeed {
  return parsePlaySpeed(window.localStorage.getItem(PLAY_SPEED_STORAGE_KEY))
}

export function savePlaySpeed(playSpeed: PlaySpeed): void {
  window.localStorage.setItem(PLAY_SPEED_STORAGE_KEY, playSpeed.toString())
}

export function parsePlaySpeed(value: string | null): PlaySpeed {
  const numericValue = Number(value)

  if ((PLAY_SPEEDS as readonly number[]).includes(numericValue)) {
    return numericValue as PlaySpeed
  }

  return DEFAULT_PLAY_SPEED
}
