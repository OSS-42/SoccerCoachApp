import { describe, expect, it } from 'vitest'
import { migrateUnknown } from './migrate'

describe('migrateUnknown', () => {
  it('creates Team A and a 23-player DEMO TEAM', () => {
    const save = migrateUnknown(null)
    expect(save.teams.map((t) => t.name)).toEqual(['TEAM A', 'DEMO TEAM'])
    expect(save.teams[0].players).toHaveLength(0)
    expect(save.teams[1].players).toHaveLength(23)
    expect(save.currentGame).toBeNull()
    expect(save.theme).toBe('dark')
    expect(save.roleChosen).toBe(false)
    expect(save.role).toBe('coach')
    expect(save.parent.kid.id).toBe('parent-kid')
    expect(save.tutorial).toEqual({ coachRev: null, parentRev: null })
    expect(save.changelogSeenVersion).toBeNull()
  })

  it('keeps the selected team and an in-progress game', () => {
    const save = migrateUnknown({
      currentTeamId: 't2',
      teams: [
        { id: 't1', name: 'U10', players: [], games: [] },
        {
          id: 't2',
          name: 'U12',
          players: [{ id: 'p1', name: 'alex', jerseyNumber: 10, position: 'ST' }],
          games: [],
        },
      ],
      currentGame: {
        id: 'g1',
        opponentName: 'foxes',
        isCompleted: false,
        matchType: '7v7',
        homeScore: 1,
        actions: [{ actionType: 'goal', playerId: 'p1', gameMinute: 4 }],
        formationPlayers: [{ playerId: 'p1', position: 'GK', x: 50, y: 90 }],
      },
    })
    expect(save.currentTeamId).toBe('t1')
    expect(save.currentGame?.opponentName).toBe('FOXES')
    expect(save.currentGame?.formation).toHaveLength(1)
    expect(save.currentGame?.actions[0].actionType).toBe('goal')
    expect(save.currentGame?.substitutionRegulation).toBe('rolling')
    expect(save.currentGame?.extraTime).toBe(false)
    expect(save.clock.running).toBe(false)
    expect(save.teams[1].players[0].name).toBe('ALEX')
    expect(save.teams.some((t) => t.name === 'DEMO TEAM' && t.players.length === 23)).toBe(true)
  })

  it('drops an empty default Team B', () => {
    const save = migrateUnknown({
      teams: [
        { id: 't1', name: 'Team A', players: [], games: [] },
        { id: 't2', name: 'Team B', players: [], games: [] },
      ],
    })
    expect(save.teams.map((t) => t.id)).toEqual(['t1', 't-demo'])
  })

  it('maps legacy foul / goals_allowed names', () => {
    const save = migrateUnknown({
      teams: [
        {
          id: 't1',
          name: 'A',
          players: [],
          games: [
            {
              id: 'g',
              isCompleted: true,
              actions: [
                { actionType: 'foul', playerId: 'p1', gameMinute: 3 },
                { actionType: 'goals_allowed', playerId: 'p1', gameMinute: 8 },
              ],
            },
          ],
        },
      ],
    })
    const types = save.teams[0].games[0].actions.map((a) => a.actionType)
    expect(types).toEqual(['fault', 'goal_allowed'])
  })

  it('keeps a saved formation and unavailable list per match type', () => {
    const save = migrateUnknown({
      teams: [
        {
          id: 't1',
          name: 'A',
          players: [{ id: 'p1', name: 'alex', jerseyNumber: 1, position: 'GK' }],
          games: [],
          defaultFormations: {
            '7v7': [{ playerId: 'p1', position: 'GK', x: 50, y: 91 }],
          },
          defaultUnavailable: { '7v7': ['p2'] },
        },
      ],
    })
    expect(save.teams[0].defaultFormations['7v7']).toEqual([
      { playerId: 'p1', position: 'GK', x: 50, y: 91 },
    ])
    expect(save.teams[0].defaultUnavailable['7v7']).toEqual(['p2'])
    expect(save.teams[1].defaultUnavailable).toEqual({})
  })

  it('keeps official substitution data on a saved game', () => {
    const save = migrateUnknown({
      teams: [
        {
          id: 't1',
          name: 'A',
          players: [],
          games: [
            {
              id: 'g',
              matchType: '11v11',
              substitutionRegulation: 'official',
              extraTime: true,
              actions: [
                {
                  actionType: 'substitution',
                  playerId: 'p2',
                  relatedPlayerId: 'p1',
                  gameSecond: 600,
                },
              ],
            },
          ],
        },
      ],
    })
    const game = save.teams[0].games[0]
    expect(game.substitutionRegulation).toBe('official')
    expect(game.extraTime).toBe(true)
    expect(game.actions[0]).toMatchObject({
      actionType: 'substitution',
      playerId: 'p2',
      relatedPlayerId: 'p1',
    })
  })

  it('reconstructs the kickoff XI when startingFormation is missing', () => {
    const save = migrateUnknown({
      teams: [
        {
          id: 't1',
          name: 'A',
          players: [],
          games: [
            {
              id: 'g',
              elapsedSeconds: 2400,
              formation: [{ playerId: 'p2', position: 'ST', x: 50, y: 10 }],
              actions: [
                {
                  actionType: 'substitution',
                  playerId: 'p2',
                  relatedPlayerId: 'p1',
                  gameSecond: 600,
                },
              ],
            },
          ],
        },
      ],
    })
    expect(save.teams[0].games[0].startingFormation.map((s) => s.playerId)).toEqual(['p1'])
  })
})

describe('import sanitization', () => {
  const hostile = 'x"><img src=x onerror=alert(1)>'
  const SAFE = /^[A-Za-z0-9_-]{1,64}$/

  function hostileSave() {
    return migrateUnknown({
      currentTeamId: hostile,
      teams: [
        {
          id: hostile,
          name: 'U12',
          players: [
            { id: hostile, name: 'alex', jerseyNumber: 10, position: 'ST' },
            { id: 'p2', name: 'sam', jerseyNumber: 7, position: 'CM' },
          ],
          games: [
            {
              id: hostile,
              isCompleted: true,
              numPeriods: 1e9,
              periodDuration: -5,
              homeScore: 1e12,
              awayScore: -3,
              actions: [
                { id: hostile, actionType: 'goal', playerId: hostile, relatedPlayerId: 'p2', gameMinute: 4 },
                { actionType: 'assist', playerId: 'p2', relatedPlayerId: hostile, gameSecond: -40 },
              ],
              formation: [
                { playerId: hostile, position: 'ST"]', x: 500, y: -20 },
                { playerId: 'p2', position: 'CM', x: 50, y: 45 },
              ],
              substitutes: [hostile],
              unavailablePlayers: [hostile, 'p2'],
            },
          ],
          defaultUnavailable: { '7v7': [hostile] },
        },
      ],
    })
  }

  it('replaces unsafe ids and keeps references consistent', () => {
    const save = hostileSave()
    const team = save.teams[0]
    const [alex, sam] = team.players
    const game = team.games[0]

    expect(alex.id).toMatch(SAFE)
    expect(alex.id).not.toBe(hostile)
    expect(sam.id).toBe('p2')
    expect(team.id).toMatch(SAFE)
    expect(save.currentTeamId).toBe(team.id)
    expect(game.id).toMatch(SAFE)
    expect(game.actions[0].id).toMatch(SAFE)

    expect(game.actions[0].playerId).toBe(alex.id)
    expect(game.actions[1].relatedPlayerId).toBe(alex.id)
    expect(game.formation[0].playerId).toBe(alex.id)
    expect(game.substitutes).toEqual([alex.id])
    expect(game.unavailablePlayers).toEqual([alex.id, 'p2'])
    expect(team.defaultUnavailable['7v7']).toEqual([alex.id])
  })

  it('maps the same unsafe id to the same safe id on every load', () => {
    expect(hostileSave().teams[0].players[0].id).toBe(hostileSave().teams[0].players[0].id)
  })

  it('clamps out-of-range numbers and rejects unsafe positions', () => {
    const game = hostileSave().teams[0].games[0]
    expect(game.numPeriods).toBe(20)
    expect(game.periodDuration).toBe(1)
    expect(game.homeScore).toBe(999)
    expect(game.awayScore).toBe(0)
    expect(game.actions[1].gameSecond).toBe(0)
    expect(game.formation[0]).toMatchObject({ position: 'MID-1', x: 100, y: 0 })
    expect(game.formation[1]).toMatchObject({ position: 'CM', x: 50, y: 45 })
  })

  it('clamps jersey numbers to the allowed range', () => {
    const save = migrateUnknown({
      teams: [
        {
          id: 't1',
          name: 'U12',
          players: [
            { id: 'a', name: 'a', jerseyNumber: 250 },
            { id: 'b', name: 'b', jerseyNumber: -4 },
          ],
        },
      ],
    })
    expect(save.teams[0].players.map((p) => p.jerseyNumber)).toEqual([99, 0])
  })

  it('keeps ids already in the safe format untouched', () => {
    const save = migrateUnknown({
      teams: [{ id: 't1', name: 'U12', players: [{ id: 'player_lz3k9a_x7f2qp', name: 'a', jerseyNumber: 1 }] }],
    })
    expect(save.teams[0].players[0].id).toBe('player_lz3k9a_x7f2qp')
  })
})
