import { useEffect, useMemo } from 'react'
import L, { type LatLngExpression } from 'leaflet'
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet'
import {
  Map as MapIcon,
  MapPin,
  Navigation,
  Satellite,
  type LucideIcon,
} from 'lucide-react'
import type { RoadInsight, RoadInsightKind } from '../types/roadInsight'
import type { ImportedRoute, RoutePoint } from '../types/route'
import { getRouteEnd, getRouteStart } from '../lib/routeStats'
import { formatDistance } from '../lib/format'
import type { MapType } from '../lib/appSettings'

type RouteMapProps = {
  route?: ImportedRoute
  simulationPoint?: RoutePoint
  followSimulation?: boolean
  roadInsights?: RoadInsight[]
  mapType: MapType
  onMapTypeChange: (mapType: MapType) => void
}

const defaultCenter: LatLngExpression = [51.1657, 10.4515]

const mapLayerOptions: Record<MapType, { attribution: string; url: string }> = {
  road: {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  },
  satellite: {
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  },
}

const mapTypeOptions: Array<{ icon: LucideIcon; label: string; value: MapType }> = [
  { icon: MapIcon, label: 'Road', value: 'road' },
  { icon: Satellite, label: 'Satellite', value: 'satellite' },
]

const startIcon = L.divIcon({
  className: 'route-marker route-marker--start',
  html: '<span>S</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const endIcon = L.divIcon({
  className: 'route-marker route-marker--end',
  html: '<span>E</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const waypointIcon = L.divIcon({
  className: 'route-marker route-marker--waypoint',
  html: '<span></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

const currentPositionIcon = L.divIcon({
  className: 'route-marker route-marker--current',
  html: '<span></span>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
})

const roadInsightIcons: Record<RoadInsightKind, L.DivIcon> = {
  traffic_signal: createRoadInsightIcon('traffic_signal', 'S'),
  crossing: createRoadInsightIcon('crossing', 'C'),
  roundabout: createRoadInsightIcon('roundabout', 'R'),
  speed_limit: createRoadInsightIcon('speed_limit', '50'),
  road_type: createRoadInsightIcon('road_type', 'T'),
  priority: createRoadInsightIcon('priority', 'P'),
  traffic_sign: createRoadInsightIcon('traffic_sign', '!'),
}

export default function RouteMap({
  route,
  simulationPoint,
  followSimulation = true,
  roadInsights = [],
  mapType,
  onMapTypeChange,
}: RouteMapProps) {
  const mapLayer = mapLayerOptions[mapType]
  const start = route ? getRouteStart(route) : undefined
  const end = route ? getRouteEnd(route) : undefined
  const segments = useMemo(
    () => route?.segments.map((segment) => segment.map(toLatLng)) ?? [],
    [route],
  )

  return (
    <section className="map-shell" aria-label="Route map">
      <MapContainer center={defaultCenter} zoom={6} scrollWheelZoom className="route-map">
        <TileLayer
          key={mapType}
          attribution={mapLayer.attribution}
          url={mapLayer.url}
        />

        {route ? (
          <>
            <FitRoute route={route} />
            <FollowSimulation point={simulationPoint} enabled={followSimulation} />
            {segments.map((segment, index) => (
              <Polyline
                key={`${route.id}-${index}`}
                positions={segment}
                pathOptions={{
                  color: '#1d4ed8',
                  weight: 6,
                  opacity: 0.88,
                  lineCap: 'round',
                  lineJoin: 'round',
                }}
              />
            ))}

            {start ? (
              <Marker position={toLatLng(start)} icon={startIcon}>
                <Popup>Start</Popup>
              </Marker>
            ) : null}

            {end ? (
              <Marker position={toLatLng(end)} icon={endIcon}>
                <Popup>End</Popup>
              </Marker>
            ) : null}

            {route.waypoints.map((waypoint, index) => (
              <Marker
                key={`${route.id}-waypoint-${index}`}
                position={toLatLng(waypoint)}
                icon={waypointIcon}
              >
                <Popup>
                  <strong>{waypoint.name ?? 'Important point'}</strong>
                  {waypoint.description ? <span>{waypoint.description}</span> : null}
                </Popup>
              </Marker>
            ))}

            {roadInsights.map((insight) => (
              <Marker
                key={insight.id}
                position={[insight.lat, insight.lon]}
                icon={roadInsightIcons[insight.kind]}
              >
                <Popup>
                  <strong>{insight.label}</strong>
                  {insight.detail ? <span>{insight.detail}</span> : null}
                  <span>{formatDistance(insight.distanceFromRouteMeters)} from route</span>
                </Popup>
              </Marker>
            ))}

            {simulationPoint ? (
              <Marker position={toLatLng(simulationPoint)} icon={currentPositionIcon}>
                <Popup>Current position</Popup>
              </Marker>
            ) : null}
          </>
        ) : null}
      </MapContainer>

      <div className="map-type-control" role="group" aria-label="Map type">
        {mapTypeOptions.map(({ icon: Icon, label, value }) => (
          <button
            key={value}
            className="map-type-control__button"
            type="button"
            aria-pressed={mapType === value}
            onClick={() => onMapTypeChange(value)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="map-status" aria-live="polite">
        {route ? (
          <>
            <Navigation size={18} aria-hidden="true" />
            <span>{formatDistance(route.distanceMeters)}</span>
            <span>{route.pointCount.toLocaleString()} points</span>
          </>
        ) : (
          <>
            <MapPin size={18} aria-hidden="true" />
            <span>No route loaded</span>
          </>
        )}
      </div>
    </section>
  )
}

function FitRoute({ route }: { route: ImportedRoute }) {
  const map = useMap()

  useEffect(() => {
    const bounds = L.latLngBounds([
      [route.bounds.south, route.bounds.west],
      [route.bounds.north, route.bounds.east],
    ])

    route.waypoints.forEach((waypoint) => {
      bounds.extend(toLatLng(waypoint))
    })

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 17,
      animate: true,
    })
  }, [map, route])

  return null
}

function createRoadInsightIcon(kind: RoadInsightKind, label: string): L.DivIcon {
  return L.divIcon({
    className: `route-marker route-marker--insight route-marker--insight-${kind}`,
    html: `<span>${label}</span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  })
}

function FollowSimulation({
  point,
  enabled,
}: {
  point?: RoutePoint
  enabled: boolean
}) {
  const map = useMap()

  useEffect(() => {
    if (!enabled || !point) {
      return
    }

    map.flyTo(toLatLng(point), Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 0.45,
    })
  }, [enabled, map, point])

  return null
}

function toLatLng(point: RoutePoint): LatLngExpression {
  return [point.lat, point.lon]
}
