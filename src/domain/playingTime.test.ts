import { describe, expect, it } from 'vitest'
import { applySubstitution } from './substitutions'
import {
  formatPlayedDistribution,
  playedMinutes,
  playedMinutesByPlayerPosition,
  playingSecondsByPlayer,
  reconstructStartingFormation,
} from './playingTime'
import { setLocale } from '@/i18n'
import type { FormationSpot, Game, GameAction } from './types'

function spots(...ids: string[]): FormationSpot[] {
  return ids.map((playerId, index) => ({
    playerId,
    position: `P${index}`,
    x: 50,
    y: 10 + index * 8,
  }))
}

function action(
  actionType: GameAction['actionType'],
  playerId: string | null,
  gameSecond: number,
  relatedPlayerId?: string,
): GameAction {
  return { id: `a-${actionType}-${gameSecond}`, actionType, playerId, gameSecond, timestamp: '', relatedPlayerId }
}

function game(partial: Partial<Game> = {}): Game {
  const formation = partial.formation ?? spots('p1', 'p2')
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
    formation,
    startingFormation: formation.map((spot) => ({ ...spot })),
    substitutes: ['p3', 'p4'],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 40 * 60,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...partial,
  }
}

describe('playing time', () => {
  it('gives starters the full match when nobody is changed', () => {
    const minutes = playingSecondsByPlayer(game())
    expect(minutes.get('p1')).toBe(2400)
    expect(minutes.get('p2')).toBe(2400)
    expect(minutes.get('p3')).toBeUndefined()
  })

  it('splits time across a substitution', () => {
    let match = game({ formation: spots('p1', 'p2'), startingFormation: spots('p1', 'p2'), elapsedSeconds: 2400 })
    const applied = applySubstitution(match, 'p1', 'p3', 10 * 60)
    if (!applied.ok) throw new Error(applied.reason)
    match = { ...applied.game, elapsedSeconds: 2400 }
    const seconds = playingSecondsByPlayer(match)
    expect(seconds.get('p1')).toBe(600)
    expect(seconds.get('p3')).toBe(1800)
    expect(seconds.get('p2')).toBe(2400)
  })

  it('sums rolling return stints', () => {
    let match = game({ substitutes: ['p3'] })
    const first = applySubstitution(match, 'p1', 'p3', 10 * 60)
    if (!first.ok) throw new Error(first.reason)
    const second = applySubstitution(first.game, 'p3', 'p1', 20 * 60)
    if (!second.ok) throw new Error(second.reason)
    match = { ...second.game, elapsedSeconds: 2400 }
    const seconds = playingSecondsByPlayer(match)
    expect(seconds.get('p1')).toBe(600 + 1200)
    expect(seconds.get('p3')).toBe(600)
  })

  it('stops the clock for a player sent off', () => {
    const match = game({
      actions: [action('red_card', 'p1', 15 * 60)],
      elapsedSeconds: 2400,
    })
    expect(playingSecondsByPlayer(match).get('p1')).toBe(900)
    expect(playingSecondsByPlayer(match).get('p2')).toBe(2400)
  })

  it('treats a second yellow as a sending-off', () => {
    const match = game({
      actions: [action('yellow_card', 'p1', 8 * 60), action('yellow_card', 'p1', 12 * 60)],
      elapsedSeconds: 2400,
    })
    expect(playingSecondsByPlayer(match).get('p1')).toBe(720)
  })

  it('reconstructs the kickoff XI from the final XI and substitutions', () => {
    const recovered = reconstructStartingFormation(spots('p3', 'p2'), [
      action('substitution', 'p3', 600, 'p1'),
    ])
    expect(recovered.map((spot) => spot.playerId)).toEqual(['p1', 'p2'])
  })

  it('still works when startingFormation is missing', () => {
    const match = game({
      startingFormation: [],
      formation: spots('p3', 'p2'),
      actions: [action('substitution', 'p3', 10 * 60, 'p1')],
      elapsedSeconds: 2400,
    })
    const seconds = playingSecondsByPlayer(match)
    expect(seconds.get('p1')).toBe(600)
    expect(seconds.get('p3')).toBe(1800)
  })

  it('rounds a short cameo up to 1 minute', () => {
    expect(playedMinutes(20)).toBe(1)
    expect(playedMinutes(0)).toBe(0)
    expect(playedMinutes(90)).toBe(2)
  })

  it('splits minutes by the pitch spot a player is tagged with', () => {
    setLocale('en')
    const kickoff = [
      { playerId: 'p1', position: 'GK', x: 50, y: 91 },
      { playerId: 'p2', position: 'RW', x: 87, y: 24 },
    ]
    let match = game({
      formation: kickoff,
      startingFormation: kickoff,
      substitutes: ['p3'],
      elapsedSeconds: 60 * 60,
    })
    const first = applySubstitution(match, 'p1', 'p3', 40 * 60)
    if (!first.ok) throw new Error(first.reason)
    const second = applySubstitution(first.game, 'p2', 'p1', 50 * 60)
    if (!second.ok) throw new Error(second.reason)
    match = { ...second.game, elapsedSeconds: 60 * 60 }
    const byPos = playedMinutesByPlayerPosition(match)
    expect(byPos.get('p1')?.get('GK')).toBe(40)
    expect(byPos.get('p1')?.get('RW')).toBe(10)
    expect(byPos.get('p3')?.get('GK')).toBe(20)
    expect(byPos.get('p2')?.get('RW')).toBe(50)
    expect(formatPlayedDistribution(byPos.get('p1'), 50)).toBe("GK - 40' RW - 10' - Total: 50'")
  })

  it('does not keep a returning player tagged with their old spot', () => {
    setLocale('en')
    const kickoff = [
      { playerId: 'noah', position: 'GK', x: 50, y: 91 },
      { playerId: 'james', position: 'CDM', x: 50, y: 55 },
      { playerId: 'mason', position: 'LCB', x: 32, y: 71 },
    ]
    let match = game({
      formation: kickoff,
      startingFormation: kickoff.map((spot) => ({ ...spot })),
      substitutes: ['will'],
      elapsedSeconds: 4 * 60,
    })
    const first = applySubstitution(match, 'noah', 'will', 60)
    if (!first.ok) throw new Error(first.reason)
    const second = applySubstitution(first.game, 'james', 'noah', 60)
    if (!second.ok) throw new Error(second.reason)
    match = { ...second.game, elapsedSeconds: 4 * 60 }
    const byPos = playedMinutesByPlayerPosition(match)
    expect(byPos.get('noah')?.get('GK')).toBe(1)
    expect(byPos.get('noah')?.get('CDM')).toBe(3)
    expect(byPos.get('noah')?.get('LCB')).toBeUndefined()
    expect(formatPlayedDistribution(byPos.get('noah'), 4)).toBe("GK - 1' CDM - 3' - Total: 4'")
  })
})
