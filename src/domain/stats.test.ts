import { describe, expect, it } from 'vitest'
import { calculateSeasonStats } from './stats'
import type { Game, Player } from './types'

const players: Player[] = [
  { id: 'p1', name: 'ALEX', jerseyNumber: 9, position: 'ST' },
  { id: 'p2', name: 'SAM', jerseyNumber: 1, position: 'GK' },
]

function completed(partial: Partial<Game>): Game {
  return {
    id: 'g',
    date: '2026-08-01',
    teamName: 'A',
    opponentName: 'B',
    matchType: '7v7',
    numPeriods: 4,
    periodDuration: 12,
    homeScore: 1,
    awayScore: 0,
    startTime: '',
    endTime: '',
    actions: [],
    formation: [{ playerId: 'p1', position: 'ST-1', x: 50, y: 10 }],
    startingFormation: [{ playerId: 'p1', position: 'ST-1', x: 50, y: 10 }],
    substitutes: ['p2'],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 100,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...partial,
  }
}

describe('season stats', () => {
  it('counts games played from formation/bench, not from having an action', () => {
    const rows = calculateSeasonStats(players, [completed({})])
    const alex = rows.find((r) => r.playerId === 'p1')
    const sam = rows.find((r) => r.playerId === 'p2')
    expect(alex?.gamesPlayed).toBe(1)
    expect(sam?.gamesPlayed).toBe(1)
  })

  it('counts goals from actions only', () => {
    const rows = calculateSeasonStats(players, [
      completed({
        actions: [
          {
            id: 'a1',
            actionType: 'goal',
            playerId: 'p1',
            gameSecond: 20,
            timestamp: '',
          },
        ],
      }),
    ])
    expect(rows.find((r) => r.playerId === 'p1')?.goals).toBe(1)
    expect(rows.find((r) => r.playerId === 'p2')?.goals).toBe(0)
  })

  it('counts interceptions from actions', () => {
    const rows = calculateSeasonStats(players, [
      completed({
        actions: [
          {
            id: 'a1',
            actionType: 'interception',
            playerId: 'p1',
            gameSecond: 20,
            timestamp: '',
          },
        ],
      }),
    ])
    expect(rows.find((r) => r.playerId === 'p1')?.interceptions).toBe(1)
    expect(rows.find((r) => r.playerId === 'p2')?.interceptions).toBe(0)
  })

  it('sums on-field minutes across completed games', () => {
    const rows = calculateSeasonStats(players, [
      completed({ id: 'g1', elapsedSeconds: 600 }),
      completed({ id: 'g2', elapsedSeconds: 300 }),
    ])
    expect(rows.find((r) => r.playerId === 'p1')?.minutesPlayed).toBe(15)
    expect(rows.find((r) => r.playerId === 'p2')?.minutesPlayed).toBe(0)
  })
})
