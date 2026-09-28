import { beforeEach, describe, expect, it } from 'vitest'
import { setLocale } from '@/i18n'
import { createAction } from './actions'
import { buildSeasonStatsPdf, seasonPdfFileName } from './seasonPdf'
import { calculateSeasonStats, seasonMetrics, seasonRecord, seasonTotals } from './stats'
import type { FormationSpot, Game, Player, Team } from './types'

function player(id: string, name: string, jerseyNumber: number): Player {
  return { id, name, jerseyNumber, position: 'CM' }
}

function match(id: string, date: string, home: number, away: number, lineup: string[], extra: Partial<Game> = {}): Game {
  const formation: FormationSpot[] = lineup.map((playerId, i) => ({ playerId, position: i === 0 ? 'GK' : 'CM', x: 50, y: 50 }))
  return {
    id,
    date,
    teamName: 'U13 TIGERS',
    opponentName: 'RIVALS',
    matchType: '7v7',
    numPeriods: 2,
    periodDuration: 25,
    homeScore: home,
    awayScore: away,
    startTime: `${date}T14:00:00.000Z`,
    endTime: `${date}T15:00:00.000Z`,
    actions: [],
    formation,
    startingFormation: formation,
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 3000,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...extra,
  }
}

function team(players: Player[], games: Game[]): Team {
  return {
    id: 't1',
    name: 'U13 Tigers',
    players,
    games,
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
    defaultUnavailable: {},
  }
}

const pdfText = (pdf: ReturnType<typeof buildSeasonStatsPdf>) => Buffer.from(pdf.output('arraybuffer')).toString('latin1')

beforeEach(() => setLocale('en'))

describe('season record and totals', () => {
  const players = [player('a', 'ADA', 9), player('b', 'BEA', 7)]
  const games = [
    match('g1', '2026-09-06', 3, 1, ['a', 'b'], { actions: [createAction('goal', 'a', 60), createAction('goal', 'a', 600)] }),
    match('g2', '2026-09-13', 1, 1, ['a']),
    match('g3', '2026-09-20', 0, 2, ['a', 'b'], { isCompleted: false }),
    match('g4', '2026-09-27', 0, 2, ['b']),
  ]

  it('counts wins, draws, losses and goals of completed games in the range', () => {
    expect(seasonRecord(games, null, null)).toEqual({ played: 3, wins: 1, draws: 1, losses: 1, goalsFor: 4, goalsAgainst: 4 })
    expect(seasonRecord(games, '2026-09-10', null)).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1 })
  })

  it('team games and minutes come from the matches, not a sum over players', () => {
    const rows = calculateSeasonStats(players, games)
    expect(rows.map((r) => r.gamesPlayed)).toEqual([2, 2])
    expect(rows.reduce((sum, r) => sum + r.minutesPlayed, 0)).toBe(4 * 50)
    const totals = seasonTotals(rows, games)
    expect(totals.goals).toBe(2)
    expect(totals.gamesPlayed).toBe(3)
    expect(totals.minutesPlayed).toBe(3 * 50)
    expect(seasonTotals(calculateSeasonStats(players, games, '2026-09-10', null), games, '2026-09-10', null)).toMatchObject({
      gamesPlayed: 2,
      minutesPlayed: 2 * 50,
    })
    expect(seasonMetrics(totals).map((m) => m.kind).filter(Boolean)).toEqual([
      'stat-goal',
      'stat-against',
      'stat-yellow',
      'stat-red',
    ])
  })
})

describe('season PDF', () => {
  it('shows the team card, the record and every player card', () => {
    const players = [player('a', 'ADA', 9), player('b', 'BEA', 7)]
    const games = [match('g1', '2026-09-06', 3, 1, ['a', 'b'], { actions: [createAction('goal', 'a', 60)] })]
    const text = pdfText(buildSeasonStatsPdf(team(players, games), { start: null, end: null }))
    for (const expected of ['U13 Tigers', 'Season statistics', 'All games', 'Totals', '1 games', 'ADA', 'BEA']) {
      expect(text).toContain(expected)
    }
  })

  it('flows player cards onto more pages, three per row', () => {
    const players = Array.from({ length: 20 }, (_, i) => player(`p${i}`, `PLAYER ${i}`, i + 1))
    const games = [match('g1', '2026-09-06', 1, 0, players.map((p) => p.id))]
    const pdf = buildSeasonStatsPdf(team(players, games), { start: '2026-09-01', end: '2026-09-30' })
    expect(pdf.getNumberOfPages()).toBe(2)
    expect(pdfText(pdf)).toContain('2026-09-01 to 2026-09-30')
  })

  it('names the file after the team and the date range', () => {
    const t = team([], [])
    expect(seasonPdfFileName(t, { start: null, end: null })).toBe('season-U13_Tigers-all.pdf')
    expect(seasonPdfFileName(t, { start: '2026-09-01', end: null })).toBe('season-U13_Tigers-2026-09-01-today.pdf')
  })
})
