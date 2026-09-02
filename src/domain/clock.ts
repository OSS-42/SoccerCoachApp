import type { ClockState, PeriodScore } from './types'

export function parseClockInput(raw: string): number | null {
  const text = raw.trim().replace(',', ':').replace(/m/i, ':')
  if (!text) return null
  if (/^\d+$/.test(text)) return Number(text) * 60
  const match = text.match(/^(\d+)\s*:\s*(\d{1,2})$/)
  if (!match) return null
  const minutes = Number(match[1])
  const seconds = Number(match[2])
  if (seconds > 59) return null
  return minutes * 60 + seconds
}

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

/**
 * Live period from how many periods were confirmed ended, not from the clock.
 * A 20-minute period that runs to 21:00 is still period 1 until Stop is confirmed.
 */
export function livePeriodNumber(game: {
  numPeriods: number
  periodScores: { length: number }
}): number {
  return Math.min(game.numPeriods, game.periodScores.length + 1)
}

export function isLastLivePeriod(game: {
  numPeriods: number
  periodScores: { length: number }
}): boolean {
  return game.periodScores.length >= Math.max(0, game.numPeriods - 1)
}

/** Snap elapsed time to the start of the next period (end of the current one). */
export function finishPeriodElapsed(
  elapsedSeconds: number,
  periodDurationMin: number,
  numPeriods: number,
  periodsCompleted = 0,
): number {
  const periodSec = Math.max(1, periodDurationMin) * 60
  if (periodsCompleted >= numPeriods - 1) return elapsedSeconds
  const nextScheduledStart = (periodsCompleted + 1) * periodSec
  return Math.max(elapsedSeconds, nextScheduledStart)
}

/** Minute marks drawn between periods (20, 40, …). */
export function periodBreakMinutes(numPeriods: number, periodDurationMin: number): number[] {
  const breaks: number[] = []
  for (let i = 1; i < numPeriods; i += 1) breaks.push(i * periodDurationMin)
  return breaks
}

/**
 * Period n is [ (n-1)*dur, n*dur ) seconds. The boundary (e.g. 20:00 after
 * ending a 20-minute period) belongs to the next period, so a goal recorded
 * right after confirm is not listed in the period that just ended.
 */
export function actionIsAtOrAfterPeriodBreak(gameSecond: number, breakMinute: number): boolean {
  return gameSecond >= breakMinute * 60
}

/** Period an action belongs to. Stamped `period` wins; else scheduled clock buckets. */
export function periodOfAction(
  action: { gameSecond: number; period?: number },
  game: { numPeriods: number; periodDuration: number; periodScores: PeriodScore[] },
): number {
  if (typeof action.period === 'number' && Number.isFinite(action.period) && action.period >= 1) {
    return Math.min(game.numPeriods, Math.floor(action.period))
  }
  return currentPeriod(action.gameSecond, game.periodDuration, game.numPeriods)
}

/**
 * Period-end marks to draw before listing an action in a later period.
 * `shownPeriod` is the 1-based period currently open in the log (starts at 1).
 */
export function periodEndMarksBefore(
  shownPeriod: number,
  actionPeriod: number,
): { filled: number[]; shownPeriod: number } {
  const filled: number[] = []
  let shown = Math.max(1, shownPeriod)
  const target = Math.max(shown, actionPeriod)
  while (shown < target) {
    filled.push(shown)
    shown += 1
  }
  return { filled, shownPeriod: shown }
}

/** Marks for periods that had no events after the last listed action. */
export function remainingPeriodEndMarks(shownPeriod: number, numPeriods: number): number[] {
  const filled: number[] = []
  for (let p = Math.max(1, shownPeriod); p < numPeriods; p += 1) filled.push(p)
  return filled
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
