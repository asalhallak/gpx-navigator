import { describe, expect, it } from 'vitest'
import { calculateBounds, calculateRouteDistance, countRoutePoints } from './routeStats'

describe('routeStats', () => {
  it('calculates route bounds', () => {
    expect(
      calculateBounds([
        { lat: 52.52, lon: 13.4 },
        { lat: 52.54, lon: 13.45 },
        { lat: 52.51, lon: 13.39 },
      ]),
    ).toEqual({
      north: 52.54,
      south: 52.51,
      east: 13.45,
      west: 13.39,
    })
  })

  it('counts points across segments', () => {
    expect(
      countRoutePoints([
        [
          { lat: 1, lon: 1 },
          { lat: 2, lon: 2 },
        ],
        [{ lat: 3, lon: 3 }],
      ]),
    ).toBe(3)
  })

  it('calculates distance without connecting separate segments', () => {
    const distance = calculateRouteDistance([
      [
        { lat: 0, lon: 0 },
        { lat: 0, lon: 1 },
      ],
      [
        { lat: 20, lon: 20 },
        { lat: 20, lon: 21 },
      ],
    ])

    expect(distance).toBeGreaterThan(215_000)
    expect(distance).toBeLessThan(220_000)
  })
})
