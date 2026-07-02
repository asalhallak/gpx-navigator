import { describe, expect, it } from 'vitest'
import { GpxParseError, parseGpxRoute } from './gpx'

describe('parseGpxRoute', () => {
  it('parses a valid GPX track with route stats', () => {
    const route = parseGpxRoute(
      `<?xml version="1.0"?>
      <gpx version="1.1" creator="test">
        <metadata><name>Exam loop</name></metadata>
        <trk>
          <trkseg>
            <trkpt lat="52.5200" lon="13.4050">
              <ele>35</ele>
              <time>2026-01-01T08:00:00Z</time>
            </trkpt>
            <trkpt lat="52.5210" lon="13.4060">
              <ele>36</ele>
              <time>2026-01-01T08:02:00Z</time>
            </trkpt>
          </trkseg>
        </trk>
      </gpx>`,
      'exam-route.gpx',
    )

    expect(route.name).toBe('Exam loop')
    expect(route.pointCount).toBe(2)
    expect(route.segments).toHaveLength(1)
    expect(route.bounds.north).toBe(52.521)
    expect(route.bounds.south).toBe(52.52)
    expect(route.distanceMeters).toBeGreaterThan(100)
    expect(route.durationSeconds).toBe(120)
  })

  it('falls back to route points when track points are absent', () => {
    const route = parseGpxRoute(
      `<gpx version="1.1" creator="test">
        <rte>
          <name>Route fallback</name>
          <rtept lat="48.1371" lon="11.5754" />
          <rtept lat="48.1381" lon="11.5764" />
        </rte>
      </gpx>`,
      'fallback.gpx',
    )

    expect(route.name).toBe('Route fallback')
    expect(route.pointCount).toBe(2)
    expect(route.segments[0][0]).toMatchObject({ lat: 48.1371, lon: 11.5754 })
  })

  it('parses waypoints as important points', () => {
    const route = parseGpxRoute(
      `<gpx version="1.1" creator="test">
        <trk><trkseg>
          <trkpt lat="50.0" lon="8.0" />
          <trkpt lat="50.1" lon="8.1" />
        </trkseg></trk>
        <wpt lat="50.05" lon="8.05">
          <name>Roundabout</name>
          <desc>Practice lane choice</desc>
          <sym>Circle</sym>
        </wpt>
      </gpx>`,
      'with-waypoints.gpx',
    )

    expect(route.waypoints).toHaveLength(1)
    expect(route.waypoints[0]).toMatchObject({
      name: 'Roundabout',
      description: 'Practice lane choice',
      symbol: 'Circle',
    })
  })

  it('keeps multiple track segments separate', () => {
    const route = parseGpxRoute(
      `<gpx version="1.1" creator="test">
        <trk>
          <trkseg>
            <trkpt lat="51.0" lon="9.0" />
            <trkpt lat="51.1" lon="9.1" />
          </trkseg>
          <trkseg>
            <trkpt lat="51.2" lon="9.2" />
            <trkpt lat="51.3" lon="9.3" />
          </trkseg>
        </trk>
      </gpx>`,
      'segments.gpx',
    )

    expect(route.segments).toHaveLength(2)
    expect(route.pointCount).toBe(4)
  })

  it('rejects invalid XML', () => {
    expect(() => parseGpxRoute('<gpx><trk></gpx>', 'broken.gpx')).toThrow(GpxParseError)
  })

  it('rejects points with missing coordinates', () => {
    expect(() =>
      parseGpxRoute(
        `<gpx version="1.1" creator="test">
          <trk><trkseg>
            <trkpt lat="50.0" lon="8.0" />
            <trkpt lat="50.1" />
          </trkseg></trk>
        </gpx>`,
        'missing.gpx',
      ),
    ).toThrow(/longitude/)
  })

  it('rejects routes with fewer than two points', () => {
    expect(() =>
      parseGpxRoute(
        `<gpx version="1.1" creator="test">
          <trk><trkseg><trkpt lat="50.0" lon="8.0" /></trkseg></trk>
        </gpx>`,
        'short.gpx',
      ),
    ).toThrow(/at least two/)
  })
})
