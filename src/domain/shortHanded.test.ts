import { describe, expect, it } from 'vitest'
import { createAction, revertAction } from './actions'
import { migrateUnknown } from './migrate'
import { playingSecondsByPlayer, reconstructStartingFormation, shortStartLabel } from './playingTime'
import { calculateSeasonStats } from './stats'
import {
  applyArrival,
  applyEnter,
  applySubstitution,
  canEnter,
  entryPosition,
  openFieldSlots,
} from './substitutions'
import { buildGoalsCardsEvents } from './timeline'
import type { FormationSpot, Game, Player } from './types'

const players: Player[] = [
  { id: 'gk', name: 'KEEPER', jerseyNumber: 1, position: 'GK' },
  ...['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id, i) => ({
    id,
    name: id.toUpperCase(),
    jerseyNumber: i + 2,
    position: 'CM' as const,
  })),
  { id: 'bench', name: 'BENCH', jerseyNumber: 20, position: 'CB' },
  { id: 'late', name: 'LEA', jerseyNumber: 9, position: 'ST' },
]

function spots(...ids: string[]): FormationSpot[] {
  return ids.map((playerId, index) => ({ playerId, position: index === 0 ? 'GK' : `P${index}`, x: 50, y: 50 }))
}

/** 11v11 kicked off with 9: two open spots, one sub on the bench, LEA marked absent. */
function shortGame(partial: Partial<Game> = {}): Game {
  const start = spots('gk', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h')
  return {
    id: 'g1',
    date: '2026-09-20',
    teamName: 'U13',
    opponentName: 'RIVALS',
    matchType: '11v11',
    numPeriods: 2,
    periodDuration: 30,
    homeScore: 0,
    awayScore: 0,
    startTime: '2026-09-20T14:00:00.000Z',
    endTime: null,
    actions: [],
    formation: start,
    startingFormation: start.map((s) => ({ ...s })),
    substitutes: ['bench'],
    unavailablePlayers: ['late'],
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

function arriveAndEnter(): Game {
  const arrived = applyArrival(shortGame(), 'late', 600, 1)
  if (!arrived.ok) throw new Error('arrival failed')
  const entered = applyEnter(arrived.game, 'late', 'ST', 900, 1)
  if (!entered.ok) throw new Error(`enter failed: ${entered.reason}`)
  return { ...entered.game, elapsedSeconds: 3600 }
}

describe('late arrival', () => {
  it('moves an absent player to the bench and logs the late arrival', () => {
    const result = applyArrival(shortGame(), 'late', 600, 1)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.game.unavailablePlayers).toEqual([])
    expect(result.game.substitutes).toEqual(['bench', 'late'])
    expect(result.game.actions[0]).toMatchObject({ actionType: 'late_to_game', playerId: 'late', arrived: true, gameSecond: 600 })
    expect(applyArrival(result.game, 'late', 700).ok).toBe(false)
  })

  it('counts the match as played (bench rule) and flags the player late', () => {
    const game = { ...(applyArrival(shortGame(), 'late', 600) as { game: Game }).game, isCompleted: true }
    const row = calculateSeasonStats(players, [game]).find((r) => r.playerId === 'late')
    expect(row).toMatchObject({ gamesPlayed: 1, missedGames: 0, lateToGame: 1, minutesPlayed: 0 })
  })

  it('undo sends the player back to absent while still on the bench', () => {
    const arrived = (applyArrival(shortGame(), 'late', 600) as { game: Game }).game
    const undone = revertAction(arrived, arrived.actions[0].id)
    expect(undone.unavailablePlayers).toEqual(['late'])
    expect(undone.substitutes).toEqual(['bench'])
  })
})

describe('short-handed start', () => {
  it('shows open spots only for missing players, never for red cards', () => {
    expect(openFieldSlots(shortGame())).toBe(2)
    expect(openFieldSlots(shortGame({ actions: [createAction('red_card', 'a', 300)] }))).toBe(2)
    expect(shortStartLabel(shortGame())).toContain('9')
  })

  it('a bench player fills an open spot in their usual position without anyone going off', () => {
    const game = arriveAndEnter()
    expect(game.formation).toHaveLength(10)
    expect(game.formation.at(-1)).toMatchObject({ playerId: 'late', position: 'ST-L' })
    expect(game.substitutes).toEqual(['bench'])
    expect(game.actions.at(-1)).toMatchObject({ actionType: 'enter', playerId: 'late', position: 'ST-L' })
    expect(openFieldSlots(game)).toBe(1)
  })

  it('counts minutes from the moment the player comes on', () => {
    const seconds = playingSecondsByPlayer(arriveAndEnter())
    expect(seconds.get('late')).toBe(3600 - 900)
    expect(seconds.get('a')).toBe(3600)
    expect(seconds.has('bench')).toBe(false)
  })

  it('rebuilds the kickoff lineup without the player who came on later', () => {
    const game = arriveAndEnter()
    const rebuilt = reconstructStartingFormation(game.formation, game.actions)
    expect(rebuilt.map((s) => s.playerId)).toEqual(['gk', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'])
  })

  it('a player who came on can later be substituted, keeping their spot', () => {
    const sub = applySubstitution(arriveAndEnter(), 'late', 'bench', 1800)
    expect(sub.ok).toBe(true)
    if (!sub.ok) return
    const seconds = playingSecondsByPlayer({ ...sub.game, elapsedSeconds: 3600 })
    expect(seconds.get('late')).toBe(1800 - 900)
    expect(seconds.get('bench')).toBe(3600 - 1800)
    const events = buildGoalsCardsEvents(sub.game, players)
    expect(events.find((e) => e.type === 'substitution')).toMatchObject({ playerName: 'BENCH', position: 'ST' })
  })

  it('refuses to fill a spot when the team is at full strength or the player is not on the bench', () => {
    expect(canEnter(shortGame({ unavailablePlayers: [] }), 'late')).toEqual({ ok: false, reason: 'not_on_bench' })
    const full = shortGame({ formation: spots('gk', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'x', 'y') })
    expect(canEnter(full, 'bench')).toEqual({ ok: false, reason: 'no_open_spot' })
    const injured = shortGame({ actions: [createAction('injury', 'bench', 60)] })
    expect(canEnter(injured, 'bench')).toEqual({ ok: false, reason: 'unavailable_on' })
  })

  it('a backup keeper joining an outfield gap is tagged centre midfield', () => {
    expect(entryPosition('GK')).toBe('CM')
    expect(entryPosition(undefined)).toBe('CM')
    expect(entryPosition('ST')).toBe('ST-L')
    expect(entryPosition('CB')).toBe('CB')
  })

  it('undoing the entry puts the player back on the bench', () => {
    const game = arriveAndEnter()
    const undone = revertAction(game, game.actions.at(-1)!.id)
    expect(undone.formation).toHaveLength(9)
    expect(undone.substitutes).toEqual(['bench', 'late'])
  })

  it('the report shows the arrival and the entry with the position', () => {
    const events = buildGoalsCardsEvents(arriveAndEnter(), players)
    expect(events.map((e) => [e.type, e.playerName, e.position])).toEqual([
      ['arrived', 'LEA', null],
      ['enter', 'LEA', 'ST'],
    ])
  })

  it('keeps entry positions and arrivals through a save/restore', () => {
    const game = { ...arriveAndEnter(), isCompleted: true }
    const restored = migrateUnknown({ teams: [{ id: 't1', name: 'U13', players, games: [game] }] })
    const actions = restored.teams[0].games[0].actions
    expect(actions[0]).toMatchObject({ actionType: 'late_to_game', arrived: true })
    expect(actions[1]).toMatchObject({ actionType: 'enter', position: 'ST-L' })
  })
})
