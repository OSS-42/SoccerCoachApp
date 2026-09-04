import { describe, expect, it } from 'vitest'
import { createAction } from '@/domain/actions'
import type { Game, Player, Team } from '@/domain/types'
import { setLocale } from '@/i18n'
import { buildReportDialogHtml } from './reportView'

function player(id: string, name: string, jerseyNumber: number): Player {
  return { id, name, jerseyNumber, position: 'CM' }
}

function game(partial: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    date: '2026-08-15',
    teamName: 'TEAM A',
    opponentName: 'RIVALS',
    matchType: '7v7',
    numPeriods: 4,
    periodDuration: 12,
    homeScore: 0,
    awayScore: 0,
    startTime: '',
    endTime: '',
    actions: [],
    formation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
    startingFormation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 12 * 60,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...partial,
  }
}

function team(players: Player[], match: Game): Team {
  return {
    id: 't1',
    name: 'TEAM A',
    players,
    games: [match],
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
    defaultUnavailable: {},
  }
}

describe('end-game report stats cards', () => {
  it('shows interceptions on the player stats card', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 8)]
    const match = game({
      actions: [createAction('interception', 'p1', 90), createAction('interception', 'p1', 200)],
    })
    const html = buildReportDialogHtml(match, team(players, match))
    expect(html).toContain('Intercept')
    expect(html).toMatch(/<span class="stat-metric-value">2<\/span>\s*<span class="stat-metric-label">Intercept<\/span>/)
  })
})
