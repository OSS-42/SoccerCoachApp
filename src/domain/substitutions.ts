import { ELEVEN_V11_PERIODS, EXTRA_TIME_PERIODS, YELLOWS_FOR_RED } from './config'
import { currentPeriod } from './clock'
import { FIELD_SPOTS } from './formation'
import { newId } from './ids'
import {
  ON_FIELD_COUNT,
  type Game,
  type GameAction,
  type MatchType,
  type SubstitutionRegulation,
} from './types'

export const OFFICIAL_SUB_CAP = 5
export const EXTRA_TIME_BONUS_SUB = 1

export type SubFail =
  | 'same_player'
  | 'not_on_field'
  | 'not_on_bench'
  | 'sent_off'
  | 'unavailable_on'
  | 'cannot_return'
  | 'cap_reached'

export function regulationFor(
  matchType: MatchType,
  official11: boolean,
): SubstitutionRegulation {
  if (matchType !== '11v11') return 'rolling'
  return official11 ? 'official' : 'rolling'
}

export function extraTimeActive(game: Game, elapsedSeconds: number): boolean {
  if (game.substitutionRegulation !== 'official') return false
  if (game.extraTime) return true
  return currentPeriod(elapsedSeconds, game.periodDuration, game.numPeriods) > ELEVEN_V11_PERIODS
}

export function substitutionCap(game: Game, elapsedSeconds: number): number | null {
  if (game.substitutionRegulation !== 'official') return null
  return extraTimeActive(game, elapsedSeconds)
    ? OFFICIAL_SUB_CAP + EXTRA_TIME_BONUS_SUB
    : OFFICIAL_SUB_CAP
}

export function substitutionCount(game: Game): number {
  return game.actions.filter((action) => action.actionType === 'substitution').length
}

export function usedOffPlayerIds(game: Game): Set<string> {
  if (game.substitutionRegulation !== 'official') return new Set()
  const ids = new Set<string>()
  for (const action of game.actions) {
    if (action.actionType === 'substitution' && action.relatedPlayerId) {
      ids.add(action.relatedPlayerId)
    }
  }
  return ids
}

export function playerHasRed(game: Game, playerId: string): boolean {
  let yellows = 0
  let reds = 0
  for (const action of game.actions) {
    if (action.playerId !== playerId) continue
    if (action.actionType === 'yellow_card') yellows += 1
    if (action.actionType === 'red_card') reds += 1
  }
  return reds > 0 || yellows >= YELLOWS_FOR_RED
}

export function playerIsInjured(game: Game, playerId: string): boolean {
  return game.actions.some((action) => action.actionType === 'injury' && action.playerId === playerId)
}

export function canSubstitute(
  game: Game,
  offId: string,
  onId: string,
  elapsedSeconds: number,
): { ok: true } | { ok: false; reason: SubFail } {
  if (offId === onId) return { ok: false, reason: 'same_player' }
  if (!game.formation.some((spot) => spot.playerId === offId)) {
    return { ok: false, reason: 'not_on_field' }
  }
  if (!game.substitutes.includes(onId)) return { ok: false, reason: 'not_on_bench' }
  if (playerHasRed(game, offId)) return { ok: false, reason: 'sent_off' }
  if (playerHasRed(game, onId) || playerIsInjured(game, onId)) {
    return { ok: false, reason: 'unavailable_on' }
  }
  if (usedOffPlayerIds(game).has(onId)) return { ok: false, reason: 'cannot_return' }
  const cap = substitutionCap(game, elapsedSeconds)
  if (cap != null && substitutionCount(game) >= cap) {
    return { ok: false, reason: 'cap_reached' }
  }
  return { ok: true }
}

export function applySubstitution(
  game: Game,
  offId: string,
  onId: string,
  gameSecond: number,
  period?: number,
): { ok: true; game: Game } | { ok: false; reason: SubFail } {
  const allowed = canSubstitute(game, offId, onId, gameSecond)
  if (!allowed.ok) return allowed
  const offSpot = game.formation.find((spot) => spot.playerId === offId)
  const formation = game.formation.map((spot) =>
    spot.playerId === offId ? { ...spot, playerId: onId } : spot,
  )
  const substitutes = game.substitutes.map((id) => (id === onId ? offId : id))
  const action: GameAction = {
    id: newId('act'),
    actionType: 'substitution',
    playerId: onId,
    relatedPlayerId: offId,
    gameSecond,
    timestamp: new Date().toISOString(),
    position: offSpot?.position,
    period,
  }
  return {
    ok: true,
    game: {
      ...game,
      formation,
      substitutes,
      actions: [...game.actions, action],
    },
  }
}

/** Undo the formation swap for a substitution if those two players are still swapped. */
export function revertSubstitutionSwap(game: Game, action: GameAction): Game {
  const onId = action.playerId
  const offId = action.relatedPlayerId
  if (!onId || !offId) return game
  const onSpot = game.formation.find((spot) => spot.playerId === onId)
  if (!onSpot || !game.substitutes.includes(offId)) return game
  return {
    ...game,
    formation: game.formation.map((spot) =>
      spot.playerId === onId ? { ...spot, playerId: offId } : spot,
    ),
    substitutes: game.substitutes.map((id) => (id === offId ? onId : id)),
  }
}

/** Spots left open when the team started (or is still) below full strength. Red cards never reopen a spot. */
export function openFieldSlots(game: Game): number {
  return Math.max(0, ON_FIELD_COUNT[game.matchType] - game.formation.length)
}

export type EnterFail = 'no_open_spot' | 'not_on_bench' | 'unavailable_on' | 'cannot_return'

export function canEnter(game: Game, playerId: string): { ok: true } | { ok: false; reason: EnterFail } {
  if (openFieldSlots(game) <= 0) return { ok: false, reason: 'no_open_spot' }
  if (!game.substitutes.includes(playerId)) return { ok: false, reason: 'not_on_bench' }
  if (playerHasRed(game, playerId) || playerIsInjured(game, playerId)) {
    return { ok: false, reason: 'unavailable_on' }
  }
  if (usedOffPlayerIds(game).has(playerId)) return { ok: false, reason: 'cannot_return' }
  return { ok: true }
}

/**
 * The pitch spot for the player's usual position (`ST` → the `ST-L` spot, labelled ST).
 * A keeper joining an outfield gap is tagged centre midfield.
 */
export function entryPosition(preferred: string | undefined): string {
  if (!preferred || preferred === 'GK') return 'CM'
  const spot =
    FIELD_SPOTS.find((def) => def.position === preferred) ?? FIELD_SPOTS.find((def) => def.label === preferred)
  return spot?.position ?? 'CM'
}

/** A bench player fills an open spot. Not a substitution: it does not count toward the official cap. */
export function applyEnter(
  game: Game,
  playerId: string,
  preferredPosition: string | undefined,
  gameSecond: number,
  period?: number,
): { ok: true; game: Game } | { ok: false; reason: EnterFail } {
  const allowed = canEnter(game, playerId)
  if (!allowed.ok) return allowed
  const position = entryPosition(preferredPosition)
  const spot = FIELD_SPOTS.find((def) => def.position === position)
  const action: GameAction = {
    id: newId('act'),
    actionType: 'enter',
    playerId,
    gameSecond,
    timestamp: new Date().toISOString(),
    position,
    period,
  }
  return {
    ok: true,
    game: {
      ...game,
      formation: [...game.formation, { playerId, position, x: spot?.x ?? 50, y: spot?.y ?? 50 }],
      substitutes: game.substitutes.filter((id) => id !== playerId),
      actions: [...game.actions, action],
    },
  }
}

/** Undo an entry if the player is still on the field (not subbed off since). */
export function revertEnter(game: Game, action: GameAction): Game {
  const playerId = action.playerId
  if (!playerId || !game.formation.some((spot) => spot.playerId === playerId)) return game
  if (game.actions.some((a) => a.actionType === 'substitution' && a.relatedPlayerId === playerId)) return game
  return {
    ...game,
    formation: game.formation.filter((spot) => spot.playerId !== playerId),
    substitutes: [...game.substitutes, playerId],
  }
}

/** A player marked absent before kickoff turns up: absent → bench, logged as late. */
export function applyArrival(
  game: Game,
  playerId: string,
  gameSecond: number,
  period?: number,
): { ok: true; game: Game } | { ok: false } {
  if (!game.unavailablePlayers.includes(playerId)) return { ok: false }
  const action: GameAction = {
    id: newId('act'),
    actionType: 'late_to_game',
    playerId,
    gameSecond,
    timestamp: new Date().toISOString(),
    period,
    arrived: true,
  }
  return {
    ok: true,
    game: {
      ...game,
      unavailablePlayers: game.unavailablePlayers.filter((id) => id !== playerId),
      substitutes: [...game.substitutes, playerId],
      actions: [...game.actions, action],
    },
  }
}

/** Undo an arrival while the player is still on the bench. */
export function revertArrival(game: Game, action: GameAction): Game {
  const playerId = action.playerId
  if (!playerId || !game.substitutes.includes(playerId)) return game
  return {
    ...game,
    substitutes: game.substitutes.filter((id) => id !== playerId),
    unavailablePlayers: [...game.unavailablePlayers, playerId],
  }
}

export function beginExtraTime(game: Game): Game {
  if (game.substitutionRegulation !== 'official' || game.extraTime) return game
  return {
    ...game,
    extraTime: true,
    numPeriods: game.numPeriods + EXTRA_TIME_PERIODS,
  }
}
