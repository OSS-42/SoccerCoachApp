import {
  DEFAULT_SUB_MINUTES,
  ELEVEN_V11_OFFICIAL_MINUTES,
  ELEVEN_V11_PERIODS,
  SAVE_VERSION,
} from './config'

export {
  APP_NAME,
  APP_VERSION,
  SAVE_VERSION,
  MAX_TEAMS,
  LEGACY_SAVE_KEY,
  LEGACY_SAVE_KEY_V1,
  SAVE_KEY,
  SAVE_BACKUP_KEY,
  DEMO_TEAM_ID,
  DEFAULT_SUB_MINUTES,
} from './config'

export type MatchType = '5v5' | '7v7' | '9v9' | '11v11'

export const MATCH_TYPES: MatchType[] = ['5v5', '7v7', '9v9', '11v11']

export function isMatchType(value: string): value is MatchType {
  return (MATCH_TYPES as readonly string[]).includes(value)
}

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
  '11v11': { numPeriods: ELEVEN_V11_PERIODS, periodDuration: ELEVEN_V11_OFFICIAL_MINUTES },
}

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
  | 'interception'
  | 'fault'
  | 'yellow_card'
  | 'red_card'
  | 'own_goal'
  | 'opp_yellow'
  | 'opp_red'
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
  /** Pitch spot the incoming player takes (copied from the player going off). */
  position?: string
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
  /** Kickoff XI. `formation` is the live/final XI after substitutions. */
  startingFormation: FormationSpot[]
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
  source?: GameSource
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
export type AppTheme = 'dark' | 'light'
export type AppEntitlement = 'lite' | 'pro'
export type AppRole = 'coach' | 'parent'
export type GameSource = 'coach' | 'parent'

export type ParentProfile = {
  kid: Player
  games: Game[]
}

export type AppSave = {
  saveVersion: typeof SAVE_VERSION
  appVersion: string
  updatedAt: string
  language: AppLanguage
  theme: AppTheme
  entitlement: AppEntitlement
  role: AppRole
  roleChosen: boolean
  parent: ParentProfile
  teams: Team[]
  currentTeamId: string
  currentGame: Game | null
  clock: ClockState
}

export const DEFAULT_CLOCK: ClockState = {
  elapsedSeconds: 0,
  running: false,
  runningStartedAt: null,
  subRemaining: DEFAULT_SUB_MINUTES * 60,
  subDuration: DEFAULT_SUB_MINUTES * 60,
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
    interceptions: 0,
    faults: 0,
    yellowCards: 0,
    redCards: 0,
    ownGoals: 0,
    injured: false,
    lateToGame: false,
  }
}

export type LiveStats = ReturnType<typeof emptyLiveStats>
