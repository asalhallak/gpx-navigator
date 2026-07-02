import type { ImportedRoute, RouteBounds, RoutePoint } from '../types/route'

const EARTH_RADIUS_METERS = 6_371_000

export function calculateRouteDistance(segments: RoutePoint[][]): number {
  return segments.reduce((total, segment) => {
    if (segment.length < 2) {
      return total
    }

    let segmentTotal = 0
    for (let index = 1; index < segment.length; index += 1) {
      segmentTotal += calculatePointDistance(segment[index - 1], segment[index])
    }

    return total + segmentTotal
  }, 0)
}

export function calculatePointDistance(from: RoutePoint, to: RoutePoint): number {
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const deltaLat = toRadians(to.lat - from.lat)
  const deltaLon = toRadians(to.lon - from.lon)

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(fromLat) *
      Math.cos(toLat) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return EARTH_RADIUS_METERS * c
}

export function calculateBounds(points: RoutePoint[]): RouteBounds {
  if (points.length === 0) {
    throw new Error('Cannot calculate bounds without route points.')
  }

  return points.reduce<RouteBounds>(
    (bounds, point) => ({
      north: Math.max(bounds.north, point.lat),
      south: Math.min(bounds.south, point.lat),
      east: Math.max(bounds.east, point.lon),
      west: Math.min(bounds.west, point.lon),
    }),
    {
      north: points[0].lat,
      south: points[0].lat,
      east: points[0].lon,
      west: points[0].lon,
    },
  )
}

export function countRoutePoints(segments: RoutePoint[][]): number {
  return segments.reduce((total, segment) => total + segment.length, 0)
}

export function calculateDurationSeconds(segments: RoutePoint[][]): number | undefined {
  const timestamps = segments
    .flat()
    .map((point) => (point.time ? Date.parse(point.time) : NaN))
    .filter((value) => Number.isFinite(value))

  if (timestamps.length < 2) {
    return undefined
  }

  const seconds = (Math.max(...timestamps) - Math.min(...timestamps)) / 1000
  return seconds > 0 ? seconds : undefined
}

export function getRouteStart(route: ImportedRoute): RoutePoint | undefined {
  return route.segments.find((segment) => segment.length > 0)?.[0]
}

export function getRouteEnd(route: ImportedRoute): RoutePoint | undefined {
  const segment = route.segments
    .slice()
    .reverse()
    .find((candidate) => candidate.length > 0)

  return segment?.[segment.length - 1]
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180
}
