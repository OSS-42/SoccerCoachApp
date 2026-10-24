/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SAVE_KEY } from '@/domain/config'
import { setLocale } from '@/i18n'
import { memoryStorage } from '@/test/memoryStorage'
import {
  findCompletedGame,
  getSave,
  hydrate,
  pdfHiddenSectionsFor,
  setPdfHiddenSections,
  setReportPlayerComment,
  setReportPlayerMark,
  setReportPlayerMinutes,
} from './store'

function startWith() {
  const storage = memoryStorage()
  storage.setItem(
    SAVE_KEY,
    JSON.stringify({
      entitlement: 'pro',
      currentTeamId: 't1',
      teams: [
        { id: 't1', name: 'Team A', players: [], games: [] },
        {
          id: 't2',
          name: 'Team B',
          players: [{ id: 'p1', name: 'ADA', jerseyNumber: 8, position: 'CM' }],
          games: [
            {
              id: 'g1',
              isCompleted: true,
              matchType: '7v7',
              elapsedSeconds: 600,
              formation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
              startingFormation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
            },
          ],
        },
      ],
    }),
  )
  vi.stubGlobal('localStorage', storage)
  hydrate()
  setLocale('en')
}

const edits = () => findCompletedGame('g1')?.game.reportEdits

describe('report edits', () => {
  beforeEach(() => vi.unstubAllGlobals())

  it('saves minutes and comments on a game of a team that is not selected', () => {
    startWith()
    expect(setReportPlayerMinutes('g1', 'p1', 7)).toBe(true)
    setReportPlayerComment('g1', 'p1', '  Good work  ')
    expect(edits()).toEqual({ minutes: { p1: 7 }, comments: { p1: 'Good work' } })
    expect(getSave().currentTeamId).toBe('t1')
  })

  it('drops the edit when reset or set back to the tracked minutes', () => {
    startWith()
    setReportPlayerMinutes('g1', 'p1', 7)
    setReportPlayerMinutes('g1', 'p1', null)
    expect(edits()).toBeUndefined()
    setReportPlayerMinutes('g1', 'p1', 10)
    expect(edits()).toBeUndefined()
    setReportPlayerComment('g1', 'p1', 'x')
    setReportPlayerComment('g1', 'p1', '   ')
    expect(edits()).toBeUndefined()
  })

  it('remembers PDF sections on the team that owns the game', () => {
    startWith()
    setPdfHiddenSections('g1', ['timeline', 'dnp', 'marks'])
    const teams = getSave().teams
    expect(teams.find((t) => t.id === 't2')?.settings.pdfHiddenSections).toEqual(['timeline', 'dnp'])
    expect(teams.find((t) => t.id === 't1')?.settings.pdfHiddenSections).toBeUndefined()
  })

  it('leaves marks out of the PDF until the coach switches them on', () => {
    startWith()
    const team = () => getSave().teams.find((t) => t.id === 't2')!
    expect(pdfHiddenSectionsFor(team())).toEqual(['marks'])
    setPdfHiddenSections('g1', ['notes'])
    expect(pdfHiddenSectionsFor(team())).toEqual(['notes'])
    setPdfHiddenSections('g1', ['notes', 'marks'])
    expect(pdfHiddenSectionsFor(team())).toEqual(['notes', 'marks'])
  })

  it('saves a mark from 1 to 10 and clears it', () => {
    startWith()
    setReportPlayerMark('g1', 'p1', 14)
    expect(edits()?.marks).toEqual({ p1: 10 })
    setReportPlayerMark('g1', 'p1', null)
    expect(edits()).toBeUndefined()
  })
})
