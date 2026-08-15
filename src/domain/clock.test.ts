import { describe, expect, it } from 'vitest'
import {
  commitWallClock,
  currentPeriod,
  finishPeriodElapsed,
  formatClock,
  gameMinute,
  isLastPeriod,
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

  it('maps elapsed time onto 12-minute periods', () => {
    expect(currentPeriod(0, 12, 4)).toBe(1)
    expect(currentPeriod(719, 12, 4)).toBe(1)
    expect(currentPeriod(720, 12, 4)).toBe(2)
    expect(currentPeriod(13 * 60, 12, 4)).toBe(2)
    expect(currentPeriod(36 * 60, 12, 4)).toBe(4)
  })

  it('snaps finish-period to the next period start', () => {
    expect(finishPeriodElapsed(8 * 60, 12, 4)).toBe(12 * 60)
    expect(finishPeriodElapsed(12 * 60, 12, 4)).toBe(24 * 60)
    expect(isLastPeriod(36 * 60, 12, 4)).toBe(true)
    expect(finishPeriodElapsed(36 * 60, 12, 4)).toBe(36 * 60)
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
