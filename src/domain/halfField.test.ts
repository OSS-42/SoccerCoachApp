import { describe, expect, it } from 'vitest'
import { FIELD_SPOTS } from './formation'
import { benchColumns, liveFieldMarkings, liveFieldSpot } from './halfField'

describe('liveFieldSpot', () => {
  it('uses the formation screen spot for every position', () => {
    for (const spot of FIELD_SPOTS) {
      expect(liveFieldSpot(spot.position)).toEqual({ left: spot.x, top: spot.y })
    }
  })

  it('keeps the attack at the top and the keeper at the bottom', () => {
    expect(liveFieldSpot('ST-L').top).toBeLessThan(liveFieldSpot('CM').top)
    expect(liveFieldSpot('CM').top).toBeLessThan(liveFieldSpot('GK').top)
  })

  it('falls back to the label, then centre midfield', () => {
    expect(liveFieldSpot('ST')).toEqual(liveFieldSpot('ST-L'))
    expect(liveFieldSpot('P9')).toEqual(liveFieldSpot('CM'))
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

describe('liveFieldMarkings', () => {
  it('matches the field aspect so circles stay round', () => {
    expect(liveFieldMarkings(340, 400).viewBox).toBe('0 0 68 80')
    expect(liveFieldMarkings(346, 390).viewBox).toBe('0 0 68 76.65')
  })

  it('never draws a pitch too short for both boxes and the centre circle', () => {
    expect(liveFieldMarkings(400, 200).viewBox).toBe('0 0 68 60')
  })

  it('falls back to a full-size pitch before layout', () => {
    expect(liveFieldMarkings(0, 0).viewBox).toBe('0 0 68 105')
  })
})
