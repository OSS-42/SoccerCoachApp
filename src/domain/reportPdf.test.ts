import { describe, expect, it } from 'vitest'
import { setLocale } from '@/i18n'
import { bytesToBase64 } from '@/lib/shareFile'
import { createAction } from './actions'
import { buildGameReportPdf, reportPdfFileName } from './reportPdf'
import type { Game, Player, Team } from './types'

function player(id: string, name: string, jerseyNumber: number): Player {
  return { id, name, jerseyNumber, position: 'CM' }
}

function game(partial: Partial<Game> = {}): Game {
  return {
    id: 'g1',
    date: '2026-08-15',
    teamName: 'TEAM A',
    opponentName: 'RIVALS',
    matchType: '7v7',
    numPeriods: 4,
    periodDuration: 12,
    homeScore: 2,
    awayScore: 1,
    startTime: '',
    endTime: '',
    actions: [],
    formation: [
      { playerId: 'p1', position: 'GK', x: 50, y: 90 },
      { playerId: 'p2', position: 'ST', x: 50, y: 20 },
    ],
    startingFormation: [
      { playerId: 'p1', position: 'GK', x: 50, y: 90 },
      { playerId: 'p2', position: 'ST', x: 50, y: 20 },
    ],
    substitutes: ['p3'],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 48 * 60,
    periodScores: [
      { home: 1, away: 0 },
      { home: 2, away: 1 },
    ],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    ...partial,
  }
}

function team(players: Player[], match: Game): Team {
  return {
    id: 't1',
    name: 'TEAM A',
    players,
    games: [match],
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
  }
}

function pdfText(pdf: ReturnType<typeof buildGameReportPdf>): string {
  return Buffer.from(pdf.output('arraybuffer')).toString('latin1')
}

describe('report PDF', () => {
  it('names the file from the date and opponent', () => {
    expect(reportPdfFileName(game({ opponentName: 'FC  Lyons!' }))).toBe(
      'report-2026-08-15-vs-FC_Lyons.pdf',
    )
    expect(reportPdfFileName(game({ opponentName: 'Béziers' }))).toBe(
      'report-2026-08-15-vs-Beziers.pdf',
    )
  })

  it('produces a non-empty PDF that encodes as base64', () => {
    const players = [player('p1', 'Ada', 1)]
    const match = game({ actions: [createAction('goal', 'p1', 60)] })
    const bytes = new Uint8Array(buildGameReportPdf(match, team(players, match)).output('arraybuffer'))
    expect(bytes.byteLength).toBeGreaterThan(1000)
    expect(String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3])).toBe('%PDF')
    expect(bytesToBase64(bytes).startsWith('JVBERi')).toBe(true)
  })

  it('keeps the score, timeline, notes, and player names — not the minute-by-minute list', () => {
    setLocale('en')
    const players = [
      player('p1', 'Ada', 1),
      player('p2', 'Bea', 9),
      player('p3', 'Cara', 11),
    ]
    const match = game({
      actions: [
        createAction('goal', 'p2', 120),
        createAction('shot_on_goal', 'p2', 400),
        createAction('goal_allowed', 'p1', 900),
        createAction('yellow_card', 'p3', 1100),
        createAction('substitution', 'p3', 1500, { relatedPlayerId: 'p2' }),
        createAction('game_note', null, 1800, { noteText: 'Watch the left wing' }),
        createAction('note', 'p1', 2000, { noteText: 'Ada is tired' }),
      ],
    })
    const text = pdfText(buildGameReportPdf(match, team(players, match)))
    expect(text).toContain('TEAM A')
    expect(text).toContain('RIVALS')
    expect(text).toContain('Shots Timeline')
    expect(text).toContain('Watch the left wing')
    expect(text).toContain('Ada is tired')
    expect(text).toContain('Player Statistics')
    expect(text).toContain('Ada')
    expect(text).toContain('Bea')
    expect(text).not.toContain('No goals, cards, injuries, or substitutions recorded')
    expect(text).not.toContain('subOnFor')
    expect(text).not.toContain('Cara on for Bea')
  })

  it('skips the notes block when there are none', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 1)]
    const match = game({ actions: [createAction('goal', 'p1', 60)] })
    const text = pdfText(buildGameReportPdf(match, team(players, match)))
    expect(text).toContain('Shots Timeline')
    expect(text).not.toContain('Notes')
  })

  it('adds pages when many players have minutes', () => {
    const players = Array.from({ length: 22 }, (_, i) => player(`p${i}`, `Player ${i}`, i + 1))
    const formation = players.map((p, i) => ({
      playerId: p.id,
      position: i === 0 ? 'GK' : 'CM',
      x: 50,
      y: 50,
    }))
    const match = game({
      formation,
      startingFormation: formation,
      elapsedSeconds: 48 * 60,
    })
    const pdf = buildGameReportPdf(match, team(players, match))
    expect(pdf.getNumberOfPages()).toBeGreaterThan(1)
  })

  it('lists players who did not play without a stats card', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 1), player('p2', 'Bea', 9)]
    const match = game({
      formation: [{ playerId: 'p1', position: 'GK', x: 50, y: 91 }],
      startingFormation: [{ playerId: 'p1', position: 'GK', x: 50, y: 91 }],
      elapsedSeconds: 40 * 60,
    })
    const text = pdfText(buildGameReportPdf(match, team(players, match)))
    expect(text).toContain('Have not played')
    expect(text).toContain('Bea')
  })
})
