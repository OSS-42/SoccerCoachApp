import { describe, expect, it } from 'vitest'
import {
  commitWallClock,
  actionIsAtOrAfterPeriodBreak,
  currentPeriod,
  finishPeriodElapsed,
  formatClock,
  gameMinute,
  isLastLivePeriod,
  isLastPeriod,
  livePeriodNumber,
  parseClockInput,
  periodBreakMinutes,
  periodEndMarksBefore,
  periodOfAction,
  remainingPeriodEndMarks,
  wallElapsed,
  wallSubRemaining,
} from './clock'
import { DEFAULT_CLOCK } from './types'

describe('clock', () => {
  it('formats mm:ss', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(75)).toBe('1:15')
    expect(formatClock(720)).toBe('12:00')
  })

  it('parses minutes or m:ss', () => {
    expect(parseClockInput('12')).toBe(12 * 60)
    expect(parseClockInput('12:05')).toBe(12 * 60 + 5)
    expect(parseClockInput('1:70')).toBeNull()
    expect(parseClockInput('nope')).toBeNull()
  })

  it('maps elapsed time onto 12-minute periods', () => {
    expect(currentPeriod(0, 12, 4)).toBe(1)
    expect(currentPeriod(719, 12, 4)).toBe(1)
    expect(currentPeriod(720, 12, 4)).toBe(2)
    expect(currentPeriod(13 * 60, 12, 4)).toBe(2)
    expect(currentPeriod(36 * 60, 12, 4)).toBe(4)
  })

  it('snaps an early stop to the next scheduled start, and keeps added time', () => {
    expect(finishPeriodElapsed(8 * 60, 12, 4, 0)).toBe(12 * 60)
    expect(finishPeriodElapsed(12 * 60, 12, 4, 0)).toBe(12 * 60)
    expect(finishPeriodElapsed(12 * 60, 12, 4, 1)).toBe(24 * 60)
    expect(isLastPeriod(36 * 60, 12, 4)).toBe(true)
    expect(finishPeriodElapsed(36 * 60, 12, 4, 3)).toBe(36 * 60)
    expect(finishPeriodElapsed(8 * 60, 20, 3, 0)).toBe(20 * 60)
    expect(finishPeriodElapsed(21 * 60, 20, 3, 0)).toBe(21 * 60)
    expect(finishPeriodElapsed(29 * 60, 20, 3, 1)).toBe(40 * 60)
    expect(currentPeriod(20 * 60, 20, 3)).toBe(2)
  })

  it('uses confirmed period ends, not the clock, for the live period', () => {
    expect(livePeriodNumber({ numPeriods: 3, periodScores: [] })).toBe(1)
    expect(livePeriodNumber({ numPeriods: 3, periodScores: [{ home: 0, away: 0 }] })).toBe(2)
    expect(livePeriodNumber({ numPeriods: 3, periodScores: [{ home: 0, away: 0 }, { home: 1, away: 0 }] })).toBe(3)
    expect(isLastLivePeriod({ numPeriods: 3, periodScores: [] })).toBe(false)
    expect(isLastLivePeriod({ numPeriods: 3, periodScores: [{ home: 0, away: 0 }] })).toBe(false)
    expect(isLastLivePeriod({ numPeriods: 3, periodScores: [{ home: 0, away: 0 }, { home: 1, away: 0 }] })).toBe(true)
  })

  it('keeps a 21:00 action in period 1 when that period was stamped', () => {
    const game = { numPeriods: 3, periodDuration: 20, periodScores: [] as { home: number; away: number }[] }
    expect(periodOfAction({ gameSecond: 21 * 60, period: 1 }, game)).toBe(1)
    expect(periodOfAction({ gameSecond: 21 * 60, period: 2 }, game)).toBe(2)
    expect(periodOfAction({ gameSecond: 21 * 60 }, game)).toBe(2)
    expect(periodEndMarksBefore(1, 1)).toEqual({ filled: [], shownPeriod: 1 })
    expect(periodEndMarksBefore(1, 2)).toEqual({ filled: [1], shownPeriod: 2 })
    expect(remainingPeriodEndMarks(1, 3)).toEqual([1, 2])
  })

  it('puts an action at the period boundary on the next period', () => {
    expect(periodBreakMinutes(3, 20)).toEqual([20, 40])
    expect(actionIsAtOrAfterPeriodBreak(20 * 60 - 1, 20)).toBe(false)
    expect(actionIsAtOrAfterPeriodBreak(20 * 60, 20)).toBe(true)
    expect(actionIsAtOrAfterPeriodBreak(20 * 60 + 5, 20)).toBe(true)
    expect(gameMinute(20 * 60)).toBe(20)
  })

  it('reports whole minutes for action stamps', () => {
    expect(gameMinute(125)).toBe(2)
  })

  it('keeps counting while the tab is backgrounded', () => {
    const started = 1_700_000_000_000
    const clock = {
      ...DEFAULT_CLOCK,
      elapsedSeconds: 60,
      running: true,
      runningStartedAt: started,
      useSubstitutionTimer: true,
      subRunning: true,
      subRemaining: 120,
      subDuration: 120,
    }
    expect(wallElapsed(clock, started + 90_000)).toBe(150)
    expect(wallSubRemaining(clock, started + 90_000)).toBe(30)
    const committed = commitWallClock(clock, started + 90_000)
    expect(committed.elapsedSeconds).toBe(150)
    expect(committed.subRemaining).toBe(30)
    expect(committed.runningStartedAt).toBe(started + 90_000)
  })

  it('does not invent time when paused', () => {
    const clock = { ...DEFAULT_CLOCK, elapsedSeconds: 40, running: false, runningStartedAt: null }
    expect(wallElapsed(clock, Date.now() + 10_000)).toBe(40)
  })
})
