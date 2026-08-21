import { describe, expect, it } from 'vitest'
import { parseImportJson } from './storage'

describe('parseImportJson', () => {
  it('still accepts the old single-team export', () => {
    const parsed = parseImportJson(
      JSON.stringify({
        exportDate: '2026-08-01T00:00:00.000Z',
        appVersion: '2.4.39',
        teamName: 'U12 Tigers',
        players: [{ id: 'p1', name: 'Ada', jerseyNumber: 9, position: 'ST' }],
        games: [{ id: 'g1', opponentName: 'Rivals', isCompleted: true, homeScore: 2, awayScore: 1 }],
        settings: {},
        defaultFormations: {},
      }),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.kind).toBe('team')
    expect(parsed.save.teams[0].name).toBe('U12 TIGERS')
    expect(parsed.save.teams[0].players[0].name).toBe('ADA')
    expect(parsed.save.teams[0].games).toHaveLength(1)
  })

  it('treats a full app backup as a full restore', () => {
    const parsed = parseImportJson(
      JSON.stringify({
        saveVersion: 2,
        currentTeamId: 't1',
        teams: [
          {
            id: 't1',
            name: 'Home',
            players: [{ id: 'p1', name: 'Bea', jerseyNumber: 1, position: 'GK' }],
            games: [],
            settings: {},
          },
        ],
        currentGame: null,
        language: 'en',
        theme: 'dark',
      }),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.kind).toBe('full')
    expect(parsed.save.teams[0].name).toBe('HOME')
    expect(parsed.save.teams[0].players[0].name).toBe('BEA')
  })
})
