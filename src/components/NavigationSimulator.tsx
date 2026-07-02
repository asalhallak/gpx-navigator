import {
  CarFront,
  ExternalLink,
  LocateFixed,
  Pause,
  Play,
  RotateCcw,
  StepBack,
  StepForward,
} from 'lucide-react'
import { formatDistance } from '../lib/format'
import {
  createStreetViewUrl,
  getPointHeading,
  getSimulationPoint,
  getSimulationProgress,
  type SimulationTrack,
} from '../lib/simulation'
import StreetViewPreview from './StreetViewPreview'

type NavigationSimulatorProps = {
  track: SimulationTrack
  currentIndex: number
  isPlaying: boolean
  followMap: boolean
  onTogglePlay: () => void
  onStep: (delta: number) => void
  onChangeIndex: (index: number) => void
  onReset: () => void
  onFollowMapChange: (followMap: boolean) => void
}

export default function NavigationSimulator({
  track,
  currentIndex,
  isPlaying,
  followMap,
  onTogglePlay,
  onStep,
  onChangeIndex,
  onReset,
  onFollowMapChange,
}: NavigationSimulatorProps) {
  const progress = getSimulationProgress(track, currentIndex)
  const point = getSimulationPoint(track, currentIndex)
  const heading = getPointHeading(track, currentIndex)
  const hasRoute = track.points.length > 1
  const maxIndex = Math.max(track.points.length - 1, 0)

  if (!hasRoute) {
    return (
      <div className="simulator-empty">
        <CarFront size={20} aria-hidden="true" />
        <span>Load a GPX route to start car mode</span>
      </div>
    )
  }

  return (
    <div className="simulator-panel">
      <div className="simulator-actions">
        <button
          className="icon-button icon-button--strong"
          type="button"
          aria-label="Reset route simulation"
          title="Reset"
          onClick={onReset}
        >
          <RotateCcw size={17} aria-hidden="true" />
        </button>
        <button
          className="icon-button icon-button--strong"
          type="button"
          aria-label="Previous route point"
          title="Previous point"
          onClick={() => onStep(-1)}
        >
          <StepBack size={18} aria-hidden="true" />
        </button>
        <button
          className="button button--primary simulator-play"
          type="button"
          aria-label={isPlaying ? 'Pause route simulation' : 'Play route simulation'}
          onClick={onTogglePlay}
        >
          {isPlaying ? <Pause size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          className="icon-button icon-button--strong"
          type="button"
          aria-label="Next route point"
          title="Next point"
          onClick={() => onStep(1)}
        >
          <StepForward size={18} aria-hidden="true" />
        </button>
      </div>

      <label className="simulator-slider">
        <span>
          Step {progress.stepNumber.toLocaleString()} of{' '}
          {progress.totalSteps.toLocaleString()}
        </span>
        <input
          type="range"
          min="0"
          max={maxIndex}
          value={progress.index}
          aria-label="Route position"
          onChange={(event) => onChangeIndex(Number(event.currentTarget.value))}
        />
      </label>

      <div className="simulator-progress" aria-hidden="true">
        <span style={{ width: `${progress.percent}%` }} />
      </div>

      <dl className="simulator-stats">
        <div>
          <dt>Driven</dt>
          <dd>{formatDistance(progress.distanceMeters)}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{formatDistance(progress.remainingMeters)}</dd>
        </div>
      </dl>

      <div className="simulator-toolbar">
        <label className="toggle-control">
          <input
            type="checkbox"
            checked={followMap}
            onChange={(event) => onFollowMapChange(event.currentTarget.checked)}
          />
          <span>
            <LocateFixed size={15} aria-hidden="true" />
            Follow
          </span>
        </label>

        {point ? (
          <a
            className="button button--secondary"
            href={createStreetViewUrl(point, heading)}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} aria-hidden="true" />
            Street View
          </a>
        ) : null}
      </div>

      <StreetViewPreview point={point} heading={heading} />
    </div>
  )
}
