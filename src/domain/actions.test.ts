import { describe, expect, it } from 'vitest'
import {
  applyAction,
  createAction,
  revertAction,
  scoreFromActions,
  statsFromActions,
  teamCardCounts,
} from './actions'
import type { Game } from './types'

function game(): Game {
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
    startTime: '2026-08-15T10:00:00.000Z',
    endTime: null,
    actions: [],
    formation: [],
    startingFormation: [],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: false,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
  }
}

describe('actions', () => {
  it('counts a goal and an opponent own goal as home score', () => {
    let next = applyAction(game(), createAction('goal', 'p1', 30))
    next = applyAction(next, createAction('own_goal', null, 90))
    expect(scoreFromActions(next.actions)).toEqual({ home: 2, away: 0 })
    expect(next.homeScore).toBe(2)
  })

  it('counts our player own goal as away score', () => {
    const next = applyAction(game(), createAction('own_goal', 'p1', 40))
    expect(scoreFromActions(next.actions)).toEqual({ home: 0, away: 1 })
    expect(statsFromActions(next.actions, 'p1').ownGoals).toBe(1)
  })

  it('counts goal allowed as away score', () => {
    const next = applyAction(game(), createAction('goal_allowed', 'p1', 40))
    expect(next.awayScore).toBe(1)
  })

  it('does not let opponent cards change the score', () => {
    let next = applyAction(game(), createAction('opp_yellow', null, 20))
    next = applyAction(next, createAction('opp_red', null, 40))
    expect(scoreFromActions(next.actions)).toEqual({ home: 0, away: 0 })
    expect(teamCardCounts(next.actions)).toEqual({ yellow: 0, red: 0 })
  })

  it('turns two yellows into a send-off without wiping team yellows', () => {
    let next = applyAction(game(), createAction('yellow_card', 'p1', 10))
    next = applyAction(next, createAction('yellow_card', 'p2', 20))
    next = applyAction(next, createAction('yellow_card', 'p1', 30))
    const cards = teamCardCounts(next.actions)
    expect(cards.yellow).toBe(3)
    expect(cards.red).toBe(1)
    expect(statsFromActions(next.actions, 'p1').redCards).toBe(1)
  })

  it('reverts a goal and the score', () => {
    const action = createAction('goal', 'p1', 15)
    const next = applyAction(game(), action)
    const reverted = revertAction(next, action.id)
    expect(reverted.homeScore).toBe(0)
    expect(reverted.actions).toHaveLength(0)
  })
})
