import { newId } from './ids'
import { FIELD_SPOTS, type FieldSpotDef } from './formation'
import type { FormationSpot, Game, MatchType, ParentProfile, Player, PlayerPosition, Team } from './types'

export const PARENT_KID_ID = 'parent-kid'

export function emptyParentProfile(): ParentProfile {
  return {
    kid: {
      id: PARENT_KID_ID,
      name: '',
      jerseyNumber: 10,
      position: 'ST',
    },
    games: [],
  }
}

export function isParentGame(game: Game | null | undefined): boolean {
  return game?.source === 'parent'
}

export function fieldSpotForPosition(position: string): FieldSpotDef {
  return (
    FIELD_SPOTS.find((spot) => spot.position === position) ??
    FIELD_SPOTS.find((spot) => spot.label === position) ??
    FIELD_SPOTS[0]
  )
}

export function formationSpotFor(kidId: string, position: string): FormationSpot {
  const def = fieldSpotForPosition(position)
  return { playerId: kidId, position: def.position, x: def.x, y: def.y }
}

export function kidOnField(game: Game, kidId: string): FormationSpot | undefined {
  return game.formation.find((spot) => spot.playerId === kidId)
}

export function createParentGame(input: {
  kid: Player
  opponentName: string
  date: string
  numPeriods: number
  periodDuration: number
  startsOnField: boolean
  matchType?: MatchType
}): Game {
  const formation = input.startsOnField ? [formationSpotFor(input.kid.id, input.kid.position)] : []
  return {
    id: newId('game'),
    date: input.date,
    teamName: 'HOME',
    opponentName: input.opponentName.trim().toUpperCase(),
    matchType: input.matchType ?? '7v7',
    numPeriods: input.numPeriods,
    periodDuration: input.periodDuration,
    homeScore: 0,
    awayScore: 0,
    startTime: new Date().toISOString(),
    endTime: null,
    actions: [],
    formation,
    startingFormation: formation.map((spot) => ({ ...spot })),
    substitutes: input.startsOnField ? [] : [input.kid.id],
    unavailablePlayers: [],
    isCompleted: false,
    elapsedSeconds: 0,
    periodScores: [],
    useSubstitutionTimer: false,
    substitutionSeconds: 360,
    substitutionRegulation: 'rolling',
    extraTime: false,
    source: 'parent',
  }
}

export function replayParentFormation(game: Game, kidId: string): Game {
  let formation = game.startingFormation.map((spot) => ({ ...spot }))
  let substitutes = formation.some((spot) => spot.playerId === kidId) ? [] : [kidId]
  for (const action of game.actions) {
    if (action.actionType !== 'substitution' || action.playerId !== kidId) continue
    if (action.position) {
      formation = [formationSpotFor(kidId, action.position)]
      substitutes = []
    } else {
      formation = []
      substitutes = [kidId]
    }
  }
  return { ...game, formation, substitutes }
}

export function moveParentKid(
  game: Game,
  kidId: string,
  dest: string | null,
  gameSecond: number,
): Game {
  const onField = kidOnField(game, kidId)
  const goingToBench = !dest
  if (goingToBench && !onField) return game
  if (dest && onField?.position === dest) return game
  const next = {
    ...game,
    actions: [
      ...game.actions,
      {
        id: newId('act'),
        actionType: 'substitution' as const,
        playerId: kidId,
        relatedPlayerId: kidId,
        gameSecond,
        timestamp: new Date().toISOString(),
        position: dest ?? undefined,
      },
    ],
  }
  return replayParentFormation(next, kidId)
}

export function parentTeamName(): string {
  return 'HOME'
}

export function asParentTeam(profile: ParentProfile, name = 'HOME'): Team {
  const kid = { ...profile.kid, id: PARENT_KID_ID }
  return {
    id: 'parent',
    name,
    players: kid.name ? [kid] : [],
    games: profile.games,
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
    defaultUnavailable: {},
  }
}

export function validateParentKid(
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
): { ok: true; kid: Player } | { ok: false; message: 'playerNameRequired' | 'jerseyRange' } {
  const clean = name.trim().toUpperCase()
  if (!clean) return { ok: false, message: 'playerNameRequired' }
  if (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99) {
    return { ok: false, message: 'jerseyRange' }
  }
  return {
    ok: true,
    kid: { id: PARENT_KID_ID, name: clean, jerseyNumber, position },
  }
}
