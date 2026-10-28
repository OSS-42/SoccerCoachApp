import { FIELD_SPOTS } from './formation'

/**
 * Live field spots are the formation screen's spots: same x/y percentages on a whole pitch,
 * so a player stands exactly where the coach put them in the lineup.
 */
export function liveFieldSpot(position: string): { left: number; top: number } {
  const spot =
    FIELD_SPOTS.find((def) => def.position === position) ??
    FIELD_SPOTS.find((def) => def.label === position) ??
    FIELD_SPOTS.find((def) => def.position === 'CM')!
  return { left: spot.x, top: spot.y }
}

/** Bench chips per row: 15 subs still fit in two rows. */
export function benchColumns(count: number): number {
  if (count > 12) return 8
  if (count > 10) return 6
  if (count > 8) return 5
  return 4
}

/** Shortest pitch drawn (metres): both boxes and the centre circle still fit without overlapping. */
const MIN_PITCH_LENGTH = 60

/**
 * Chalk lines for a whole pitch, in metres at one scale, so circles stay round
 * whatever width and height the field gets: 68 m wide, as long as the space allows.
 * Attack at the top, our goal at the bottom.
 */
export function liveFieldMarkings(width: number, height: number): { viewBox: string; lines: string } {
  const w = 68
  const h = width > 0 && height > 0 ? Math.max(MIN_PITCH_LENGTH, (w * height) / width) : 105
  const r = (n: number) => Number(n.toFixed(2))
  const top = 1.2
  const goal = h - 1.2
  const mid = h / 2
  const arcX = Math.sqrt(9.15 ** 2 - 5.5 ** 2)
  const stripe = h / 8
  let stripes = ''
  for (let i = 0; i < 8; i++) {
    stripes += `<rect class="hf-grass${i % 2 ? ' alt' : ''}" y="${r(i * stripe)}" width="${w}" height="${r(stripe + 0.05)}"/>`
  }
  const lines = `${stripes}<g class="hf-chalk" fill="none" stroke-width="0.35">
<rect x="1.5" y="${top}" width="65" height="${r(goal - top)}"/>
<line x1="1.5" y1="${r(mid)}" x2="66.5" y2="${r(mid)}"/>
<circle cx="34" cy="${r(mid)}" r="9.15"/>
<rect x="13.85" y="${top}" width="40.3" height="16.5"/>
<rect x="24.85" y="${top}" width="18.3" height="5.5"/>
<path d="M ${r(34 - arcX)} ${r(top + 16.5)} A 9.15 9.15 0 0 0 ${r(34 + arcX)} ${r(top + 16.5)}"/>
<rect x="13.85" y="${r(goal - 16.5)}" width="40.3" height="16.5"/>
<rect x="24.85" y="${r(goal - 5.5)}" width="18.3" height="5.5"/>
<path d="M ${r(34 - arcX)} ${r(goal - 16.5)} A 9.15 9.15 0 0 1 ${r(34 + arcX)} ${r(goal - 16.5)}"/>
</g><circle class="hf-dot" cx="34" cy="${r(mid)}" r="0.55"/><circle class="hf-dot" cx="34" cy="${r(top + 11)}" r="0.5"/><circle class="hf-dot" cx="34" cy="${r(goal - 11)}" r="0.5"/>`
  return { viewBox: `0 0 ${w} ${r(h)}`, lines }
}
