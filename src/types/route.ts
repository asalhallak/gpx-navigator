export type RoutePoint = {
  lat: number
  lon: number
  ele?: number
  time?: string
  name?: string
}

export type RouteWaypoint = RoutePoint & {
  description?: string
  symbol?: string
}

export type RouteBounds = {
  north: number
  south: number
  east: number
  west: number
}

export type ImportedRoute = {
  id: string
  name: string
  sourceFile: string
  importedAt: string
  segments: RoutePoint[][]
  waypoints: RouteWaypoint[]
  bounds: RouteBounds
  distanceMeters: number
  pointCount: number
  durationSeconds?: number
}
