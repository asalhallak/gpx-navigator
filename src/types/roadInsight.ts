export type RoadInsightKind =
  | 'traffic_signal'
  | 'crossing'
  | 'roundabout'
  | 'speed_limit'
  | 'road_type'
  | 'priority'
  | 'traffic_sign'

export type RoadInsight = {
  id: string
  kind: RoadInsightKind
  label: string
  detail?: string
  lat: number
  lon: number
  distanceFromRouteMeters: number
  source: 'osm'
}
