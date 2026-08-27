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
    expect(t('tipScreenLive')).toBe('On the Live game screen')
    expect(t('tipScreenFormation')).toBe('On the Formation Setup screen')
    expect(t('changelog')).toBe('Change log')
    setLocale('fr')
    expect(t('tipScreenLive')).toBe('Sur l’écran Match en direct')
    expect(t('tipScreenFormation')).toBe('Sur l’écran Composition')
    expect(t('startsOnField', { name: 'LEA' })).toBe('LEA dans le onze de départ')
    expect(t('saveKid', { name: 'LEA' })).toBe('Enregistrer LEA')
    expect(t('kidLastPassAsk', { name: 'LEA' })).toBe('LEA a fait la passe décisive ?')
    expect(t('placeKidTitle', { name: 'LEA' })).toBe('C’est le moment de placer LEA')
    setLocale('en')
    expect(t('startsOnField', { name: 'LEA' })).toBe('LEA on starting roster')
    expect(t('kidLastPassAsk', { name: 'LEA' })).toBe('Did LEA make the last pass?')
  })
})

