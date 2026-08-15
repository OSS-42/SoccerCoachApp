export const APP_VERSION = '2.1.1'
export const SAVE_VERSION = 2
export const MAX_TEAMS = 2
export const LEGACY_SAVE_KEY = 'soccerCoachApp2'
export const LEGACY_SAVE_KEY_V1 = 'soccerCoachApp'
export const SAVE_KEY = 'soccerCoachApp.v2'

export type MatchType = '5v5' | '7v7' | '9v9' | '11v11'

export const MATCH_TYPES: MatchType[] = ['5v5', '7v7', '9v9', '11v11']

export const ON_FIELD_COUNT: Record<MatchType, number> = {
  '5v5': 5,
  '7v7': 7,
  '9v9': 9,
  '11v11': 11,
}

/** Usual period setup for each format. Coaches can still edit the fields. */
export const MATCH_PERIOD_DEFAULTS: Record<MatchType, { numPeriods: number; periodDuration: number }> = {
  '5v5': { numPeriods: 4, periodDuration: 10 },
  '7v7': { numPeriods: 4, periodDuration: 12 },
  '9v9': { numPeriods: 3, periodDuration: 20 },
  '11v11': { numPeriods: 2, periodDuration: 45 },
}

export const BENCH_SLOT_COUNT: Record<MatchType, number> = {
  '5v5': 10,
  '7v7': 12,
  '9v9': 15,
  '11v11': 18,
}

export const DEMO_TEAM_ID = 't-demo'

export const PLAYER_POSITIONS = [
  'GK',
  'SW',
  'LB',
  'LCB',
  'CB',
  'RCB',
  'RB',
  'LWB',
  'CDM',
  'RWB',
  'LM',
  'LCM',
  'CM',
  'RCM',
  'RM',
  'LW',
  'CAM',
  'RW',
  'SS',
  'CF',
  'ST',
] as const

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number]

export type ActionType =
  | 'goal'
  | 'assist'
  | 'save'
  | 'goal_allowed'
  | 'shot_on_goal'
  | 'blocked_shot'
  | 'fault'
  | 'yellow_card'
  | 'red_card'
  | 'own_goal'
  | 'injury'
  | 'late_to_game'
  | 'note'
  | 'game_note'
  | 'substitution'

export type SubstitutionRegulation = 'rolling' | 'official'

export type GameAction = {
  id: string
  actionType: ActionType
  playerId: string | null
  gameSecond: number
  timestamp: string
  noteText?: string
  /** Player leaving the field when actionType is substitution. */
  relatedPlayerId?: string
}

export type Player = {
  id: string
  name: string
  jerseyNumber: number
  position: PlayerPosition
}

export type FormationSpot = {
  playerId: string
  position: string
  x: number
  y: number
}

export type PeriodScore = {
  home: number
  away: number
}

export type Game = {
  id: string
  date: string
  teamName: string
  opponentName: string
  matchType: MatchType
  numPeriods: number
  periodDuration: number
  homeScore: number
  awayScore: number
  startTime: string
  endTime: string | null
  actions: GameAction[]
  formation: FormationSpot[]
  substitutes: string[]
  unavailablePlayers: string[]
  isCompleted: boolean
  elapsedSeconds: number
  periodScores: PeriodScore[]
  useSubstitutionTimer: boolean
  substitutionSeconds: number
  /** Youth + friendly 11v11 = rolling returns. Official 11v11 = one-way, capped. */
  substitutionRegulation: SubstitutionRegulation
  extraTime: boolean
}

export type ClockState = {
  elapsedSeconds: number
  running: boolean
  /** Date.now() when Play was last pressed or the wall clock was committed. */
  runningStartedAt: number | null
  subRemaining: number
  subDuration: number
  subRunning: boolean
  useSubstitutionTimer: boolean
}

export type TeamSettings = {
  defaultSubstitutionSeconds: number | null
}

export type Team = {
  id: string
  name: string
  players: Player[]
  games: Game[]
  settings: TeamSettings
  defaultFormations: Partial<Record<MatchType, FormationSpot[]>>
}

export type AppLanguage = 'en' | 'fr'

export type AppSave = {
  saveVersion: typeof SAVE_VERSION
  appVersion: string
  updatedAt: string
  language: AppLanguage
  teams: Team[]
  currentTeamId: string
  currentGame: Game | null
  clock: ClockState
}

export const DEFAULT_CLOCK: ClockState = {
  elapsedSeconds: 0,
  running: false,
  runningStartedAt: null,
  subRemaining: 6 * 60,
  subDuration: 6 * 60,
  subRunning: false,
  useSubstitutionTimer: false,
}

export function emptyLiveStats() {
  return {
    goals: 0,
    assists: 0,
    saves: 0,
    goalsAllowed: 0,
    shotOnGoal: 0,
    blockedShot: 0,
    faults: 0,
    yellowCards: 0,
    redCards: 0,
    ownGoals: 0,
    injured: false,
    lateToGame: false,
  }
}

export type LiveStats = ReturnType<typeof emptyLiveStats>
