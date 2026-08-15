import { currentPeriod } from './clock'
import { newId } from './ids'
import {
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
  return currentPeriod(elapsedSeconds, game.periodDuration, game.numPeriods) > 2
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
  return reds > 0 || yellows >= 2
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
): { ok: true; game: Game } | { ok: false; reason: SubFail } {
  const allowed = canSubstitute(game, offId, onId, gameSecond)
  if (!allowed.ok) return allowed
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

export function beginExtraTime(game: Game): Game {
  if (game.substitutionRegulation !== 'official' || game.extraTime) return game
  return {
    ...game,
    extraTime: true,
    numPeriods: game.numPeriods + 2,
  }
}
