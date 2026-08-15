import { describe, expect, it } from 'vitest'
import { filterDefaultFormation, validateFormation } from './formation'

describe('formation', () => {
  it('requires exact on-field count and a GK for 7v7', () => {
    const spots = [
      { playerId: '1', position: 'GK', x: 50, y: 95 },
      { playerId: '2', position: 'DEF-1', x: 10, y: 78 },
      { playerId: '3', position: 'DEF-2', x: 30, y: 78 },
      { playerId: '4', position: 'MID-1', x: 10, y: 44 },
      { playerId: '5', position: 'MID-2', x: 30, y: 44 },
      { playerId: '6', position: 'FWD-1', x: 10, y: 10 },
    ]
    expect(validateFormation(spots, '7v7').ok).toBe(false)
    spots.push({ playerId: '7', position: 'FWD-2', x: 50, y: 10 })
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
