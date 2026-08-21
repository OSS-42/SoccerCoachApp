import { describe, expect, it } from 'vitest'
import { setLocale, t } from './index'

describe('i18n', () => {
  it('translates and interpolates in French', () => {
    setLocale('fr')
    expect(t('startNewGame')).toBe('Nouveau match')
    expect(t('periodOf', { current: 2, total: 4 })).toBe('Période 2 sur 4')
    expect(t('action.goal')).toBe('But')
    setLocale('en')
    expect(t('startNewGame')).toBe('Start New Game')
    expect(t('appTitle')).toBe('ActionPitch')
    expect(t('continue')).toBe('Continue')
  })
})
