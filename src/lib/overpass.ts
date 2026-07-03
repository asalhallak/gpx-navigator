import type { RoadInsight, RoadInsightKind } from '../types/roadInsight'
import type { ImportedRoute, RouteBounds, RoutePoint } from '../types/route'
import { calculatePointDistance } from './routeStats'

const OVERPASS_ENDPOINT = 'https://overpass-api.de/api/interpreter'
const BOUNDS_PADDING_DEGREES = 0.002
const MAX_DISTANCE_FROM_ROUTE_METERS = 120
const MAX_INSIGHTS = 120

type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: {
    lat: number
    lon: number
  }
  tags?: Record<string, string>
}

type OverpassResponse = {
  elements?: OverpassElement[]
}

type ParseOptions = {
  maxDistanceMeters?: number
}

type NearestRouteMatch = {
  distanceMeters: number
  routeProgressMeters: number
}

type SegmentMatch = {
  distanceMeters: number
  projection: number
}

export async function fetchRoadInsights(
  route: ImportedRoute,
  signal?: AbortSignal,
): Promise<RoadInsight[]> {
  const response = await fetch(OVERPASS_ENDPOINT, {
    method: 'POST',
    body: createOverpassQuery(route.bounds),
    headers: {
      'Content-Type': 'text/plain;charset=UTF-8',
    },
    signal,
  })

  if (!response.ok) {
    throw new Error(`OSM road cues could not be loaded (${response.status}).`)
  }

  return parseOverpassInsights((await response.json()) as OverpassResponse, route)
}

export function createOverpassQuery(bounds: RouteBounds): string {
  const paddedBounds = padBounds(bounds)
  const bbox = [
    paddedBounds.south,
    paddedBounds.west,
    paddedBounds.north,
    paddedBounds.east,
  ].join(',')

  return `[out:json][timeout:25];
(
  node["highway"="traffic_signals"](${bbox});
  node["highway"="crossing"](${bbox});
  node["highway"~"^(stop|give_way)$"](${bbox});
  node["traffic_sign"](${bbox});
  way["junction"="roundabout"](${bbox});
  way["maxspeed"](${bbox});
  way["priority_road"](${bbox});
  way["highway"](${bbox});
);
out center tags;`
}

export function parseOverpassInsights(
  response: OverpassResponse,
  route: ImportedRoute,
  options: ParseOptions = {},
): RoadInsight[] {
  const maxDistanceMeters = options.maxDistanceMeters ?? MAX_DISTANCE_FROM_ROUTE_METERS
  const insights: RoadInsight[] = []
  const seen = new Set<string>()

  response.elements?.forEach((element) => {
    const coordinate = getElementCoordinate(element)
    const tags = element.tags ?? {}

    if (!coordinate) {
      return
    }

    const nearestRouteMatch = getNearestRouteMatch(coordinate, route.segments)
    if (nearestRouteMatch.distanceMeters > maxDistanceMeters) {
      return
    }

    getInsightCandidates(element, tags, coordinate, nearestRouteMatch).forEach(
      (insight) => {
        const dedupeKey = createInsightDedupeKey(insight)
        if (seen.has(dedupeKey)) {
          return
        }

        seen.add(dedupeKey)
        insights.push(insight)
      },
    )
  })

  return insights
    .sort(
      (a, b) =>
        a.routeProgressMeters - b.routeProgressMeters ||
        a.distanceFromRouteMeters - b.distanceFromRouteMeters,
    )
    .slice(0, MAX_INSIGHTS)
}

function getInsightCandidates(
  element: OverpassElement,
  tags: Record<string, string>,
  coordinate: RoutePoint,
  nearestRouteMatch: NearestRouteMatch,
): RoadInsight[] {
  const base = {
    lat: coordinate.lat,
    lon: coordinate.lon,
    distanceFromRouteMeters: nearestRouteMatch.distanceMeters,
    routeProgressMeters: nearestRouteMatch.routeProgressMeters,
    source: 'osm' as const,
  }
  const candidates: RoadInsight[] = []

  if (tags.highway === 'traffic_signals') {
    candidates.push(createInsight(element, 'traffic_signal', 'Traffic signal', undefined, base))
  }

  if (tags.highway === 'crossing' || tags.crossing) {
    candidates.push(
      createInsight(
        element,
        'crossing',
        'Pedestrian crossing',
        formatTagValue(tags.crossing),
        base,
      ),
    )
  }

  if (tags.traffic_sign) {
    candidates.push(
      createInsight(
        element,
        'traffic_sign',
        'Traffic sign',
        formatTagValue(tags.traffic_sign),
        base,
      ),
    )
  }

  if (tags.junction === 'roundabout') {
    candidates.push(
      createInsight(element, 'roundabout', 'Roundabout', getRoadDetail(tags), base),
    )
  }

  if (tags.maxspeed) {
    candidates.push(
      createInsight(element, 'speed_limit', 'Speed limit', tags.maxspeed, base),
    )
  }

  if (tags.priority_road || tags.highway === 'stop' || tags.highway === 'give_way') {
    candidates.push(
      createInsight(
        element,
        'priority',
        getPriorityLabel(tags),
        formatTagValue(tags.priority_road ?? tags.highway),
        base,
      ),
    )
  }

  if (isRoadHighway(tags.highway)) {
    candidates.push(
      createInsight(element, 'road_type', 'Road type', getRoadDetail(tags), base),
    )
  }

  return candidates
}

function createInsight(
  element: OverpassElement,
  kind: RoadInsightKind,
  label: string,
  detail: string | undefined,
  base: Pick<
    RoadInsight,
    'lat' | 'lon' | 'distanceFromRouteMeters' | 'routeProgressMeters' | 'source'
  >,
): RoadInsight {
  return {
    id: `${element.type}-${element.id}-${kind}`,
    kind,
    label,
    detail,
    ...base,
  }
}

function getElementCoordinate(element: OverpassElement): RoutePoint | undefined {
  if (typeof element.lat === 'number' && typeof element.lon === 'number') {
    return {
      lat: element.lat,
      lon: element.lon,
    }
  }

  if (
    typeof element.center?.lat === 'number' &&
    typeof element.center?.lon === 'number'
  ) {
    return {
      lat: element.center.lat,
      lon: element.center.lon,
    }
  }

  return undefined
}

function getNearestRouteMatch(
  point: RoutePoint,
  routeSegments: RoutePoint[][],
): NearestRouteMatch {
  let routeProgressMeters = 0
  let nearestRouteMatch: NearestRouteMatch = {
    distanceMeters: Number.POSITIVE_INFINITY,
    routeProgressMeters: 0,
  }

  routeSegments.forEach((segment) => {
    if (segment.length === 0) {
      return
    }

    if (segment.length === 1) {
      const distanceMeters = calculatePointDistance(point, segment[0])
      nearestRouteMatch = getCloserRouteMatch(nearestRouteMatch, {
        distanceMeters,
        routeProgressMeters,
      })
      return
    }

    for (let index = 1; index < segment.length; index += 1) {
      const from = segment[index - 1]
      const to = segment[index]
      const segmentDistanceMeters = calculatePointDistance(from, to)
      const segmentMatch = calculatePointToSegmentMatch(point, from, to)

      nearestRouteMatch = getCloserRouteMatch(nearestRouteMatch, {
        distanceMeters: segmentMatch.distanceMeters,
        routeProgressMeters:
          routeProgressMeters + segmentDistanceMeters * segmentMatch.projection,
      })
      routeProgressMeters += segmentDistanceMeters
    }
  })

  return nearestRouteMatch
}

function getCloserRouteMatch(
  currentMatch: NearestRouteMatch,
  candidateMatch: NearestRouteMatch,
): NearestRouteMatch {
  if (candidateMatch.distanceMeters < currentMatch.distanceMeters) {
    return candidateMatch
  }

  if (
    candidateMatch.distanceMeters === currentMatch.distanceMeters &&
    candidateMatch.routeProgressMeters < currentMatch.routeProgressMeters
  ) {
    return candidateMatch
  }

  return currentMatch
}

function calculatePointToSegmentMatch(
  point: RoutePoint,
  from: RoutePoint,
  to: RoutePoint,
): SegmentMatch {
  const projectedPoint = projectPoint(point, point)
  const projectedFrom = projectPoint(from, point)
  const projectedTo = projectPoint(to, point)
  const segmentX = projectedTo.x - projectedFrom.x
  const segmentY = projectedTo.y - projectedFrom.y
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY

  if (segmentLengthSquared === 0) {
    return {
      distanceMeters: calculatePointDistance(point, from),
      projection: 0,
    }
  }

  const rawProjection =
    ((projectedPoint.x - projectedFrom.x) * segmentX +
      (projectedPoint.y - projectedFrom.y) * segmentY) /
    segmentLengthSquared
  const projection = Math.min(Math.max(rawProjection, 0), 1)
  const closestX = projectedFrom.x + projection * segmentX
  const closestY = projectedFrom.y + projection * segmentY

  return {
    distanceMeters: Math.hypot(projectedPoint.x - closestX, projectedPoint.y - closestY),
    projection,
  }
}

function projectPoint(point: RoutePoint, origin: RoutePoint): { x: number; y: number } {
  const metersPerDegreeLatitude = 111_320
  const metersPerDegreeLongitude =
    metersPerDegreeLatitude * Math.cos((origin.lat * Math.PI) / 180)

  return {
    x: (point.lon - origin.lon) * metersPerDegreeLongitude,
    y: (point.lat - origin.lat) * metersPerDegreeLatitude,
  }
}

function padBounds(bounds: RouteBounds): RouteBounds {
  return {
    north: bounds.north + BOUNDS_PADDING_DEGREES,
    south: bounds.south - BOUNDS_PADDING_DEGREES,
    east: bounds.east + BOUNDS_PADDING_DEGREES,
    west: bounds.west - BOUNDS_PADDING_DEGREES,
  }
}

function createInsightDedupeKey(insight: RoadInsight): string {
  return [
    insight.kind,
    insight.label,
    insight.detail ?? '',
    insight.lat.toFixed(5),
    insight.lon.toFixed(5),
  ].join(':')
}

function isRoadHighway(highway?: string): boolean {
  return Boolean(
    highway &&
      ![
        'traffic_signals',
        'crossing',
        'stop',
        'give_way',
        'street_lamp',
        'bus_stop',
      ].includes(highway),
  )
}

function getRoadDetail(tags: Record<string, string>): string | undefined {
  const roadType = formatTagValue(tags.highway)
  const name = tags.name?.trim()

  if (roadType && name) {
    return `${name} · ${roadType}`
  }

  return roadType ?? name
}

function getPriorityLabel(tags: Record<string, string>): string {
  if (tags.highway === 'stop') {
    return 'Stop control'
  }

  if (tags.highway === 'give_way') {
    return 'Give-way control'
  }

  return 'Priority road'
}

function formatTagValue(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  return value
    .split(';')
    .map((part) => part.replace(/_/g, ' ').trim())
    .filter(Boolean)
    .join(', ')
}
