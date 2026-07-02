import type { ImportedRoute, RoutePoint, RouteWaypoint } from '../types/route'
import {
  calculateBounds,
  calculateDurationSeconds,
  calculateRouteDistance,
  countRoutePoints,
} from './routeStats'

export class GpxParseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GpxParseError'
  }
}

export function parseGpxRoute(xmlText: string, sourceFile = 'Imported GPX'): ImportedRoute {
  const document = new DOMParser().parseFromString(xmlText, 'application/xml')
  const parserError = getFirstElement(document, 'parsererror')

  if (parserError) {
    throw new GpxParseError('The GPX file is not valid XML.')
  }

  const gpx = getFirstElement(document, 'gpx')
  if (!gpx) {
    throw new GpxParseError('The file does not contain a GPX document.')
  }

  const segments = extractTrackSegments(gpx)
  const routeSegments = segments.length > 0 ? segments : extractRouteSegments(gpx)
  const routePoints = routeSegments.flat()
  const pointCount = countRoutePoints(routeSegments)

  if (pointCount < 2) {
    throw new GpxParseError('The GPX route must contain at least two route points.')
  }

  const name = findRouteName(gpx, sourceFile)
  const importedAt = new Date().toISOString()

  return {
    id: createRouteId(),
    name,
    sourceFile,
    importedAt,
    segments: routeSegments,
    waypoints: extractWaypoints(gpx),
    bounds: calculateBounds(routePoints),
    distanceMeters: calculateRouteDistance(routeSegments),
    pointCount,
    durationSeconds: calculateDurationSeconds(routeSegments),
  }
}

function extractTrackSegments(gpx: Element): RoutePoint[][] {
  return getElements(gpx, 'trk')
    .flatMap((track) => getElements(track, 'trkseg'))
    .map((segment) => getElements(segment, 'trkpt').map(parsePointElement))
    .filter((segment) => segment.length > 0)
}

function extractRouteSegments(gpx: Element): RoutePoint[][] {
  return getElements(gpx, 'rte')
    .map((route) => getElements(route, 'rtept').map(parsePointElement))
    .filter((segment) => segment.length > 0)
}

function extractWaypoints(gpx: Element): RouteWaypoint[] {
  return getElements(gpx, 'wpt').map((waypoint) => ({
    ...parsePointElement(waypoint),
    description: getDirectChildText(waypoint, 'desc'),
    symbol: getDirectChildText(waypoint, 'sym'),
  }))
}

function parsePointElement(element: Element): RoutePoint {
  const lat = parseCoordinate(element.getAttribute('lat'), 'latitude')
  const lon = parseCoordinate(element.getAttribute('lon'), 'longitude')
  const elevationText = getDirectChildText(element, 'ele')
  const elevation = elevationText === undefined ? undefined : Number(elevationText)

  if (elevationText !== undefined && !Number.isFinite(elevation)) {
    throw new GpxParseError('A GPX point contains an invalid elevation value.')
  }

  return {
    lat,
    lon,
    ele: elevation,
    time: getDirectChildText(element, 'time'),
    name: getDirectChildText(element, 'name'),
  }
}

function parseCoordinate(value: string | null, label: string): number {
  if (value === null || value.trim() === '') {
    throw new GpxParseError(`A GPX point is missing its ${label}.`)
  }

  const coordinate = Number(value)
  if (!Number.isFinite(coordinate)) {
    throw new GpxParseError(`A GPX point has an invalid ${label}.`)
  }

  return coordinate
}

function findRouteName(gpx: Element, sourceFile: string): string {
  const metadataName = getElements(gpx, 'metadata')
    .map((metadata) => getDirectChildText(metadata, 'name'))
    .find(Boolean)

  const routeName =
    metadataName ??
    getElements(gpx, 'trk')
      .map((track) => getDirectChildText(track, 'name'))
      .find(Boolean) ??
    getElements(gpx, 'rte')
      .map((route) => getDirectChildText(route, 'name'))
      .find(Boolean)

  return routeName ?? cleanFileName(sourceFile) ?? 'Imported route'
}

function cleanFileName(sourceFile: string): string | undefined {
  const trimmed = sourceFile.trim()
  if (!trimmed) {
    return undefined
  }

  return trimmed.replace(/\.gpx$/i, '')
}

function getFirstElement(root: Document | Element, localName: string): Element | undefined {
  return getElements(root, localName)[0]
}

function getElements(root: Document | Element, localName: string): Element[] {
  const namespaceMatches = Array.from(root.getElementsByTagNameNS('*', localName))
  const plainMatches = Array.from(root.getElementsByTagName(localName))

  return Array.from(new Set<Element>([...namespaceMatches, ...plainMatches]))
}

function getDirectChildText(element: Element, localName: string): string | undefined {
  const child = Array.from(element.children).find(
    (candidate) => candidate.localName === localName,
  )
  const text = child?.textContent?.trim()
  return text ? text : undefined
}

function createRouteId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}
