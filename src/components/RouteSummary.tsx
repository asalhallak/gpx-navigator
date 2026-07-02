import { CalendarClock, Flag, Gauge, Map, MapPin, Timer } from 'lucide-react'
import { formatDateTime, formatDistance, formatDuration } from '../lib/format'
import type { ImportedRoute } from '../types/route'

type RouteSummaryProps = {
  route?: ImportedRoute
}

export default function RouteSummary({ route }: RouteSummaryProps) {
  if (!route) {
    return (
      <div className="summary-empty">
        <Map size={22} aria-hidden="true" />
        <span>Ready for a GPX route</span>
      </div>
    )
  }

  return (
    <div className="summary-grid">
      <SummaryItem
        icon={<Flag size={18} aria-hidden="true" />}
        label="Route"
        value={route.name}
      />
      <SummaryItem
        icon={<Gauge size={18} aria-hidden="true" />}
        label="Distance"
        value={formatDistance(route.distanceMeters)}
      />
      <SummaryItem
        icon={<MapPin size={18} aria-hidden="true" />}
        label="Points"
        value={route.pointCount.toLocaleString()}
      />
      <SummaryItem
        icon={<Timer size={18} aria-hidden="true" />}
        label="Duration"
        value={formatDuration(route.durationSeconds)}
      />
      <SummaryItem
        icon={<CalendarClock size={18} aria-hidden="true" />}
        label="Imported"
        value={formatDateTime(route.importedAt)}
      />
    </div>
  )
}

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="summary-item">
      <span className="summary-item__icon">{icon}</span>
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    </div>
  )
}
