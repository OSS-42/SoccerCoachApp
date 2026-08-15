import type { ClockState } from './types'

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function currentPeriod(
  elapsedSeconds: number,
  periodDurationMin: number,
  numPeriods: number,
): number {
  const periodSec = Math.max(1, periodDurationMin) * 60
  const index = Math.floor(Math.max(0, elapsedSeconds) / periodSec)
  return Math.min(numPeriods, index + 1)
}

export function isLastPeriod(
  elapsedSeconds: number,
  periodDurationMin: number,
  numPeriods: number,
): boolean {
  return currentPeriod(elapsedSeconds, periodDurationMin, numPeriods) >= numPeriods
}

/** Snap elapsed time to the start of the next period (end of the current one). */
export function finishPeriodElapsed(
  elapsedSeconds: number,
  periodDurationMin: number,
  numPeriods: number,
): number {
  const periodSec = Math.max(1, periodDurationMin) * 60
  const period = currentPeriod(elapsedSeconds, periodDurationMin, numPeriods)
  if (period >= numPeriods) return elapsedSeconds
  return period * periodSec
}

export function gameMinute(elapsedSeconds: number): number {
  return Math.floor(Math.max(0, elapsedSeconds) / 60)
}

/** Elapsed match seconds, including time spent in the background. */
export function wallElapsed(clock: ClockState, now = Date.now()): number {
  if (!clock.running || !clock.runningStartedAt) return Math.max(0, clock.elapsedSeconds)
  return clock.elapsedSeconds + Math.max(0, Math.floor((now - clock.runningStartedAt) / 1000))
}

export function wallSubRemaining(clock: ClockState, now = Date.now()): number {
  if (!clock.useSubstitutionTimer) return Math.max(0, clock.subRemaining)
  if (!clock.subRunning || !clock.runningStartedAt) return Math.max(0, clock.subRemaining)
  const delta = Math.max(0, Math.floor((now - clock.runningStartedAt) / 1000))
  return Math.max(0, clock.subRemaining - delta)
}

/** Fold wall-clock delta into stored seconds so a save/pause stays accurate. */
export function commitWallClock(clock: ClockState, now = Date.now()): ClockState {
  const elapsedSeconds = wallElapsed(clock, now)
  const subRemaining = wallSubRemaining(clock, now)
  return {
    ...clock,
    elapsedSeconds,
    subRemaining,
    runningStartedAt: clock.running ? now : null,
    subRunning: clock.running && clock.useSubstitutionTimer && subRemaining > 0,
  }
}
