import { describe, expect, it } from 'vitest'
import { FIELD_SPOTS, filterDefaultFormation, spotLabel, validateFormation } from './formation'

describe('formation', () => {
  it('exposes the named pitch spots from the position chart', () => {
    const labels = FIELD_SPOTS.map((s) => s.label)
    expect(labels).toEqual(expect.arrayContaining(['GK', 'SW', 'LB', 'LWB', 'LCB', 'CB', 'RCB', 'RB', 'RWB', 'CDM', 'LM', 'LCM', 'CM', 'RCM', 'RM', 'CAM', 'LW', 'SS', 'CF', 'RW', 'ST']))
    expect(FIELD_SPOTS.filter((s) => s.label === 'ST')).toHaveLength(2)
    expect(spotLabel('ST-L')).toBe('ST')
    expect(spotLabel('ST-R')).toBe('ST')
  })

  it('requires exact on-field count and a GK for 7v7', () => {
    const spots = [
      { playerId: '1', position: 'GK', x: 50, y: 91 },
      { playerId: '2', position: 'LB', x: 13, y: 71 },
      { playerId: '3', position: 'CB', x: 50, y: 71 },
      { playerId: '4', position: 'CM', x: 50, y: 45 },
      { playerId: '5', position: 'CAM', x: 50, y: 35 },
      { playerId: '6', position: 'LW', x: 13, y: 24 },
    ]
    expect(validateFormation(spots, '7v7').ok).toBe(false)
    spots.push({ playerId: '7', position: 'ST-L', x: 35, y: 9 })
    expect(validateFormation(spots, '7v7')).toEqual({ ok: true })
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
})
