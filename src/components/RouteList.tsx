import { MapPinned, Trash2 } from 'lucide-react'
import { formatDateTime, formatDistance } from '../lib/format'
import type { ImportedRoute } from '../types/route'

type RouteListProps = {
  routes: ImportedRoute[]
  activeRouteId?: string
  onSelectRoute: (routeId: string) => void
  onDeleteRoute: (routeId: string) => void
}

export default function RouteList({
  routes,
  activeRouteId,
  onSelectRoute,
  onDeleteRoute,
}: RouteListProps) {
  if (routes.length === 0) {
    return <p className="empty-text">No saved routes</p>
  }

  return (
    <div className="route-list" aria-label="Saved routes">
      {routes.map((route) => (
        <article
          key={route.id}
          className={`route-card${route.id === activeRouteId ? ' route-card--active' : ''}`}
        >
          <button
            className="route-card__main"
            type="button"
            onClick={() => onSelectRoute(route.id)}
          >
            <span className="route-card__icon">
              <MapPinned size={18} aria-hidden="true" />
            </span>
            <span>
              <strong>{route.name}</strong>
              <span>
                {formatDistance(route.distanceMeters)} · {route.pointCount.toLocaleString()}{' '}
                points
              </span>
              <small>{formatDateTime(route.importedAt)}</small>
            </span>
          </button>

          <button
            className="icon-button"
            type="button"
            aria-label={`Delete ${route.name}`}
            title="Delete route"
            onClick={() => onDeleteRoute(route.id)}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </article>
      ))}
    </div>
  )
}
