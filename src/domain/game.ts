import { newId } from './ids'
import { regulationFor } from './substitutions'
import type { FormationSpot, Game, MatchType, Team } from './types'

export type NewGameInput = {
  opponentName: string
  date: string
  matchType: MatchType
  numPeriods: number
  periodDuration: number
  useSubstitutionTimer: boolean
  substitutionMinutes: number
  formation: FormationSpot[]
  unavailablePlayers: string[]
  official11?: boolean
}

export function createGame(team: Team, input: NewGameInput): Game {
  const formationIds = new Set(input.formation.map((f) => f.playerId))
  const unavailable = new Set(input.unavailablePlayers)
  const substitutes = team.players
    .map((p) => p.id)
    .filter((id) => !formationIds.has(id) && !unavailable.has(id))

  return {
    id: newId('game'),
    date: input.date,
    teamName: team.name,
    opponentName: input.opponentName.trim().toUpperCase(),
    matchType: input.matchType,
    numPeriods: input.numPeriods,
    periodDuration: input.periodDuration,
    homeScore: 0,
    awayScore: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    actions: [],
    formation: input.formation,
    startingFormation: input.formation.map((spot) => ({ ...spot })),
    substitutes,
    unavailablePlayers: [...unavailable],
    isCompleted: false,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: input.useSubstitutionTimer,
    substitutionSeconds: Math.max(1, input.substitutionMinutes) * 60,
    substitutionRegulation: regulationFor(input.matchType, Boolean(input.official11)),
    extraTime: false,
  }
}

export function completeGame(game: Game, elapsedSeconds: number): Game {
  return {
    ...game,
    isCompleted: true,
    endTime: new Date().toISOString(),
    elapsedSeconds,
  }
}

export function capturePeriodScore(game: Game): Game {
  return {
    ...game,
    periodScores: [...game.periodScores, { home: game.homeScore, away: game.awayScore }],
  }
}

export function periodGoalDeltas(game: Game): { home: number; away: number }[] {
  const rows: { home: number; away: number }[] = []
  for (let i = 0; i < game.periodScores.length; i++) {
    const curr = game.periodScores[i]
    const prev = i === 0 ? { home: 0, away: 0 } : game.periodScores[i - 1]
    rows.push({
      home: curr.home - prev.home,
      away: curr.away - prev.away,
    })
  }
  return rows
}
