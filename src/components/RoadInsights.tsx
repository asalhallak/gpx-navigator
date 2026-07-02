import {
  AlertTriangle,
  CircleDot,
  MapPinned,
  RefreshCw,
  Route,
  ShieldAlert,
  TrafficCone,
} from 'lucide-react'
import type { RoadInsightsStatus } from '../hooks/useRoadInsights'
import { formatDistance } from '../lib/format'
import type { RoadInsight, RoadInsightKind } from '../types/roadInsight'
import type { ImportedRoute } from '../types/route'

type RoadInsightsProps = {
  route?: ImportedRoute
  insights: RoadInsight[]
  status: RoadInsightsStatus
  error?: string
  onRefresh: () => void
}

const insightLabels: Record<RoadInsightKind, string> = {
  traffic_signal: 'Signals',
  crossing: 'Crossings',
  roundabout: 'Roundabouts',
  speed_limit: 'Speed limits',
  road_type: 'Road types',
  priority: 'Priority',
  traffic_sign: 'Signs',
}

export default function RoadInsights({
  route,
  insights,
  status,
  error,
  onRefresh,
}: RoadInsightsProps) {
  if (!route) {
    return (
      <div className="insights-empty">
        <TrafficCone size={20} aria-hidden="true" />
        <span>Load a GPX route to check road cues</span>
      </div>
    )
  }

  const counts = getInsightCounts(insights)
  const topInsights = insights.slice(0, 9)

  return (
    <div className="insights-panel">
      <div className="insights-toolbar">
        <span className={`inline-status inline-status--${status}`}>
          {status === 'loading' ? (
            <RefreshCw size={15} aria-hidden="true" />
          ) : (
            <MapPinned size={15} aria-hidden="true" />
          )}
          {getStatusLabel(status, insights.length)}
        </span>
        <button
          className="icon-button icon-button--strong"
          type="button"
          aria-label="Refresh road cues"
          title="Refresh"
          onClick={onRefresh}
          disabled={status === 'loading'}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
      </div>

      {status === 'error' ? (
        <div className="notice notice--error" role="status">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error ?? 'OSM road cues could not be loaded.'}</span>
        </div>
      ) : null}

      {insights.length > 0 ? (
        <>
          <div className="insight-counts" aria-label="Road cue summary">
            {Object.entries(counts).map(([kind, count]) => (
              <span key={kind}>
                {insightLabels[kind as RoadInsightKind]} {count}
              </span>
            ))}
          </div>

          <div className="insight-list">
            {topInsights.map((insight) => (
              <article key={insight.id} className="insight-row">
                <span className={`insight-icon insight-icon--${insight.kind}`}>
                  {getInsightIcon(insight.kind)}
                </span>
                <span>
                  <strong>{insight.label}</strong>
                  <small>
                    {insight.detail ? `${insight.detail} · ` : ''}
                    {formatDistance(insight.distanceFromRouteMeters)} from route
                  </small>
                </span>
              </article>
            ))}
          </div>
        </>
      ) : status === 'loaded' ? (
        <p className="empty-text">No nearby OSM road cues found</p>
      ) : null}
    </div>
  )
}

function getInsightCounts(insights: RoadInsight[]): Partial<Record<RoadInsightKind, number>> {
  return insights.reduce<Partial<Record<RoadInsightKind, number>>>((counts, insight) => {
    counts[insight.kind] = (counts[insight.kind] ?? 0) + 1
    return counts
  }, {})
}

function getStatusLabel(status: RoadInsightsStatus, insightCount: number): string {
  if (status === 'loading') {
    return 'Loading OSM cues'
  }

  if (status === 'error') {
    return 'OSM cues unavailable'
  }

  if (status === 'loaded') {
    return `${insightCount} cues`
  }

  return 'Waiting'
}

function getInsightIcon(kind: RoadInsightKind) {
  if (kind === 'speed_limit') {
    return <CircleDot size={15} aria-hidden="true" />
  }

  if (kind === 'priority' || kind === 'traffic_sign') {
    return <ShieldAlert size={15} aria-hidden="true" />
  }

  if (kind === 'road_type') {
    return <Route size={15} aria-hidden="true" />
  }

  return <TrafficCone size={15} aria-hidden="true" />
}
