import { describe, expect, it } from 'vitest'
import { setLocale } from '@/i18n'
import { periodEndMarksBefore } from './clock'
import { buildGoalsCardsEvents, buildShotTimeline, substitutionLine } from './timeline'
import type { Game } from './types'

function game(actions: Game['actions']): Game {
  return {
    id: 'g',
    date: '2026-08-15',
    teamName: 'A',
    opponentName: 'B',
    matchType: '11v11',
    numPeriods: 4,
    periodDuration: 12,
    homeScore: 1,
    awayScore: 1,
    startTime: '',
    endTime: '',
    actions,
    formation: [],
    startingFormation: [],
    substitutes: [],
    unavailablePlayers: [],
    isCompleted: true,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
  }
}

describe('shot timeline', () => {
  it('groups our shots/goals up and opponent saves/GA down', () => {
    const chart = buildShotTimeline(
      game([
        { id: '1', actionType: 'goal', playerId: 'p1', gameSecond: 120, timestamp: '' },
        { id: '2', actionType: 'shot_on_goal', playerId: 'p1', gameSecond: 125, timestamp: '' },
        { id: '3', actionType: 'save', playerId: 'p2', gameSecond: 240, timestamp: '' },
        { id: '4', actionType: 'goal_allowed', playerId: 'p2', gameSecond: 241, timestamp: '' },
        { id: '5', actionType: 'own_goal', playerId: null, gameSecond: 400, timestamp: '' },
      ]),
    )
    expect(chart.user[2]).toEqual({ shots: 1, goals: 1 })
    expect(chart.opponent[4]).toEqual({ saves: 1, goalsAllowed: 1 })
    expect(chart.user[6].goals).toBe(1)
  })

  it('places a goal at 20:00 after the first-period break on a 20-minute 9v9', () => {
    const match = game([
      { id: 'early', actionType: 'goal', playerId: 'p1', gameSecond: 10 * 60, timestamp: '', period: 1 },
      { id: 'kickoff', actionType: 'goal', playerId: 'p1', gameSecond: 20 * 60, timestamp: '', period: 2 },
    ])
    match.numPeriods = 3
    match.periodDuration = 20
    const events = buildGoalsCardsEvents(match, [
      { id: 'p1', name: 'ADA', jerseyNumber: 9, position: 'ST' },
    ])
    expect(events.map((e) => ({ minute: e.minute, period: e.period }))).toEqual([
      { minute: 10, period: 1 },
      { minute: 20, period: 2 },
    ])
    expect(periodEndMarksBefore(1, events[0].period).filled).toEqual([])
    expect(periodEndMarksBefore(1, events[1].period).filled).toEqual([1])
  })

  it('keeps a 21:00 added-time goal in period 1, then the next 21:00 goal in period 2', () => {
    const match = game([
      { id: 'added', actionType: 'goal', playerId: 'p1', gameSecond: 21 * 60, timestamp: '', period: 1 },
      { id: 'kickoff', actionType: 'goal', playerId: 'p1', gameSecond: 21 * 60, timestamp: '', period: 2 },
    ])
    match.numPeriods = 3
    match.periodDuration = 20
    const events = buildGoalsCardsEvents(match, [
      { id: 'p1', name: 'ADA', jerseyNumber: 9, position: 'ST' },
    ])
    expect(events.map((e) => e.period)).toEqual([1, 2])
    expect(events.map((e) => e.minute)).toEqual([21, 21])
    expect(periodEndMarksBefore(1, events[0].period).filled).toEqual([])
    expect(periodEndMarksBefore(events[0].period, events[1].period).filled).toEqual([1])
  })

  it('lists substitutions in the report event feed', () => {
    const match = game([
      {
        id: 's1',
        actionType: 'substitution',
        playerId: 'p2',
        relatedPlayerId: 'p1',
        gameSecond: 600,
        timestamp: '',
      },
    ])
    match.startingFormation = [{ playerId: 'p1', position: 'ST', x: 50, y: 10 }]
    match.formation = [{ playerId: 'p2', position: 'ST', x: 50, y: 10 }]
    const events = buildGoalsCardsEvents(match, [
      { id: 'p1', name: 'MARC', jerseyNumber: 4, position: 'CB' },
      { id: 'p2', name: 'LEO', jerseyNumber: 8, position: 'CM' },
    ])
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({
      type: 'substitution',
      playerName: 'LEO',
      relatedName: 'MARC',
      minute: 10,
      position: 'ST',
    })
    setLocale('en')
    expect(substitutionLine('LEO', 'MARC', 'ST')).toBe('LEO on for MARC (ST)')
  })

  it('labels a returning player with the spot they actually take', () => {
    setLocale('en')
    const match = game([
      {
        id: 's1',
        actionType: 'substitution',
        playerId: 'will',
        relatedPlayerId: 'noah',
        gameSecond: 10,
        timestamp: '',
        position: 'GK',
      },
      {
        id: 's2',
        actionType: 'substitution',
        playerId: 'noah',
        relatedPlayerId: 'james',
        gameSecond: 20,
        timestamp: '',
        position: 'CDM',
      },
    ])
    match.startingFormation = [
      { playerId: 'noah', position: 'GK', x: 50, y: 91 },
      { playerId: 'james', position: 'CDM', x: 50, y: 55 },
    ]
    match.formation = [
      { playerId: 'will', position: 'GK', x: 50, y: 91 },
      { playerId: 'noah', position: 'CDM', x: 50, y: 55 },
    ]
    const events = buildGoalsCardsEvents(match, [
      { id: 'noah', name: 'NOAH', jerseyNumber: 1, position: 'GK' },
      { id: 'james', name: 'JAMES', jerseyNumber: 7, position: 'CDM' },
      { id: 'will', name: 'WILL', jerseyNumber: 11, position: 'ST' },
    ])
    expect(events.map((event) => substitutionLine(event.playerName, event.relatedName ?? '', event.position))).toEqual([
      'WILL on for NOAH (GK)',
      'NOAH on for JAMES (CDM)',
    ])
  })

  it('puts opponent cards and our own goals on the away side', () => {
    setLocale('en')
    const match = game([
      {
        id: 'og',
        actionType: 'own_goal',
        playerId: 'p1',
        gameSecond: 30,
        timestamp: '',
      },
      { id: 'y', actionType: 'opp_yellow', playerId: null, gameSecond: 80, timestamp: '' },
    ])
    const events = buildGoalsCardsEvents(match, [
      { id: 'p1', name: 'ADA', jerseyNumber: 9, position: 'ST' },
    ])
    expect(events[0]).toMatchObject({ type: 'ownGoal', isOpponent: true, playerName: 'ADA' })
    expect(events[1]).toMatchObject({ type: 'yellow', isOpponent: true, playerName: 'Opponent' })
  })
})
