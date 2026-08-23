import { describe, expect, it } from 'vitest'
import { FORCE_PRO } from './config'
import {
  capCompletedGames,
  canSelectTeam,
  isPro,
  liteHomeTeamId,
  liteReportLimitReached,
} from './entitlement'
import { freshSave } from './migrate'
import type { Game } from './types'

function game(id: string, date: string): Game {
  return {
    id,
    date,
    teamName: 'TEAM A',
    opponentName: 'RIVALS',
    matchType: '7v7',
    numPeriods: 2,
    periodDuration: 20,
    homeScore: 0,
    awayScore: 0,
    startTime: `${date}T10:00:00.000Z`,
    endTime: `${date}T11:00:00.000Z`,
    actions: [],
    formation: [],
    startingFormation: [],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 2400,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
  }
}

describe('entitlement', () => {
  it('defaults to Lite and only Team A plus demo are selectable', () => {
    const save = freshSave()
    expect(save.entitlement).toBe('lite')
    expect(isPro(save)).toBe(FORCE_PRO)
    expect(liteHomeTeamId(save.teams)).toBe('t1')
    expect(canSelectTeam(save, 't1')).toBe(true)
    expect(canSelectTeam(save, 't-demo')).toBe(true)
    expect(canSelectTeam(save, 't2')).toBe(FORCE_PRO)
  })

  it('caps completed reports to the five newest', () => {
    const games = [
      game('g1', '2026-01-01'),
      game('g2', '2026-01-02'),
      game('g3', '2026-01-03'),
      game('g4', '2026-01-04'),
      game('g5', '2026-01-05'),
      game('g6', '2026-01-06'),
    ]
    expect(liteReportLimitReached(games.slice(0, 5))).toBe(true)
    const kept = capCompletedGames(games, 5)
    expect(kept.map((g) => g.id)).toEqual(['g6', 'g5', 'g4', 'g3', 'g2'])
  })
})
