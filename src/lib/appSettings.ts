export const PLAY_SPEEDS = [1, 2, 4, 6, 8, 10] as const
export const DEFAULT_PLAY_SPEED: PlaySpeed = 1
export const MAP_TYPES = ['road', 'satellite'] as const
export const DEFAULT_MAP_TYPE: MapType = 'road'

export type PlaySpeed = (typeof PLAY_SPEEDS)[number]
export type MapType = (typeof MAP_TYPES)[number]

const PLAY_SPEED_STORAGE_KEY = 'gpx-navigator:play-speed'
const MAP_TYPE_STORAGE_KEY = 'gpx-navigator:map-type'

export function getStoredPlaySpeed(): PlaySpeed {
  return parsePlaySpeed(window.localStorage.getItem(PLAY_SPEED_STORAGE_KEY))
}

export function savePlaySpeed(playSpeed: PlaySpeed): void {
  window.localStorage.setItem(PLAY_SPEED_STORAGE_KEY, playSpeed.toString())
}

export function getStoredMapType(): MapType {
  return parseMapType(window.localStorage.getItem(MAP_TYPE_STORAGE_KEY))
}

export function saveMapType(mapType: MapType): void {
  window.localStorage.setItem(MAP_TYPE_STORAGE_KEY, mapType)
}

export function parsePlaySpeed(value: string | null): PlaySpeed {
  const numericValue = Number(value)

  if ((PLAY_SPEEDS as readonly number[]).includes(numericValue)) {
    return numericValue as PlaySpeed
  }

  return DEFAULT_PLAY_SPEED
}

export function parseMapType(value: string | null): MapType {
  if ((MAP_TYPES as readonly string[]).includes(value ?? '')) {
    return value as MapType
  }

  return DEFAULT_MAP_TYPE
}
