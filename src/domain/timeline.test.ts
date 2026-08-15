import { describe, expect, it } from 'vitest'
import { buildShotTimeline } from './timeline'
import type { Game } from './types'

function game(actions: Game['actions']): Game {
  return {
    id: 'g',
    date: '2026-08-15',
    teamName: 'A',
    opponentName: 'B',
    matchType: '11v11',
    numPeriods: 4,
    periodDuration: 12,
    homeScore: 1,
    awayScore: 1,
    startTime: '',
    endTime: '',
    actions,
    formation: [],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
  }
}

describe('shot timeline', () => {
  it('groups our shots/goals up and opponent saves/GA down', () => {
    const chart = buildShotTimeline(
      game([
        { id: '1', actionType: 'goal', playerId: 'p1', gameSecond: 120, timestamp: '' },
        { id: '2', actionType: 'shot_on_goal', playerId: 'p1', gameSecond: 125, timestamp: '' },
        { id: '3', actionType: 'save', playerId: 'p2', gameSecond: 240, timestamp: '' },
        { id: '4', actionType: 'goal_allowed', playerId: 'p2', gameSecond: 241, timestamp: '' },
        { id: '5', actionType: 'own_goal', playerId: null, gameSecond: 400, timestamp: '' },
      ]),
    )
    expect(chart.user[2]).toEqual({ shots: 1, goals: 1 })
    expect(chart.opponent[4]).toEqual({ saves: 1, goalsAllowed: 1 })
    expect(chart.user[6].goals).toBe(1)
  })
})
