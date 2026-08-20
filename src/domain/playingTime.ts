import { t } from '@/i18n'
import { POSITION_LABEL_ORDER, spotLabel } from './formation'
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

function startingSpots(game: Game): FormationSpot[] {
  const saved = game.startingFormation.map((spot) => ({ ...spot }))
  if (saved.length) return saved
  return reconstructStartingFormation(game.formation, game.actions)
}

function applySubToSpots(
  spots: FormationSpot[],
  offId: string,
  onId: string,
): { spots: FormationSpot[]; position: string | undefined } {
  const offSpot = spots.find((spot) => spot.playerId === offId)
  return {
    position: offSpot?.position,
    spots: spots.map((spot) => (spot.playerId === offId ? { ...spot, playerId: onId } : spot)),
  }
}

/**
 * Seconds each player spent on the field, split by the pitch spot they
 * were tagged with (incoming substitutes inherit the outgoing player's spot).
 */
export function playingSecondsByPlayerPosition(game: Game): Map<string, Map<string, number>> {
  const end = Math.max(0, game.elapsedSeconds)
  const onSince = new Map<string, { from: number; position: string }>()
  const totals = new Map<string, Map<string, number>>()
  const yellows = new Map<string, number>()
  let spots = startingSpots(game)

  const add = (playerId: string, position: string, from: number, to: number): void => {
    const seconds = Math.max(0, to - from)
    if (seconds <= 0) return
    const label = spotLabel(position)
    let row = totals.get(playerId)
    if (!row) {
      row = new Map()
      totals.set(playerId, row)
    }
    row.set(label, (row.get(label) ?? 0) + seconds)
  }

  const endStint = (playerId: string, at: number): void => {
    const stint = onSince.get(playerId)
    if (!stint) return
    add(playerId, stint.position, stint.from, at)
    onSince.delete(playerId)
  }

  for (const spot of spots) {
    onSince.set(spot.playerId, { from: 0, position: spot.position })
  }

  for (const action of game.actions) {
    const at = clampSecond(action.gameSecond, end)
    if (action.actionType === 'substitution' && action.playerId && action.relatedPlayerId) {
      const offId = action.relatedPlayerId
      const onId = action.playerId
      const applied = applySubToSpots(spots, offId, onId)
      spots = applied.spots
      const pos = action.position || applied.position
      endStint(offId, at)
      if (pos && !onSince.has(onId)) onSince.set(onId, { from: at, position: pos })
      continue
    }
    if (action.actionType === 'red_card' && action.playerId) {
      endStint(action.playerId, at)
      spots = spots.filter((spot) => spot.playerId !== action.playerId)
      continue
    }
    if (action.actionType === 'yellow_card' && action.playerId) {
      const count = (yellows.get(action.playerId) ?? 0) + 1
      yellows.set(action.playerId, count)
      if (count >= 2) {
        endStint(action.playerId, at)
        spots = spots.filter((spot) => spot.playerId !== action.playerId)
      }
    }
  }

  for (const [playerId, stint] of onSince) {
    add(playerId, stint.position, stint.from, end)
  }
  return totals
}

/**
 * Seconds each player spent on the field.
 * Stints start at kickoff (starting XI) or when they come on,
 * and end at a substitution off, a sending-off, or full time.
 */
export function playingSecondsByPlayer(game: Game): Map<string, number> {
  const totals = new Map<string, number>()
  for (const [playerId, byPos] of playingSecondsByPlayerPosition(game)) {
    let sum = 0
    for (const seconds of byPos.values()) sum += seconds
    totals.set(playerId, sum)
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

export function playedMinutesByPlayerPosition(game: Game): Map<string, Map<string, number>> {
  const minutes = new Map<string, Map<string, number>>()
  for (const [playerId, byPos] of playingSecondsByPlayerPosition(game)) {
    const row = new Map<string, number>()
    for (const [position, seconds] of byPos) {
      row.set(position, playedMinutes(seconds))
    }
    minutes.set(playerId, row)
  }
  return minutes
}

function positionEntries(byPos: Map<string, number> | Record<string, number>): [string, number][] {
  return byPos instanceof Map ? [...byPos.entries()] : Object.entries(byPos)
}

/** `GK - 40', RW - 20' - Total: 60'` */
export function formatPlayedDistribution(
  byPos: Map<string, number> | Record<string, number> | undefined,
  totalMinutes: number,
): string {
  if (totalMinutes <= 0) return ''
  const amounts = new Map<string, number>()
  if (byPos) {
    for (const [position, minutes] of positionEntries(byPos)) {
      if (minutes > 0) amounts.set(position, minutes)
    }
  }
  const parts: string[] = []
  for (const label of POSITION_LABEL_ORDER) {
    const minutes = amounts.get(label)
    if (minutes) {
      parts.push(`${label} - ${minutes}'`)
      amounts.delete(label)
    }
  }
  for (const [label, minutes] of amounts) {
    parts.push(`${label} - ${minutes}'`)
  }
  const totalLabel = t('minutesTotal', { min: totalMinutes })
  if (!parts.length) return totalLabel
  return `${parts.join(' ')} - ${totalLabel}`
}
