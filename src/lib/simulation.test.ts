import { describe, expect, it } from 'vitest'
import type { ImportedRoute } from '../types/route'
import {
  buildSimulationTrack,
  clampSimulationIndex,
  createStreetViewUrl,
  getPointHeading,
  getSimulationProgress,
} from './simulation'

const route: ImportedRoute = {
  id: 'route-1',
  name: 'Exam loop',
  sourceFile: 'exam.gpx',
  importedAt: '2026-07-02T08:00:00.000Z',
  bounds: {
    north: 20,
    south: 0,
    east: 21,
    west: 0,
  },
  distanceMeters: 0,
  pointCount: 4,
  segments: [
    [
      { lat: 0, lon: 0 },
      { lat: 0, lon: 1 },
    ],
    [
      { lat: 20, lon: 20 },
      { lat: 20, lon: 21 },
    ],
  ],
  waypoints: [],
}

describe('simulation utilities', () => {
  it('flattens route points while preserving segment distance breaks', () => {
    const track = buildSimulationTrack(route)

    expect(track.points).toHaveLength(4)
    expect(track.cumulativeDistances[0]).toBe(0)
    expect(track.cumulativeDistances[1]).toBeGreaterThan(111_000)
    expect(track.cumulativeDistances[2]).toBe(track.cumulativeDistances[1])
    expect(track.totalDistanceMeters).toBeGreaterThan(215_000)
    expect(track.totalDistanceMeters).toBeLessThan(220_000)
  })

  it('clamps simulation indices to the available points', () => {
    const track = buildSimulationTrack(route)

    expect(clampSimulationIndex(-10, track)).toBe(0)
    expect(clampSimulationIndex(2.4, track)).toBe(2)
    expect(clampSimulationIndex(99, track)).toBe(3)
  })

  it('reports distance-based route progress', () => {
    const track = buildSimulationTrack(route)
    const progress = getSimulationProgress(track, 1)

    expect(progress.stepNumber).toBe(2)
    expect(progress.totalSteps).toBe(4)
    expect(progress.distanceMeters).toBe(track.cumulativeDistances[1])
    expect(progress.remainingMeters).toBeGreaterThan(100_000)
    expect(progress.percent).toBeGreaterThan(50)
    expect(progress.percent).toBeLessThan(52)
  })

  it('calculates the current Street View heading', () => {
    const track = buildSimulationTrack(route)

    expect(getPointHeading(track, 0)).toBeCloseTo(90, 0)
    expect(getPointHeading(track, 3)).toBeCloseTo(90, 0)
  })

  it('creates a Google Street View URL for the simulated point', () => {
    const url = createStreetViewUrl({ lat: 52.52, lon: 13.405 }, 91)

    expect(url).toContain('https://www.google.com/maps/@?')
    expect(url).toContain('map_action=pano')
    expect(url).toContain('viewpoint=52.52%2C13.405')
    expect(url).toContain('heading=91')
  })
})
