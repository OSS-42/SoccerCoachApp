import { describe, expect, it } from 'vitest'
import { createAction, revertAction } from './actions'
import {
  applySubstitution,
  beginExtraTime,
  canSubstitute,
  extraTimeActive,
  substitutionCap,
  substitutionCount,
  usedOffPlayerIds,
} from './substitutions'
import type { FormationSpot, Game } from './types'

function spots(...ids: string[]): FormationSpot[] {
  return ids.map((playerId, index) => ({
    playerId,
    position: index === 0 ? 'GK' : `P${index}`,
    x: 50,
    y: 10 + index * 8,
  }))
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
    startTime: '2026-08-15T10:00:00.000Z',
    endTime: null,
    actions: [],
    formation: spots('p1', 'p2'),
    startingFormation: spots('p1', 'p2'),
    substitutes: ['p3', 'p4'],
    unavailablePlayers: [],
    isCompleted: false,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...partial,
  }
}

describe('substitutions', () => {
  it('swaps an on-field player with a bench player', () => {
    const result = applySubstitution(game(), 'p1', 'p3', 90)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.game.formation.map((s) => s.playerId)).toEqual(['p3', 'p2'])
    expect(result.game.substitutes).toEqual(['p1', 'p4'])
    expect(result.game.actions[0]).toMatchObject({
      actionType: 'substitution',
      playerId: 'p3',
      relatedPlayerId: 'p1',
      position: 'GK',
    })
  })

  it('tags the incoming player with the outgoing player\'s pitch spot', () => {
    const result = applySubstitution(game(), 'p1', 'p3', 90)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const incoming = result.game.formation.find((s) => s.playerId === 'p3')
    expect(incoming?.position).toBe('GK')
  })

  it('lets a youth player return after going off', () => {
    const first = applySubstitution(game(), 'p1', 'p3', 60)
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const back = applySubstitution(first.game, 'p3', 'p1', 180)
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back.game.formation[0].playerId).toBe('p1')
  })

  it('blocks a return in official 11v11', () => {
    const first = applySubstitution(
      game({ matchType: '11v11', substitutionRegulation: 'official' }),
      'p1',
      'p3',
      60,
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    expect(usedOffPlayerIds(first.game).has('p1')).toBe(true)
    const back = canSubstitute(first.game, 'p3', 'p1', 180)
    expect(back).toEqual({ ok: false, reason: 'cannot_return' })
  })

  it('caps official changes at 5, then 6 after extra time', () => {
    let current = game({
      matchType: '11v11',
      numPeriods: 2,
      periodDuration: 45,
      substitutionRegulation: 'official',
      formation: spots('a', 'b'),
      substitutes: ['s1', 's2', 's3', 's4', 's5', 's6', 's7'],
    })
    const outgoing = ['a', 's1', 's2', 's3', 's4']
    const incoming = ['s1', 's2', 's3', 's4', 's5']
    for (let i = 0; i < 5; i++) {
      const result = applySubstitution(current, outgoing[i], incoming[i], 60 * (i + 1))
      expect(result.ok).toBe(true)
      if (!result.ok) return
      current = result.game
    }
    expect(substitutionCount(current)).toBe(5)
    expect(substitutionCap(current, 40 * 60)).toBe(5)
    expect(canSubstitute(current, 's5', 's6', 80 * 60)).toEqual({
      ok: false,
      reason: 'cap_reached',
    })

    const extra = beginExtraTime(current)
    expect(extra.extraTime).toBe(true)
    expect(extra.numPeriods).toBe(4)
    expect(extraTimeActive(extra, 90 * 60)).toBe(true)
    expect(substitutionCap(extra, 90 * 60)).toBe(6)
    const sixth = applySubstitution(extra, 's5', 's6', 95 * 60)
    expect(sixth.ok).toBe(true)
    if (!sixth.ok) return
    expect(canSubstitute(sixth.game, 's6', 's7', 100 * 60)).toEqual({
      ok: false,
      reason: 'cap_reached',
    })
  })

  it('treats period 3+ of a planned official match as extra time', () => {
    const official = game({
      matchType: '11v11',
      numPeriods: 4,
      periodDuration: 15,
      substitutionRegulation: 'official',
    })
    expect(substitutionCap(official, 20 * 60)).toBe(5)
    expect(substitutionCap(official, 40 * 60)).toBe(6)
  })

  it('does not replace a sent-off player', () => {
    const withRed = game({
      actions: [createAction('red_card', 'p1', 20)],
    })
    expect(canSubstitute(withRed, 'p1', 'p3', 30)).toEqual({ ok: false, reason: 'sent_off' })
  })

  it('does not bring on an injured or sent-off bench player', () => {
    const injured = game({
      actions: [createAction('injury', 'p3', 10)],
    })
    expect(canSubstitute(injured, 'p1', 'p3', 20)).toEqual({
      ok: false,
      reason: 'unavailable_on',
    })
  })

  it('restores the pair when the substitution action is undone', () => {
    const applied = applySubstitution(game(), 'p1', 'p3', 70)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    const undone = revertAction(applied.game, applied.game.actions[0].id)
    expect(undone.formation.map((s) => s.playerId)).toEqual(['p1', 'p2'])
    expect(undone.substitutes).toEqual(['p3', 'p4'])
    expect(undone.actions).toHaveLength(0)
  })
})
