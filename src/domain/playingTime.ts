import type { FormationSpot, Game, GameAction } from './types'

/** Walk substitutions backwards from the final XI to recover the kickoff XI. */
export function reconstructStartingFormation(
  formation: FormationSpot[],
  actions: GameAction[],
): FormationSpot[] {
  let spots = formation.map((spot) => ({ ...spot }))
  for (const action of [...actions].reverse()) {
    if (action.actionType !== 'substitution' || !action.playerId || !action.relatedPlayerId) continue
    const onId = action.playerId
    const offId = action.relatedPlayerId
    spots = spots.map((spot) => (spot.playerId === onId ? { ...spot, playerId: offId } : spot))
  }
  return spots
}

export function startingPlayerIds(game: Game): Set<string> {
  const spots = game.startingFormation.length
    ? game.startingFormation
    : reconstructStartingFormation(game.formation, game.actions)
  return new Set(spots.map((spot) => spot.playerId))
}

function clampSecond(value: number, end: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(Math.max(0, value), Math.max(0, end))
}

/**
 * Seconds each player spent on the field.
 * Stints start at kickoff (starting XI) or when they come on,
 * and end at a substitution off, a sending-off, or full time.
 */
export function playingSecondsByPlayer(game: Game): Map<string, number> {
  const end = Math.max(0, game.elapsedSeconds)
  const onSince = new Map<string, number>()
  const totals = new Map<string, number>()
  const yellows = new Map<string, number>()

  const add = (playerId: string, from: number, to: number): void => {
    const seconds = Math.max(0, to - from)
    if (seconds <= 0) return
    totals.set(playerId, (totals.get(playerId) ?? 0) + seconds)
  }

  const endStint = (playerId: string, at: number): void => {
    const from = onSince.get(playerId)
    if (from == null) return
    add(playerId, from, at)
    onSince.delete(playerId)
  }

  for (const id of startingPlayerIds(game)) {
    onSince.set(id, 0)
  }

  for (const action of game.actions) {
    const at = clampSecond(action.gameSecond, end)
    if (action.actionType === 'substitution' && action.playerId && action.relatedPlayerId) {
      endStint(action.relatedPlayerId, at)
      if (!onSince.has(action.playerId)) onSince.set(action.playerId, at)
      continue
    }
    if (action.actionType === 'red_card' && action.playerId) {
      endStint(action.playerId, at)
      continue
    }
    if (action.actionType === 'yellow_card' && action.playerId) {
      const count = (yellows.get(action.playerId) ?? 0) + 1
      yellows.set(action.playerId, count)
      if (count >= 2) endStint(action.playerId, at)
    }
  }

  for (const [playerId, from] of onSince) {
    add(playerId, from, end)
  }
  return totals
}

/** Whole minutes for the report. Any on-field time under 30s still shows as 1'. */
export function playedMinutes(seconds: number): number {
  if (seconds <= 0) return 0
  return Math.max(1, Math.round(seconds / 60))
}

export function playedMinutesByPlayer(game: Game): Map<string, number> {
  const minutes = new Map<string, number>()
  for (const [playerId, seconds] of playingSecondsByPlayer(game)) {
    minutes.set(playerId, playedMinutes(seconds))
  }
  return minutes
}
