import { describe, expect, it } from 'vitest'
import { migrateUnknown } from './migrate'

describe('migrateUnknown', () => {
  it('creates Team A, Team B, and a 23-player DEMO TEAM', () => {
    const save = migrateUnknown(null)
    expect(save.teams.map((t) => t.name)).toEqual(['TEAM A', 'TEAM B', 'DEMO TEAM'])
    expect(save.teams[0].players).toHaveLength(0)
    expect(save.teams[2].players).toHaveLength(23)
    expect(save.currentGame).toBeNull()
    expect(save.theme).toBe('dark')
    expect(save.roleChosen).toBe(false)
    expect(save.role).toBe('coach')
    expect(save.parent.kid.id).toBe('parent-kid')
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
    expect(save.currentTeamId).toBe('t2')
    expect(save.currentGame?.opponentName).toBe('FOXES')
    expect(save.currentGame?.formation).toHaveLength(1)
    expect(save.currentGame?.actions[0].actionType).toBe('goal')
    expect(save.currentGame?.substitutionRegulation).toBe('rolling')
    expect(save.currentGame?.extraTime).toBe(false)
    expect(save.clock.running).toBe(false)
    expect(save.teams[1].players[0].name).toBe('ALEX')
    expect(save.teams.some((t) => t.name === 'DEMO TEAM' && t.players.length === 23)).toBe(true)
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
