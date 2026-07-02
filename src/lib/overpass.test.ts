import { describe, expect, it } from 'vitest'
import type { ImportedRoute } from '../types/route'
import { createOverpassQuery, parseOverpassInsights } from './overpass'

const route: ImportedRoute = {
  id: 'route-1',
  name: 'Road cue route',
  sourceFile: 'route.gpx',
  importedAt: '2026-07-02T08:00:00.000Z',
  bounds: {
    north: 0.01,
    south: 0,
    east: 0.01,
    west: 0,
  },
  distanceMeters: 0,
  pointCount: 2,
  segments: [
    [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 0.01 },
    ],
  ],
  waypoints: [],
}

describe('overpass helpers', () => {
  it('creates an Overpass query for exam-relevant road cues', () => {
    const query = createOverpassQuery(route.bounds)

    expect(query).toContain('[out:json][timeout:25]')
    expect(query).toContain('node["highway"="traffic_signals"]')
    expect(query).toContain('node["highway"="crossing"]')
    expect(query).toContain('way["junction"="roundabout"]')
    expect(query).toContain('way["maxspeed"]')
    expect(query).toContain('-0.002,-0.002,0.012,0.012')
  })

  it('normalizes and filters nearby OSM road cues', () => {
    const insights = parseOverpassInsights(
      {
        elements: [
          {
            type: 'node',
            id: 1,
            lat: 0,
            lon: 0.001,
            tags: { highway: 'traffic_signals' },
          },
          {
            type: 'node',
            id: 2,
            lat: 0,
            lon: 0.002,
            tags: { highway: 'crossing', crossing: 'zebra' },
          },
          {
            type: 'way',
            id: 3,
            center: { lat: 0, lon: 0.003 },
            tags: { highway: 'residential', junction: 'roundabout' },
          },
          {
            type: 'way',
            id: 4,
            center: { lat: 0, lon: 0.004 },
            tags: { highway: 'primary', maxspeed: '50' },
          },
          {
            type: 'node',
            id: 5,
            lat: 1,
            lon: 1,
            tags: { highway: 'traffic_signals' },
          },
        ],
      },
      route,
      { maxDistanceMeters: 80 },
    )

    expect(insights.map((insight) => insight.kind)).toEqual([
      'traffic_signal',
      'crossing',
      'roundabout',
      'road_type',
      'speed_limit',
      'road_type',
    ])
    expect(insights.find((insight) => insight.kind === 'crossing')?.detail).toBe('zebra')
    expect(insights.some((insight) => insight.id.includes('node-5'))).toBe(false)
  })
})
