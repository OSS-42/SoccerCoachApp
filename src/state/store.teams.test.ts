/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SAVE_KEY } from '@/domain/config'
import { setLocale, t } from '@/i18n'
import { memoryStorage } from '@/test/memoryStorage'
import { addTeam, getSave, hydrate } from './store'

function startWith(entitlement: 'lite' | 'pro') {
  const storage = memoryStorage()
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      entitlement,
      currentTeamId: 't1',
      teams: [{ id: 't1', name: 'Team A', players: [], games: [] }],
    }),
  )
  vi.stubGlobal('localStorage', storage)
  hydrate()
  setLocale('en')
}

const teamNames = () => getSave().teams.map((team) => team.name)

describe('addTeam', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('does not create a team a Lite user could never select', () => {
    startWith('lite')
    const result = addTeam('Team B')
    expect(result).toEqual({ ok: false, message: t('liteTeamLimit') })
    expect(teamNames()).toEqual(['TEAM A', 'DEMO TEAM'])
    expect(getSave().currentTeamId).toBe('t1')
  })

  it('still lets Pro add a second team of their own, then stops at the max', () => {
    startWith('pro')
    expect(addTeam('Team B').ok).toBe(true)
    expect(teamNames()).toEqual(['TEAM A', 'DEMO TEAM', 'TEAM B'])
    expect(addTeam('Team C')).toMatchObject({ ok: false })
    expect(teamNames()).toHaveLength(3)
  })
})
