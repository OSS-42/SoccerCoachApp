import {
  BENCH_SLOT_COUNT,
  ON_FIELD_COUNT,
  type FormationSpot,
  type MatchType,
} from './types'

export type FieldSpotDef = {
  position: string
  x: number
  y: number
}

export function fieldSpotDefs(desktop: boolean): FieldSpotDef[] {
  const rowY = desktop
    ? { GK: 89, SW: 81, DEF: 72, DM: 59, MID: 46, OM: 33, FWD: 20, ST: 10 }
    : { GK: 95, SW: 86.5, DEF: 78.5, DM: 61.38, MID: 44.25, OM: 27.13, FWD: 10, ST: 2 }
  const lineX = [10, 30, 50, 70, 90]
  const strikerLineX = [30, 50, 70]
  return [
    { position: 'GK', x: 50, y: rowY.GK },
    { position: 'SW', x: 50, y: rowY.SW },
    ...lineX.map((x, index) => ({ position: `DEF-${index + 1}`, x, y: rowY.DEF })),
    ...lineX.map((x, index) => ({ position: `DM-${index + 1}`, x, y: rowY.DM })),
    ...lineX.map((x, index) => ({ position: `MID-${index + 1}`, x, y: rowY.MID })),
    ...lineX.map((x, index) => ({ position: `OM-${index + 1}`, x, y: rowY.OM })),
    ...lineX.map((x, index) => ({ position: `FWD-${index + 1}`, x, y: rowY.FWD })),
    ...strikerLineX.map((x, index) => ({ position: `ST-${index + 1}`, x, y: rowY.ST })),
  ]
}

export function benchSlotCount(matchType: MatchType, rosterSize: number): number {
  return Math.max(BENCH_SLOT_COUNT[matchType], rosterSize)
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
