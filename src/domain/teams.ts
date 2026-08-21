import { DEMO_TEAM_ID, JERSEY_MAX, JERSEY_MIN, MAX_TEAMS } from './config'
import { newId } from './ids'
import { PLAYER_POSITIONS, type Player, type PlayerPosition, type Team } from './types'

const DEMO_ROSTER: { name: string; jerseyNumber: number; position: PlayerPosition }[] = [
  { name: 'NOAH', jerseyNumber: 1, position: 'GK' },
  { name: 'LIAM', jerseyNumber: 2, position: 'CB' },
  { name: 'MASON', jerseyNumber: 3, position: 'LCB' },
  { name: 'ETHAN', jerseyNumber: 4, position: 'RCB' },
  { name: 'LUCAS', jerseyNumber: 5, position: 'LB' },
  { name: 'OLIVER', jerseyNumber: 6, position: 'RB' },
  { name: 'JAMES', jerseyNumber: 7, position: 'CDM' },
  { name: 'BEN', jerseyNumber: 8, position: 'CM' },
  { name: 'HENRY', jerseyNumber: 9, position: 'LCM' },
  { name: 'ALEX', jerseyNumber: 10, position: 'CAM' },
  { name: 'WILL', jerseyNumber: 11, position: 'ST' },
  { name: 'MIKE', jerseyNumber: 12, position: 'GK' },
  { name: 'DANIEL', jerseyNumber: 13, position: 'SW' },
  { name: 'MATEO', jerseyNumber: 14, position: 'LWB' },
  { name: 'JACK', jerseyNumber: 15, position: 'RWB' },
  { name: 'SAM', jerseyNumber: 16, position: 'LM' },
  { name: 'DAVID', jerseyNumber: 17, position: 'RM' },
  { name: 'JOSEPH', jerseyNumber: 18, position: 'RCM' },
  { name: 'CARTER', jerseyNumber: 19, position: 'LW' },
  { name: 'OWEN', jerseyNumber: 20, position: 'RW' },
  { name: 'WYATT', jerseyNumber: 21, position: 'SS' },
  { name: 'JOHN', jerseyNumber: 22, position: 'CF' },
  { name: 'LEO', jerseyNumber: 23, position: 'ST' },
]

export function createDemoTeam(): Team {
  return {
    id: DEMO_TEAM_ID,
    name: 'DEMO TEAM',
    players: DEMO_ROSTER.map((row) => ({
      id: `demo-${row.jerseyNumber}`,
      name: row.name,
      jerseyNumber: row.jerseyNumber,
      position: row.position,
    })),
    games: [],
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
  }
}

export function ensureDemoTeam(teams: Team[]): Team[] {
  if (teams.some((team) => team.id === DEMO_TEAM_ID)) return teams
  return [...teams, createDemoTeam()]
}

export function createTeam(name: string, id?: string): Team {
  return {
    id: id ?? newId('t'),
    name: normalizeName(name) || 'TEAM',
    players: [],
    games: [],
    settings: { defaultSubstitutionSeconds: null },
    defaultFormations: {},
  }
}

export function createDefaultTeams(): Team[] {
  return [createTeam('Team A', 't1'), createTeam('Team B', 't2'), createDemoTeam()]
}

export function normalizeName(value: string): string {
  return value.trim().toUpperCase()
}

export function canAddTeam(teams: Team[]): boolean {
  return teams.filter((team) => team.id !== DEMO_TEAM_ID).length < MAX_TEAMS
}

export function isPlayerPosition(value: string): value is PlayerPosition {
  return (PLAYER_POSITIONS as readonly string[]).includes(value)
}

export function createPlayer(
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
  existing: Player[],
): { ok: true; player: Player } | { ok: false; message: string } {
  const cleanName = normalizeName(name)
  if (!cleanName) return { ok: false, message: 'playerNameRequired' }
  if (!Number.isInteger(jerseyNumber) || jerseyNumber < JERSEY_MIN || jerseyNumber > JERSEY_MAX) {
    return { ok: false, message: 'jerseyRange' }
  }
  if (existing.some((p) => p.jerseyNumber === jerseyNumber)) {
    return { ok: false, message: 'jerseyTaken' }
  }
  return {
    ok: true,
    player: {
      id: newId('p'),
      name: cleanName,
      jerseyNumber,
      position,
    },
  }
}

export function updatePlayer(
  existing: Player[],
  playerId: string,
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
): { ok: true; players: Player[] } | { ok: false; message: string } {
  const cleanName = normalizeName(name)
  if (!cleanName) return { ok: false, message: 'playerNameRequired' }
  if (!Number.isInteger(jerseyNumber) || jerseyNumber < JERSEY_MIN || jerseyNumber > JERSEY_MAX) {
    return { ok: false, message: 'jerseyRange' }
  }
  if (existing.some((p) => p.id !== playerId && p.jerseyNumber === jerseyNumber)) {
    return { ok: false, message: 'jerseyTakenOther' }
  }
  return {
    ok: true,
    players: existing.map((p) =>
      p.id === playerId ? { ...p, name: cleanName, jerseyNumber, position } : p,
    ),
  }
}

export function findTeam(teams: Team[], id: string | null): Team | null {
  return teams.find((t) => t.id === id) ?? teams[0] ?? null
}
