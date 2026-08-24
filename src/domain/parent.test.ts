import { describe, expect, it } from 'vitest'
import {
  createParentGame,
  fieldSpotForPosition,
  moveParentKid,
  PARENT_KID_ID,
  replayParentFormation,
  validateParentKid,
} from './parent'
import { playedMinutesByPlayerPosition } from './playingTime'

const kid = { id: PARENT_KID_ID, name: 'LEA', jerseyNumber: 9, position: 'ST' as const }

describe('parent mode', () => {
  it('maps usual positions onto formation spots', () => {
    expect(fieldSpotForPosition('GK').position).toBe('GK')
    expect(fieldSpotForPosition('ST').label).toBe('ST')
  })

  it('rejects an empty kid name', () => {
    expect(validateParentKid('  ', 9, 'ST').ok).toBe(false)
  })

  it('starts the kid on the field or the bench', () => {
    const on = createParentGame({
      kid,
      opponentName: 'foxes',
      date: '2026-08-23',
      numPeriods: 4,
      periodDuration: 12,
      startsOnField: true,
    })
    expect(on.source).toBe('parent')
    expect(on.formation[0]?.playerId).toBe(PARENT_KID_ID)
    expect(on.substitutes).toEqual([])

    const off = createParentGame({
      kid,
      opponentName: 'foxes',
      date: '2026-08-23',
      numPeriods: 4,
      periodDuration: 12,
      startsOnField: false,
    })
    expect(off.formation).toEqual([])
    expect(off.substitutes).toEqual([PARENT_KID_ID])
  })

  it('moves the kid between a slot and the bench and keeps minutes by position', () => {
    let game = createParentGame({
      kid,
      opponentName: 'foxes',
      date: '2026-08-23',
      numPeriods: 4,
      periodDuration: 12,
      startsOnField: true,
    })
    game = { ...game, elapsedSeconds: 600 }
    game = moveParentKid(game, PARENT_KID_ID, null, 180)
    expect(game.formation).toEqual([])
    expect(game.substitutes).toEqual([PARENT_KID_ID])
    game = moveParentKid(game, PARENT_KID_ID, 'CM', 300)
    expect(game.formation[0]?.position).toBe('CM')
    const replayed = replayParentFormation(game, PARENT_KID_ID)
    expect(replayed.formation[0]?.position).toBe('CM')
    const byPos = playedMinutesByPlayerPosition({ ...game, elapsedSeconds: 600 })
    expect(byPos.get(PARENT_KID_ID)?.get('ST')).toBe(3)
    expect(byPos.get(PARENT_KID_ID)?.get('CM')).toBe(5)
  })
})
