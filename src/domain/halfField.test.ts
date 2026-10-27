import { describe, expect, it } from 'vitest'
import { FIELD_SPOTS } from './formation'
import { benchColumns, halfFieldMarkings, halfFieldSpot, halfFieldTop } from './halfField'

describe('halfFieldTop', () => {
  it('keeps every spot inside the half with room for labels', () => {
    for (const spot of FIELD_SPOTS) {
      const top = halfFieldTop(spot.y)
      expect(top).toBeGreaterThanOrEqual(12)
      expect(top).toBeLessThanOrEqual(88)
    }
  })

  it('keeps the attack at the top and the keeper at the bottom', () => {
    expect(halfFieldSpot('ST-L').top).toBeLessThan(halfFieldSpot('CM').top)
    expect(halfFieldSpot('CM').top).toBeLessThan(halfFieldSpot('GK').top)
  })

  it('falls back to the label, then centre midfield', () => {
    expect(halfFieldSpot('ST')).toEqual(halfFieldSpot('ST-L'))
    expect(halfFieldSpot('P9')).toEqual(halfFieldSpot('CM'))
  })
})

describe('benchColumns', () => {
  it('fits up to 15 subs in two rows', () => {
    expect(benchColumns(4)).toBe(4)
    expect(benchColumns(8)).toBe(4)
    expect(benchColumns(9)).toBe(5)
    expect(benchColumns(11)).toBe(6)
    expect(benchColumns(15)).toBe(8)
    expect(Math.ceil(15 / benchColumns(15))).toBe(2)
  })
})

describe('halfFieldMarkings', () => {
  it('matches the field aspect so circles stay round', () => {
    expect(halfFieldMarkings(340, 170).viewBox).toBe('0 0 68 34')
    expect(halfFieldMarkings(370, 270).viewBox).toBe('0 0 68 49.62')
  })

  it('falls back to a square-ish half before layout', () => {
    expect(halfFieldMarkings(0, 0).viewBox).toBe('0 0 68 66')
  })
})
