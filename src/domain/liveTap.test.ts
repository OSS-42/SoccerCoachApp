import { describe, expect, it } from 'vitest'
import { coachLiveTap, parentLiveTap } from './liveTap'

describe('coachLiveTap', () => {
  it('schedules actions on a single tap when idle', () => {
    expect(
      coachLiveTap({
        pendingId: null,
        pendingRole: null,
        playerId: 'a',
        role: 'field',
        doubleTap: false,
      }),
    ).toEqual({ action: 'schedule-actions' })
  })

  it('arms switch mode on a double-tap when idle', () => {
    expect(
      coachLiveTap({
        pendingId: null,
        pendingRole: null,
        playerId: 'a',
        role: 'field',
        doubleTap: true,
      }),
    ).toEqual({ action: 'arm' })
  })

  it('completes a switch on a single tap of the other side while armed', () => {
    expect(
      coachLiveTap({
        pendingId: 'a',
        pendingRole: 'field',
        playerId: 'b',
        role: 'bench',
        doubleTap: false,
      }),
    ).toEqual({ action: 'swap' })
  })

  it('cancels on a single tap of the armed player', () => {
    expect(
      coachLiveTap({
        pendingId: 'a',
        pendingRole: 'field',
        playerId: 'a',
        role: 'field',
        doubleTap: false,
      }),
    ).toEqual({ action: 'cancel' })
  })

  it('never schedules actions while switch mode is armed', () => {
    const armed = { pendingId: 'a', pendingRole: 'field' as const }
    expect(
      coachLiveTap({ ...armed, playerId: 'b', role: 'bench', doubleTap: false }).action,
    ).not.toBe('schedule-actions')
    expect(
      coachLiveTap({ ...armed, playerId: 'a', role: 'field', doubleTap: false }).action,
    ).not.toBe('schedule-actions')
    expect(
      coachLiveTap({ ...armed, playerId: 'c', role: 'field', doubleTap: true }).action,
    ).not.toBe('schedule-actions')
  })

  it('retargets when tapping another player on the same side', () => {
    expect(
      coachLiveTap({
        pendingId: 'a',
        pendingRole: 'field',
        playerId: 'c',
        role: 'field',
        doubleTap: false,
      }),
    ).toEqual({ action: 'retarget' })
  })
})

describe('parentLiveTap', () => {
  it('schedules actions on a single tap of the kid when idle', () => {
    expect(parentLiveTap({ moveArmed: false, onKid: true, doubleTap: false })).toEqual({
      action: 'schedule-actions',
    })
  })

  it('arms move mode on a double-tap of the kid', () => {
    expect(parentLiveTap({ moveArmed: false, onKid: true, doubleTap: true })).toEqual({
      action: 'arm',
    })
  })

  it('moves on a single tap of another slot while armed', () => {
    expect(parentLiveTap({ moveArmed: true, onKid: false, doubleTap: false })).toEqual({
      action: 'move',
    })
  })

  it('cancels on a single tap of the kid while armed', () => {
    expect(parentLiveTap({ moveArmed: true, onKid: true, doubleTap: false })).toEqual({
      action: 'cancel',
    })
  })

  it('never schedules actions while move mode is armed', () => {
    expect(parentLiveTap({ moveArmed: true, onKid: true, doubleTap: false }).action).not.toBe(
      'schedule-actions',
    )
    expect(parentLiveTap({ moveArmed: true, onKid: false, doubleTap: false }).action).not.toBe(
      'schedule-actions',
    )
  })

  it('ignores destination taps when idle', () => {
    expect(parentLiveTap({ moveArmed: false, onKid: false, doubleTap: false })).toEqual({
      action: 'ignore',
    })
  })
})
