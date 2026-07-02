import type { ImportedRoute, RoutePoint } from '../types/route'
import { calculatePointDistance } from './routeStats'

export type SimulationTrack = {
  points: RoutePoint[]
  cumulativeDistances: number[]
  totalDistanceMeters: number
}

export type SimulationProgress = {
  index: number
  stepNumber: number
  totalSteps: number
  distanceMeters: number
  remainingMeters: number
  percent: number
}

export function buildSimulationTrack(route?: ImportedRoute): SimulationTrack {
  if (!route) {
    return emptySimulationTrack()
  }

  const points: RoutePoint[] = []
  const cumulativeDistances: number[] = []
  let distanceMeters = 0

  route.segments.forEach((segment) => {
    segment.forEach((point, index) => {
      if (index > 0) {
        distanceMeters += calculatePointDistance(segment[index - 1], point)
      }

      points.push(point)
      cumulativeDistances.push(distanceMeters)
    })
  })

  return {
    points,
    cumulativeDistances,
    totalDistanceMeters: distanceMeters,
  }
}

export function emptySimulationTrack(): SimulationTrack {
  return {
    points: [],
    cumulativeDistances: [],
    totalDistanceMeters: 0,
  }
}

export function clampSimulationIndex(index: number, track: SimulationTrack): number {
  if (track.points.length === 0) {
    return 0
  }

  return Math.min(Math.max(Math.round(index), 0), track.points.length - 1)
}

export function getSimulationPoint(
  track: SimulationTrack,
  index: number,
): RoutePoint | undefined {
  return track.points[clampSimulationIndex(index, track)]
}

export function getSimulationProgress(
  track: SimulationTrack,
  index: number,
): SimulationProgress {
  const clampedIndex = clampSimulationIndex(index, track)
  const distanceMeters = track.cumulativeDistances[clampedIndex] ?? 0
  const percent =
    track.totalDistanceMeters > 0
      ? (distanceMeters / track.totalDistanceMeters) * 100
      : 0

  return {
    index: clampedIndex,
    stepNumber: track.points.length > 0 ? clampedIndex + 1 : 0,
    totalSteps: track.points.length,
    distanceMeters,
    remainingMeters: Math.max(track.totalDistanceMeters - distanceMeters, 0),
    percent: Math.min(Math.max(percent, 0), 100),
  }
}

export function getPointHeading(
  track: SimulationTrack,
  index: number,
): number | undefined {
  if (track.points.length < 2) {
    return undefined
  }

  const currentIndex = clampSimulationIndex(index, track)
  const from =
    track.points[currentIndex + 1] !== undefined
      ? track.points[currentIndex]
      : track.points[currentIndex - 1]
  const to =
    track.points[currentIndex + 1] !== undefined
      ? track.points[currentIndex + 1]
      : track.points[currentIndex]

  if (!from || !to) {
    return undefined
  }

  return calculateBearing(from, to)
}

export function createStreetViewUrl(point: RoutePoint, heading?: number): string {
  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: `${point.lat},${point.lon}`,
  })

  if (heading !== undefined) {
    params.set('heading', Math.round(heading).toString())
  }

  return `https://www.google.com/maps/@?${params.toString()}`
}

function calculateBearing(from: RoutePoint, to: RoutePoint): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLon = toRadians(to.lon - from.lon)
  const y = Math.sin(deltaLon) * Math.cos(toLat)
  const x =
    Math.cos(fromLat) * Math.sin(toLat) -
    Math.sin(fromLat) * Math.cos(toLat) * Math.cos(deltaLon)

  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}

function toDegrees(value: number): number {
  return (value * 180) / Math.PI
}
