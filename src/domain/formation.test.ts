import { describe, expect, it } from 'vitest'
import {
  FIELD_SPOTS,
  almostReadyLineup,
  filterDefaultFormation,
  filterDefaultUnavailable,
  spotLabel,
  validateFormation,
} from './formation'

describe('formation', () => {
  it('exposes the named pitch spots from the position chart', () => {
    const labels = FIELD_SPOTS.map((s) => s.label)
    expect(labels).toEqual(expect.arrayContaining(['GK', 'SW', 'LB', 'LWB', 'LCB', 'CB', 'RCB', 'RB', 'RWB', 'CDM', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'CAM', 'LW', 'SS', 'CF', 'RW', 'ST']))
    expect(FIELD_SPOTS.filter((s) => s.label === 'ST')).toHaveLength(2)
    expect(spotLabel('ST-L')).toBe('ST')
    expect(spotLabel('ST-R')).toBe('ST')
    const lw = FIELD_SPOTS.find((s) => s.position === 'LW')
    const rw = FIELD_SPOTS.find((s) => s.position === 'RW')
    const ss = FIELD_SPOTS.find((s) => s.position === 'SS')
    expect(ss?.x).toBe(((lw?.x ?? 0) + (rw?.x ?? 0)) / 2)
    expect(ss?.y).toBe(lw?.y)
  })

  it('leaves one player off a 9v9 tutorial lineup and always includes a GK', () => {
    const players = [
      { id: 'g', position: 'GK', jerseyNumber: 1 },
      { id: 'a', position: 'CB', jerseyNumber: 2 },
      { id: 'b', position: 'LB', jerseyNumber: 3 },
      { id: 'c', position: 'RB', jerseyNumber: 4 },
      { id: 'd', position: 'CM', jerseyNumber: 5 },
      { id: 'e', position: 'ST', jerseyNumber: 6 },
      { id: 'f', position: 'ST', jerseyNumber: 7 },
      { id: 'h', position: 'LW', jerseyNumber: 8 },
      { id: 'i', position: 'RW', jerseyNumber: 9 },
    ]
    const seeded = almostReadyLineup(players, '9v9')
    expect(seeded.field).toHaveLength(8)
    expect(seeded.field.some((spot) => spot.position === 'GK' && spot.playerId === 'g')).toBe(true)
    expect(seeded.leftoverIds).toEqual(['i'])
    expect(
      validateFormation(
        seeded.field.map((spot) => ({ ...spot, x: 0, y: 0 })),
        '9v9',
      ),
    ).toMatchObject({ ok: true, short: true, selected: 8, required: 9 })
  })

  it('leaves one player off a 7v7 tutorial lineup and always includes a GK', () => {
    const players = [
      { id: 'g', position: 'GK', jerseyNumber: 1 },
      { id: 'a', position: 'CB', jerseyNumber: 2 },
      { id: 'b', position: 'LB', jerseyNumber: 3 },
      { id: 'c', position: 'RB', jerseyNumber: 4 },
      { id: 'd', position: 'CM', jerseyNumber: 5 },
      { id: 'e', position: 'ST', jerseyNumber: 6 },
      { id: 'f', position: 'ST', jerseyNumber: 7 },
    ]
    const seeded = almostReadyLineup(players, '7v7')
    expect(seeded.field).toHaveLength(6)
    expect(seeded.field.some((spot) => spot.position === 'GK' && spot.playerId === 'g')).toBe(true)
    expect(seeded.leftoverIds).toEqual(['f'])
    expect(validateFormation(
      seeded.field.map((spot) => ({ ...spot, x: 0, y: 0 })),
      '7v7',
    )).toMatchObject({ ok: true, short: true })
  })

  it('accepts full strength or short-handed down to the official minimum, with a GK', () => {
    const spots = [
      { playerId: '1', position: 'GK', x: 50, y: 91 },
      { playerId: '2', position: 'LB', x: 13, y: 71 },
      { playerId: '3', position: 'CB', x: 50, y: 71 },
      { playerId: '4', position: 'CM', x: 50, y: 45 },
    ]
    expect(validateFormation(spots, '7v7')).toMatchObject({ ok: false, reason: 'count', min: 5, selected: 4 })
    spots.push({ playerId: '5', position: 'CAM', x: 50, y: 35 })
    expect(validateFormation(spots, '7v7')).toEqual({ ok: true, short: true, required: 7, selected: 5 })
    spots.push({ playerId: '6', position: 'LW', x: 13, y: 24 }, { playerId: '7', position: 'ST-L', x: 35, y: 9 })
    expect(validateFormation(spots, '7v7')).toEqual({ ok: true, short: false, required: 7, selected: 7 })
    spots.push({ playerId: '8', position: 'RW', x: 87, y: 24 })
    expect(validateFormation(spots, '7v7')).toMatchObject({ ok: false, reason: 'count', required: 7, selected: 8 })
  })

  it.each([
    ['5v5', 4],
    ['7v7', 5],
    ['9v9', 6],
    ['11v11', 7],
  ] as const)('%s may start with %i players but not fewer', (matchType, min) => {
    const team = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ playerId: `p${i}`, position: i === 0 ? 'GK' : `X-${i}`, x: 0, y: 0 }))
    expect(validateFormation(team(min), matchType).ok).toBe(true)
    expect(validateFormation(team(min - 1), matchType).ok).toBe(false)
  })

  it('rejects a 7v7 without a goalkeeper', () => {
    const spots = Array.from({ length: 7 }, (_, i) => ({
      playerId: String(i + 1),
      position: `MID-${i + 1}`,
      x: 10,
      y: 40,
    }))
    const result = validateFormation(spots, '7v7')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.reason).toBe('gk')
  })

  it('drops default-formation players who left the roster', () => {
    const saved = [
      { playerId: 'keep', position: 'GK', x: 50, y: 95 },
      { playerId: 'gone', position: 'ST-1', x: 50, y: 10 },
    ]
    expect(filterDefaultFormation(saved, new Set(['keep']))).toEqual([saved[0]])
  })

  it('restores unavailable players who are still on the roster and not on the field', () => {
    expect(
      filterDefaultUnavailable(['keep', 'gone', 'starter'], new Set(['keep', 'starter']), new Set(['starter'])),
    ).toEqual(['keep'])
  })
})
