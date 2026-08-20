import { ON_FIELD_COUNT, type FormationSpot, type MatchType } from './types'

export type FieldSpotDef = {
  /** Unique slot id. Two strikers share the display label `ST`. */
  position: string
  label: string
  x: number
  y: number
}

/**
 * Named pitch spots from the standard position chart, mapped onto a
 * vertical field (own goal / GK at the bottom, attack at the top).
 */
export const FIELD_SPOTS: FieldSpotDef[] = [
  { position: 'GK', label: 'GK', x: 50, y: 91 },
  { position: 'SW', label: 'SW', x: 50, y: 81 },
  { position: 'LB', label: 'LB', x: 13, y: 71 },
  { position: 'LCB', label: 'LCB', x: 32, y: 71 },
  { position: 'CB', label: 'CB', x: 50, y: 71 },
  { position: 'RCB', label: 'RCB', x: 68, y: 71 },
  { position: 'RB', label: 'RB', x: 87, y: 71 },
  { position: 'LWB', label: 'LWB', x: 13, y: 60 },
  { position: 'RWB', label: 'RWB', x: 87, y: 60 },
  { position: 'CDM', label: 'CDM', x: 50, y: 55 },
  { position: 'LM', label: 'LM', x: 13, y: 45 },
  { position: 'LCM', label: 'LCM', x: 32, y: 45 },
  { position: 'CM', label: 'CM', x: 50, y: 45 },
  { position: 'RCM', label: 'RCM', x: 68, y: 45 },
  { position: 'RM', label: 'RM', x: 87, y: 45 },
  { position: 'CAM', label: 'CAM', x: 50, y: 35 },
  { position: 'LW', label: 'LW', x: 13, y: 24 },
  { position: 'SS', label: 'SS', x: 50, y: 24 },
  { position: 'RW', label: 'RW', x: 87, y: 24 },
  { position: 'CF', label: 'CF', x: 50, y: 18 },
  { position: 'ST-L', label: 'ST', x: 35, y: 9 },
  { position: 'ST-R', label: 'ST', x: 65, y: 9 },
]

export const POSITION_LABEL_ORDER: string[] = [...new Set(FIELD_SPOTS.map((s) => s.label))]

export function fieldSpotDefs(_desktop?: boolean): FieldSpotDef[] {
  return FIELD_SPOTS
}

export function spotLabel(position: string): string {
  const found = FIELD_SPOTS.find((s) => s.position === position)
  if (found) return found.label
  if (/^ST/i.test(position)) return 'ST'
  return position
}

/** Smaller y is further forward. Unknown spots sort just ahead of GK. */
export function fieldSpotDepth(position: string | undefined): number {
  if (!position) return 80
  const found = FIELD_SPOTS.find((s) => s.position === position)
  if (found) return found.y
  if (/^ST/i.test(position)) return 9
  return 80
}

export function benchSlotCount(_matchType?: MatchType, _rosterSize?: number): number {
  return 26
}

export function validateFormation(
  spots: FormationSpot[],
  matchType: MatchType,
): { ok: true } | { ok: false; reason: 'count' | 'gk'; required: number; selected: number } {
  const required = ON_FIELD_COUNT[matchType]
  if (spots.length !== required) {
    return { ok: false, reason: 'count', required, selected: spots.length }
  }
  if (!spots.some((s) => s.position === 'GK')) {
    return { ok: false, reason: 'gk', required, selected: spots.length }
  }
  return { ok: true }
}

export function filterDefaultFormation(
  saved: FormationSpot[] | undefined,
  livingPlayerIds: Set<string>,
): FormationSpot[] {
  if (!saved?.length) return []
  return saved.filter((spot) => livingPlayerIds.has(spot.playerId))
}
