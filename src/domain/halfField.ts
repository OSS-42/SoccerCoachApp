import { FIELD_SPOTS } from './formation'

/** Tallest the live half field gets. Short screens shrink it so nothing scrolls. */
export const HALF_FIELD_MAX_PX = 270

/**
 * FIELD_SPOTS y runs from 9 (strikers) to 91 (GK) over a whole pitch.
 * The live half field squeezes that range onto our own half, leaving room for labels.
 */
export function halfFieldTop(y: number): number {
  return 12 + ((y - 9) / (91 - 9)) * 74
}

export function halfFieldSpot(position: string): { left: number; top: number } {
  const spot =
    FIELD_SPOTS.find((def) => def.position === position) ??
    FIELD_SPOTS.find((def) => def.label === position) ??
    FIELD_SPOTS.find((def) => def.position === 'CM')!
  return { left: spot.x, top: halfFieldTop(spot.y) }
}

/** Bench chips per row: 15 subs still fit in two rows. */
export function benchColumns(count: number): number {
  if (count > 12) return 8
  if (count > 10) return 6
  if (count > 8) return 5
  return 4
}

/**
 * Chalk lines for our half, in metres at one scale, so circles stay round
 * whatever width and height the field gets. Halfway line at the top, goal line at the bottom.
 */
export function halfFieldMarkings(width: number, height: number): { viewBox: string; lines: string } {
  const w = 68
  const h = width > 0 && height > 0 ? (w * height) / width : 66
  const goal = h - 1.2
  const box = goal - 16.5
  const spot = goal - 11
  const arcX = Math.sqrt(9.15 ** 2 - 5.5 ** 2)
  const r = (n: number) => Number(n.toFixed(2))
  const stripe = h / 6
  let stripes = ''
  for (let i = 0; i < 6; i++) {
    stripes += `<rect class="hf-grass${i % 2 ? ' alt' : ''}" y="${r(i * stripe)}" width="${w}" height="${r(stripe + 0.05)}"/>`
  }
  const lines = `${stripes}<g class="hf-chalk" fill="none" stroke-width="0.35">
<rect x="1.5" y="1.2" width="65" height="${r(goal - 1.2)}"/>
<path d="M 24.85 1.2 A 9.15 9.15 0 0 0 43.15 1.2"/>
<rect x="13.85" y="${r(box)}" width="40.3" height="16.5"/>
<rect x="24.85" y="${r(goal - 5.5)}" width="18.3" height="5.5"/>
<path d="M ${r(34 - arcX)} ${r(box)} A 9.15 9.15 0 0 1 ${r(34 + arcX)} ${r(box)}"/>
</g><circle class="hf-dot" cx="34" cy="1.2" r="0.55"/><circle class="hf-dot" cx="34" cy="${r(spot)}" r="0.5"/>`
  return { viewBox: `0 0 ${w} ${r(h)}`, lines }
}
