import { useEffect, useMemo, useState } from 'react'
import { CarFront, CircleAlert, ListChecks, Loader2, Trash2 } from 'lucide-react'
import NavigationSimulator from './components/NavigationSimulator'
import RoadInsights from './components/RoadInsights'
import RouteList from './components/RouteList'
import RouteMap from './components/RouteMap'
import RouteSummary from './components/RouteSummary'
import RouteUploader from './components/RouteUploader'
import { useRoadInsights } from './hooks/useRoadInsights'
import {
  getStoredMapType,
  getStoredPlaySpeed,
  saveMapType,
  savePlaySpeed,
  type MapType,
  type PlaySpeed,
} from './lib/appSettings'
import { GpxParseError, parseGpxRoute } from './lib/gpx'
import { clearRoutes, deleteRoute, getStoredRoutes, saveRoute } from './lib/routeStore'
import {
  buildSimulationTrack,
  clampSimulationIndex,
  getSimulationPoint,
} from './lib/simulation'
import type { ImportedRoute } from './types/route'

type Notice = {
  type: 'success' | 'error'
  message: string
}

const SIMULATION_STEP_INTERVAL_MS = 900

export default function App() {
  const [routes, setRoutes] = useState<ImportedRoute[]>([])
  const [activeRouteId, setActiveRouteId] = useState<string>()
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [simulationIndex, setSimulationIndex] = useState(0)
  const [isSimulationPlaying, setIsSimulationPlaying] = useState(false)
  const [playSpeed, setPlaySpeed] = useState<PlaySpeed>(() => getStoredPlaySpeed())
  const [mapType, setMapType] = useState<MapType>(() => getStoredMapType())
  const [followSimulation, setFollowSimulation] = useState(true)
  const [notice, setNotice] = useState<Notice>()

  const activeRoute = useMemo(
    () => routes.find((route) => route.id === activeRouteId) ?? routes[0],
    [activeRouteId, routes],
  )
  const simulationTrack = useMemo(() => buildSimulationTrack(activeRoute), [activeRoute])
  const simulationPoint = getSimulationPoint(simulationTrack, simulationIndex)
  const lastSimulationIndex = Math.max(simulationTrack.points.length - 1, 0)
  const roadInsights = useRoadInsights(activeRoute)

  useEffect(() => {
    getStoredRoutes()
      .then((storedRoutes) => {
        const sortedRoutes = sortRoutes(storedRoutes)
        setRoutes(sortedRoutes)
        setActiveRouteId(sortedRoutes[0]?.id)
      })
      .catch((error) => {
        setNotice({
          type: 'error',
          message: getErrorMessage(error, 'Saved routes could not be loaded.'),
        })
      })
      .finally(() => setIsLoadingRoutes(false))
  }, [])

  useEffect(() => {
    setSimulationIndex(0)
    setIsSimulationPlaying(false)
  }, [activeRoute?.id])

  useEffect(() => {
    if (!isSimulationPlaying || simulationTrack.points.length < 2) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      setSimulationIndex((currentIndex) =>
        clampSimulationIndex(currentIndex + 1, simulationTrack),
      )
    }, SIMULATION_STEP_INTERVAL_MS / playSpeed)

    return () => window.clearInterval(intervalId)
  }, [isSimulationPlaying, playSpeed, simulationTrack])

  useEffect(() => {
    if (isSimulationPlaying && simulationIndex >= lastSimulationIndex) {
      setIsSimulationPlaying(false)
    }
  }, [isSimulationPlaying, lastSimulationIndex, simulationIndex])

  async function handleFilesSelected(files: File[]) {
    setIsImporting(true)
    setNotice(undefined)

    const importedRoutes: ImportedRoute[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const route = parseGpxRoute(await file.text(), file.name)
        await saveRoute(route)
        importedRoutes.push(route)
      } catch (error) {
        errors.push(`${file.name}: ${getErrorMessage(error, 'Import failed.')}`)
      }
    }

    if (importedRoutes.length > 0) {
      setRoutes((currentRoutes) => sortRoutes([...importedRoutes, ...currentRoutes]))
      setActiveRouteId(importedRoutes[0].id)
    }

    if (errors.length > 0) {
      setNotice({ type: 'error', message: errors.join(' ') })
    } else if (importedRoutes.length > 0) {
      setNotice({
        type: 'success',
        message:
          importedRoutes.length === 1
            ? `${importedRoutes[0].name} imported`
            : `${importedRoutes.length} routes imported`,
      })
    }

    setIsImporting(false)
  }

  async function handleDeleteRoute(routeId: string) {
    await deleteRoute(routeId)
    setRoutes((currentRoutes) => {
      const nextRoutes = currentRoutes.filter((route) => route.id !== routeId)
      if (activeRouteId === routeId) {
        setActiveRouteId(nextRoutes[0]?.id)
      }
      return nextRoutes
    })
  }

  async function handleClearRoutes() {
    await clearRoutes()
    setRoutes([])
    setActiveRouteId(undefined)
    setNotice({ type: 'success', message: 'Routes cleared' })
  }

  function handleToggleSimulation() {
    if (simulationTrack.points.length < 2) {
      return
    }

    if (!isSimulationPlaying && simulationIndex >= lastSimulationIndex) {
      setSimulationIndex(0)
    }

    setIsSimulationPlaying((currentValue) => !currentValue)
  }

  function handleSimulationStep(delta: number) {
    setIsSimulationPlaying(false)
    setSimulationIndex((currentIndex) =>
      clampSimulationIndex(currentIndex + delta, simulationTrack),
    )
  }

  function handleSimulationIndexChange(index: number) {
    setIsSimulationPlaying(false)
    setSimulationIndex(clampSimulationIndex(index, simulationTrack))
  }

  function handleSimulationReset() {
    setIsSimulationPlaying(false)
    setSimulationIndex(0)
  }

  function handlePlaySpeedChange(nextPlaySpeed: PlaySpeed) {
    setPlaySpeed(nextPlaySpeed)
    savePlaySpeed(nextPlaySpeed)
  }

  function handleMapTypeChange(nextMapType: MapType) {
    setMapType(nextMapType)
    saveMapType(nextMapType)
  }

  function handleOpenStreetView() {
    setIsSimulationPlaying(false)
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Driving exam prep</p>
          <h1>GPX route review</h1>
        </div>
        <div className="header-badge">
          <CarFront size={18} aria-hidden="true" />
          <span>{routes.length} saved</span>
        </div>
      </header>

      <main className="workspace">
        <aside className="side-panel" aria-label="Route controls">
          <section className="panel-section">
            <RouteUploader disabled={isImporting} onFilesSelected={handleFilesSelected} />
            {notice ? (
              <div className={`notice notice--${notice.type}`} role="status">
                <CircleAlert size={16} aria-hidden="true" />
                <span>{notice.message}</span>
              </div>
            ) : null}
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <h2>Current route</h2>
              {isImporting ? (
                <span className="inline-status">
                  <Loader2 size={16} aria-hidden="true" />
                  Importing
                </span>
              ) : null}
            </div>
            <RouteSummary route={activeRoute} />
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <h2>Car mode</h2>
            </div>
            <NavigationSimulator
              track={simulationTrack}
              currentIndex={simulationIndex}
              isPlaying={isSimulationPlaying}
              playSpeed={playSpeed}
              followMap={followSimulation}
              onTogglePlay={handleToggleSimulation}
              onStep={handleSimulationStep}
              onChangeIndex={handleSimulationIndexChange}
              onReset={handleSimulationReset}
              onPlaySpeedChange={handlePlaySpeedChange}
              onFollowMapChange={setFollowSimulation}
              onOpenStreetView={handleOpenStreetView}
            />
          </section>

          <section className="panel-section">
            <div className="section-heading">
              <h2>Exam cues</h2>
            </div>
            <RoadInsights
              route={activeRoute}
              insights={roadInsights.insights}
              status={roadInsights.status}
              error={roadInsights.error}
              onRefresh={roadInsights.refresh}
            />
          </section>

          <section className="panel-section panel-section--fill">
            <div className="section-heading">
              <h2>Saved routes</h2>
              {routes.length > 0 ? (
                <button
                  className="text-button"
                  type="button"
                  onClick={handleClearRoutes}
                  title="Clear all routes"
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Clear
                </button>
              ) : null}
            </div>
            {isLoadingRoutes ? (
              <span className="inline-status">
                <Loader2 size={16} aria-hidden="true" />
                Loading
              </span>
            ) : (
              <RouteList
                routes={routes}
                activeRouteId={activeRoute?.id}
                onSelectRoute={setActiveRouteId}
                onDeleteRoute={handleDeleteRoute}
              />
            )}
          </section>

          <section className="panel-section">
            <div className="roadmap-strip">
              <ListChecks size={17} aria-hidden="true" />
              <span>Next: simulation, road preview, exam cues</span>
            </div>
          </section>
        </aside>

        <RouteMap
          route={activeRoute}
          simulationPoint={simulationPoint}
          followSimulation={followSimulation}
          roadInsights={roadInsights.insights}
          mapType={mapType}
          onMapTypeChange={handleMapTypeChange}
        />
      </main>
    </div>
  )
}

function sortRoutes(routes: ImportedRoute[]): ImportedRoute[] {
  return [...routes].sort(
    (a, b) => new Date(b.importedAt).getTime() - new Date(a.importedAt).getTime(),
  )
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof GpxParseError || error instanceof Error) {
    return error.message
  }

  return fallback
}
