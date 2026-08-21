import { describe, expect, it } from 'vitest'
import {
  APP_NAME,
  APP_VERSION,
  DEFAULT_SUB_MINUTES,
  ELEVEN_V11_FRIENDLY_MINUTES,
  ELEVEN_V11_OFFICIAL_MINUTES,
  JERSEY_MAX,
  JERSEY_MIN,
  LEGACY_SAVE_KEY,
  LEGACY_SAVE_KEY_V1,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  YELLOWS_FOR_RED,
} from './config'

describe('config', () => {
  it('names the product ActionPitch without moving storage keys', () => {
    expect(APP_NAME).toBe('ActionPitch')
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/)
    expect(SAVE_KEY).toBe('soccerCoachApp.v2')
    expect(SAVE_BACKUP_KEY).toBe('soccerCoachApp.v2.bak')
    expect(LEGACY_SAVE_KEY).toBe('soccerCoachApp2')
    expect(LEGACY_SAVE_KEY_V1).toBe('soccerCoachApp')
  })

  it('keeps match and roster limits in one place', () => {
    expect(DEFAULT_SUB_MINUTES).toBe(6)
    expect(JERSEY_MIN).toBe(0)
    expect(JERSEY_MAX).toBe(99)
    expect(YELLOWS_FOR_RED).toBe(2)
    expect(ELEVEN_V11_FRIENDLY_MINUTES).toBe(40)
    expect(ELEVEN_V11_OFFICIAL_MINUTES).toBe(45)
  })
})
