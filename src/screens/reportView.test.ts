import { describe, expect, it } from 'vitest'
import { createAction } from '@/domain/actions'
import type { Game, Player, Team } from '@/domain/types'
import { setLocale } from '@/i18n'
import { buildReportDialogHtml } from './reportView'

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
    homeScore: 0,
    awayScore: 0,
    startTime: '',
    endTime: '',
    actions: [],
    formation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
    startingFormation: [{ playerId: 'p1', position: 'CM', x: 50, y: 50 }],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 12 * 60,
    periodScores: [],
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
    defaultUnavailable: {},
  }
}

describe('end-game report stats cards', () => {
  it('shows interceptions on the player stats card', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 8)]
    const match = game({
      actions: [createAction('interception', 'p1', 90), createAction('interception', 'p1', 200)],
    })
    const html = buildReportDialogHtml(match, team(players, match))
    expect(html).toContain('Intercept')
    expect(html).toMatch(/<span class="stat-metric-value">2<\/span>\s*<span class="stat-metric-label">Intercept<\/span>/)
  })
})

describe('editable report', () => {
  it('shows edited minutes with a tag, and player comments, in the report', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 8), player('p2', 'Bea', 4)]
    const match = game({
      reportEdits: { minutes: { p1: 9, p2: 3 }, comments: { p1: 'Pressed <well>' } },
    })
    const html = buildReportDialogHtml(match, team(players, match))
    expect(html).toContain('Total: 9&#39;')
    expect(html).toContain('report-edited-tag')
    expect(html).toContain('Pressed &lt;well&gt;')
    // Bea got minutes typed in, so she moves out of "did not play" into a card.
    expect(html).not.toContain('Have not played')
    expect(html).toContain('id="edit-open-report"')
  })

  it('edit mode lists every player with minutes and comment fields', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 8), player('p2', 'Bea', 4)]
    const match = game({ reportEdits: { minutes: {}, comments: { p2: 'Next time' } } })
    const html = buildReportDialogHtml(match, team(players, match), 'edit')
    expect(html.match(/class="report-stat-card report-edit-card"/g)).toHaveLength(2)
    expect(html).toContain('data-player-id="p1" data-computed="12"')
    expect(html).toContain('data-player-id="p2" data-computed="0"')
    expect(html).toContain('>Next time</textarea>')
    expect(html).toContain('id="done-edit-report"')
    expect(html).not.toContain('Shots Timeline')
  })

  it('shows a mark badge on the card and a mark field in edit mode', () => {
    setLocale('en')
    const players = [player('p1', 'Ada', 8)]
    const match = game({ reportEdits: { minutes: {}, comments: {}, marks: { p1: 7 } } })
    expect(buildReportDialogHtml(match, team(players, match))).toContain('<span class="report-mark">7<small>/10</small></span>')
    expect(buildReportDialogHtml(match, team(players, match), 'edit')).toContain('class="report-edit-mark"')
  })
})

