import { describe, expect, it } from 'vitest'
import { buildGoalsCardsEvents, buildShotTimeline } from './timeline'
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

  it('lists substitutions in the report event feed', () => {
    const events = buildGoalsCardsEvents(
      game([
        {
          id: 's1',
          actionType: 'substitution',
          playerId: 'p2',
          relatedPlayerId: 'p1',
          gameSecond: 600,
          timestamp: '',
        },
      ]),
      [
        { id: 'p1', name: 'MARC', jerseyNumber: 4, position: 'CB' },
        { id: 'p2', name: 'LEO', jerseyNumber: 8, position: 'CM' },
      ],
    )
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'substitution',
      playerName: 'LEO',
      relatedName: 'MARC',
      minute: 10,
    })
  })
})
