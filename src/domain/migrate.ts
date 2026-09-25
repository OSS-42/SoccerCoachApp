import { detectLocale, isLocale } from '@/i18n'
import { emptyParentProfile, isParentGame, replayParentFormation } from './parent'
import { reconstructStartingFormation } from './playingTime'
import { canSelectTeam, liteHomeTeamId } from './entitlement'
import { createDefaultTeams, dropEmptyPlaceholderTeams, ensureDemoTeam, isPlayerPosition } from './teams'
import { JERSEY_MAX, JERSEY_MIN } from './config'
import {
  APP_VERSION,
  DEFAULT_CLOCK,
  DEFAULT_SUB_MINUTES,
  MATCH_TYPES,
  SAVE_VERSION,
  type ActionType,
  type AppSave,
  type ClockState,
  type FormationSpot,
  type Game,
  type GameAction,
  type MatchType,
  type Player,
  type AppEntitlement,
  type AppTheme,
  type SubstitutionRegulation,
  type PlayerPosition,
  type ParentProfile,
  type AppRole,
  type Team,
  type TutorialSave,
} from './types'
import { emptyTutorial } from './tutorial'

const ACTION_ALIASES: Record<string, ActionType> = {
  goal: 'goal',
  assist: 'assist',
  save: 'save',
  goal_allowed: 'goal_allowed',
  goals_allowed: 'goal_allowed',
  shot_on_goal: 'shot_on_goal',
  shot: 'shot_on_goal',
  blocked_shot: 'blocked_shot',
  interception: 'interception',
  intercept: 'interception',
  fault: 'fault',
  foul: 'fault',
  yellow_card: 'yellow_card',
  red_card: 'red_card',
  own_goal: 'own_goal',
  opp_yellow: 'opp_yellow',
  opp_red: 'opp_red',
  injury: 'injury',
  late_to_game: 'late_to_game',
  note: 'note',
  game_note: 'game_note',
  substitution: 'substitution',
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asBool(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

const MAX_PERIODS = 20
const MAX_PERIOD_MINUTES = 120
const MAX_SCORE = 999
const MAX_GAME_SECONDS = 24 * 60 * 60

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/
const SAFE_POSITION = /^[A-Za-z0-9_-]{1,32}$/

function fnv1a(value: string, seed: number): string {
  let h = seed
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

/**
 * Ids end up in HTML attributes and CSS selectors. Unsafe ids are replaced by a
 * deterministic hash so every reference to the same raw id still resolves.
 */
export function asId(value: unknown, fallback: string): string {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : value
  if (typeof raw !== 'string' || !raw) return fallback
  if (SAFE_ID.test(raw)) return raw
  return `id_${fnv1a(raw, 0x811c9dc5)}${fnv1a(raw, 0x9e3779b9)}`
}

function asIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((id) => asId(id, '')).filter(Boolean)
}

function asMatchType(value: unknown): MatchType {
  return MATCH_TYPES.includes(value as MatchType) ? (value as MatchType) : '11v11'
}

function asPosition(value: unknown): PlayerPosition {
  const raw = asString(value, 'CM')
  if (isPlayerPosition(raw)) return raw
  const map: Record<string, PlayerPosition> = {
    Goalkeeper: 'GK',
    Defender: 'CB',
    Midfielder: 'CM',
    Striker: 'ST',
    Forward: 'ST',
  }
  return map[raw] ?? 'CM'
}

function migratePlayer(raw: unknown, index: number): Player | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const name = asString(rec.name).trim().toUpperCase()
  if (!name) return null
  return {
    id: asId(rec.id, `p_legacy_${index}`),
    name,
    jerseyNumber: clamp(Math.round(asNumber(rec.jerseyNumber, index + 1)), JERSEY_MIN, JERSEY_MAX),
    position: asPosition(rec.position),
  }
}

function migrateAction(raw: unknown, index: number): GameAction | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const type = ACTION_ALIASES[asString(rec.actionType)]
  if (!type) return null
  const minute = asNumber(rec.gameMinute, 0)
  const second = rec.gameSecond != null ? asNumber(rec.gameSecond, minute * 60) : minute * 60
  return {
    id: asId(rec.id, `act_legacy_${index}`),
    actionType: type,
    playerId: rec.playerId == null ? null : asId(rec.playerId, ''),
    gameSecond: clamp(second, 0, MAX_GAME_SECONDS),
    timestamp: asString(rec.timestamp, new Date().toISOString()),
    noteText: rec.noteText ? asString(rec.noteText) : undefined,
    relatedPlayerId: rec.relatedPlayerId ? asId(rec.relatedPlayerId, '') || undefined : undefined,
    period:
      typeof rec.period === 'number' && Number.isFinite(rec.period) && rec.period >= 1
        ? Math.floor(rec.period)
        : undefined,
  }
}

function asRegulation(value: unknown): SubstitutionRegulation | null {
  return value === 'official' || value === 'rolling' ? value : null
}

function migrateFormation(raw: unknown): FormationSpot[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const rec = asRecord(item)
      const playerId = asId(rec?.playerId, '')
      if (!rec || !playerId) return null
      const position = asString(rec.position, 'MID-1')
      return {
        playerId,
        position: SAFE_POSITION.test(position) ? position : 'MID-1',
        x: clamp(asNumber(rec.x, 50), 0, 100),
        y: clamp(asNumber(rec.y, 50), 0, 100),
      }
    })
    .filter((s): s is FormationSpot => Boolean(s))
}

function migrateGame(raw: unknown, index: number): Game | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const formation = migrateFormation(rec.formation ?? rec.formationPlayers)
  const unavailable = asIdList(rec.unavailablePlayers)
  const substitutes = asIdList(rec.substitutes)
  const actions = Array.isArray(rec.actions)
    ? rec.actions.map(migrateAction).filter((a): a is GameAction => Boolean(a))
    : []
  const startingSaved = migrateFormation(rec.startingFormation)
  return {
    id: asId(rec.id, `game_legacy_${index}`),
    date: asString(rec.date, new Date().toISOString().slice(0, 10)),
    teamName: asString(rec.teamName, 'TEAM'),
    opponentName: asString(rec.opponentName, 'OPPONENT').toUpperCase(),
    matchType: asMatchType(rec.matchType),
    numPeriods: clamp(Math.round(asNumber(rec.numPeriods, 2)), 1, MAX_PERIODS),
    periodDuration: clamp(asNumber(rec.periodDuration, 12), 1, MAX_PERIOD_MINUTES),
    homeScore: clamp(asNumber(rec.homeScore, 0), 0, MAX_SCORE),
    awayScore: clamp(asNumber(rec.awayScore, 0), 0, MAX_SCORE),
    startTime: asString(rec.startTime, new Date().toISOString()),
    endTime: rec.endTime ? asString(rec.endTime) : null,
    actions,
    formation,
    startingFormation: startingSaved.length
      ? startingSaved
      : reconstructStartingFormation(formation, actions),
    substitutes,
    unavailablePlayers: unavailable,
    isCompleted: asBool(rec.isCompleted, false),
    elapsedSeconds: clamp(asNumber(rec.elapsedSeconds ?? rec.totalGameTime ?? rec.gameTime, 0), 0, MAX_GAME_SECONDS),
    periodScores: Array.isArray(rec.periodScores)
      ? rec.periodScores.slice(0, MAX_PERIODS * 2).map((p) => {
          const row = asRecord(p)
          return {
            home: clamp(asNumber(row?.home, 0), 0, MAX_SCORE),
            away: clamp(asNumber(row?.away, 0), 0, MAX_SCORE),
            endedAt:
              typeof row?.endedAt === 'number' && Number.isFinite(row.endedAt)
                ? row.endedAt
                : undefined,
          }
        })
      : [],
    useSubstitutionTimer: asBool(rec.useSubstitutionTimer, false),
    substitutionSeconds: asNumber(rec.substitutionSeconds, DEFAULT_SUB_MINUTES * 60),
    substitutionRegulation: asRegulation(rec.substitutionRegulation) ?? 'rolling',
    extraTime: asBool(rec.extraTime, false),
    source: rec.source === 'parent' ? 'parent' : 'coach',
  }
}

function migrateRole(raw: unknown): AppRole {
  return raw === 'parent' ? 'parent' : 'coach'
}

function migrateParent(raw: unknown): ParentProfile {
  const rec = asRecord(raw)
  const base = emptyParentProfile()
  if (!rec) return base
  const kid = migratePlayer(rec.kid, 0)
  return {
    kid: kid ?? base.kid,
    games: Array.isArray(rec.games)
      ? rec.games
          .map(migrateGame)
          .filter((g): g is NonNullable<typeof g> => Boolean(g))
          .map((game) =>
            isParentGame(game) ? replayParentFormation(game, (kid ?? base.kid).id) : { ...game, source: 'parent' },
          )
      : [],
  }
}

function migrateTeam(raw: unknown, index: number): Team | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const settingsRec = asRecord(rec.settings)
  return {
    id: asId(rec.id, `t${index + 1}`),
    name: asString(rec.name, `Team ${index + 1}`).toUpperCase(),
    players: Array.isArray(rec.players)
      ? rec.players.map(migratePlayer).filter((p): p is Player => Boolean(p))
      : [],
    games: Array.isArray(rec.games)
      ? rec.games.map(migrateGame).filter((g): g is Game => Boolean(g))
      : [],
    settings: {
      defaultSubstitutionSeconds:
        settingsRec?.defaultSubstitutionTime != null
          ? asNumber(settingsRec.defaultSubstitutionTime) * 60
          : settingsRec?.defaultSubstitutionSeconds != null
            ? asNumber(settingsRec.defaultSubstitutionSeconds)
            : null,
    },
    defaultFormations: migrateDefaultFormations(rec.defaultFormations ?? rec.formationTemp),
    defaultUnavailable: migrateDefaultUnavailable(rec.defaultUnavailable),
  }
}

function migrateDefaultFormations(raw: unknown): Team['defaultFormations'] {
  const rec = asRecord(raw)
  if (rec && !Array.isArray(raw)) {
    const out: Team['defaultFormations'] = {}
    for (const key of MATCH_TYPES) {
      if (Array.isArray(rec[key])) out[key] = migrateFormation(rec[key])
    }
    return out
  }
  return {}
}

function migrateDefaultUnavailable(raw: unknown): Team['defaultUnavailable'] {
  const rec = asRecord(raw)
  if (!rec || Array.isArray(raw)) return {}
  const out: Team['defaultUnavailable'] = {}
  for (const key of MATCH_TYPES) {
    if (!Array.isArray(rec[key])) continue
    out[key] = asIdList(rec[key].filter((id): id is string => typeof id === 'string'))
  }
  return out
}

function emptyClock(): ClockState {
  return { ...DEFAULT_CLOCK }
}

function migrateClock(raw: unknown, fallbackElapsed: number, useSub: boolean, subSeconds: number): ClockState {
  const rec = asRecord(raw)
  const running = asBool(rec?.running, false)
  const startedAt = rec?.runningStartedAt != null ? asNumber(rec.runningStartedAt) : null
  return {
    elapsedSeconds: asNumber(rec?.elapsedSeconds, fallbackElapsed),
    running,
    runningStartedAt: running ? (startedAt || Date.now()) : null,
    subRemaining: asNumber(rec?.subRemaining, subSeconds),
    subDuration: asNumber(rec?.subDuration, subSeconds),
    subRunning: running && useSub && asBool(rec?.subRunning, false),
    useSubstitutionTimer: asBool(rec?.useSubstitutionTimer, useSub),
  }
}

function migrateLanguage(raw: unknown): AppSave['language'] {
  const rec = asRecord(raw)
  const value = rec ? asString(rec.language) : ''
  return isLocale(value) ? value : detectLocale()
}

function migrateTheme(raw: unknown): AppTheme {
  const rec = asRecord(raw)
  const value = rec ? asString(rec.theme) : ''
  return value === 'light' || value === 'dark' ? value : 'dark'
}

function migrateEntitlement(raw: unknown): AppEntitlement {
  const rec = asRecord(raw)
  const value = rec ? asString(rec.entitlement) : ''
  return value === 'pro' ? 'pro' : 'lite'
}

export function freshSave(): AppSave {
  const teams = createDefaultTeams()
  return {
    saveVersion: SAVE_VERSION,
    appVersion: APP_VERSION,
    updatedAt: new Date().toISOString(),
    language: detectLocale(),
    theme: 'dark',
    entitlement: 'lite',
    role: 'coach',
    roleChosen: false,
    parent: emptyParentProfile(),
    teams,
    currentTeamId: teams[0].id,
    currentGame: null,
    clock: emptyClock(),
    tutorial: emptyTutorial(),
    changelogSeenVersion: null,
  }
}

function migrateTutorial(raw: unknown): TutorialSave {
  const rec = asRecord(raw)
  if (!rec) return emptyTutorial()
  const coach = rec.coachRev
  const parent = rec.parentRev
  return {
    coachRev: typeof coach === 'number' && Number.isFinite(coach) ? coach : null,
    parentRev: typeof parent === 'number' && Number.isFinite(parent) ? parent : null,
  }
}

function withSelectableTeam(save: AppSave): AppSave {
  if (canSelectTeam(save, save.currentTeamId)) return save
  const next = liteHomeTeamId(save.teams) ?? save.teams[0]?.id
  if (!next || next === save.currentTeamId) return save
  return { ...save, currentTeamId: next }
}

export function migrateUnknown(raw: unknown): AppSave {
  const rec = asRecord(raw)
  if (!rec) return freshSave()

  if (Array.isArray(rec.teams) && rec.teams.length > 0) {
    const teams = rec.teams.map(migrateTeam).filter((t): t is Team => Boolean(t))
    const safeTeams = dropEmptyPlaceholderTeams(
      ensureDemoTeam(teams.length ? teams : createDefaultTeams()),
    )
    const currentTeamId = asId(rec.currentTeamId, safeTeams[0].id)
    const currentGameRaw = rec.currentGame
    const currentGame = currentGameRaw ? migrateGame(currentGameRaw, 0) : null
    const inProgress = currentGame && !currentGame.isCompleted ? currentGame : null
    const draft: AppSave = {
      saveVersion: SAVE_VERSION,
      appVersion: APP_VERSION,
      updatedAt: new Date().toISOString(),
      language: migrateLanguage(rec),
      theme: migrateTheme(rec),
      entitlement: migrateEntitlement(rec),
      role: migrateRole(rec.role),
      roleChosen: asBool(rec.roleChosen, false),
      parent: migrateParent(rec.parent),
      teams: safeTeams,
      currentTeamId: safeTeams.some((t) => t.id === currentTeamId) ? currentTeamId : safeTeams[0].id,
      currentGame: inProgress,
      clock: inProgress
        ? migrateClock(
            rec.clock,
            inProgress.elapsedSeconds,
            inProgress.useSubstitutionTimer,
            inProgress.substitutionSeconds,
          )
        : emptyClock(),
      tutorial: migrateTutorial(rec.tutorial),
      changelogSeenVersion: asString(rec.changelogSeenVersion) || null,
    }
    return withSelectableTeam(draft)
  }

  const legacyTeam = migrateTeam(
    {
      id: 't1',
      name: rec.teamName ?? 'Team A',
      players: rec.players ?? [],
      games: rec.games ?? [],
      settings: rec.settings ?? {},
    },
    0,
  )
  const teams = dropEmptyPlaceholderTeams(
    ensureDemoTeam([legacyTeam ?? createDefaultTeams()[0]]),
  )
  return withSelectableTeam({
    saveVersion: SAVE_VERSION,
    appVersion: APP_VERSION,
    updatedAt: new Date().toISOString(),
    language: migrateLanguage(rec),
    theme: migrateTheme(rec),
    entitlement: migrateEntitlement(rec),
    role: migrateRole(rec.role),
    roleChosen: asBool(rec.roleChosen, false),
    parent: migrateParent(rec.parent),
    teams,
    currentTeamId: teams[0].id,
    currentGame: null,
    clock: emptyClock(),
    tutorial: migrateTutorial(rec.tutorial),
    changelogSeenVersion: asString(rec.changelogSeenVersion) || null,
  })
}
