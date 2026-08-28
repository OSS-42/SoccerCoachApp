import { detectLocale, isLocale } from '@/i18n'
import { emptyParentProfile, isParentGame, replayParentFormation } from './parent'
import { reconstructStartingFormation } from './playingTime'
import { canSelectTeam, liteHomeTeamId } from './entitlement'
import { createDefaultTeams, dropEmptyPlaceholderTeams, ensureDemoTeam, isPlayerPosition } from './teams'
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
} from './types'

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
    id: asString(rec.id, `p_legacy_${index}`),
    name,
    jerseyNumber: asNumber(rec.jerseyNumber, index + 1),
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
    id: asString(rec.id, `act_legacy_${index}`),
    actionType: type,
    playerId: rec.playerId == null ? null : asString(rec.playerId),
    gameSecond: second,
    timestamp: asString(rec.timestamp, new Date().toISOString()),
    noteText: rec.noteText ? asString(rec.noteText) : undefined,
    relatedPlayerId: rec.relatedPlayerId ? asString(rec.relatedPlayerId) : undefined,
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
      if (!rec || !rec.playerId) return null
      return {
        playerId: asString(rec.playerId),
        position: asString(rec.position, 'MID-1'),
        x: asNumber(rec.x, 50),
        y: asNumber(rec.y, 50),
      }
    })
    .filter((s): s is FormationSpot => Boolean(s))
}

function migrateGame(raw: unknown, index: number): Game | null {
  const rec = asRecord(raw)
  if (!rec) return null
  const formation = migrateFormation(rec.formation ?? rec.formationPlayers)
  const unavailable = Array.isArray(rec.unavailablePlayers)
    ? rec.unavailablePlayers.map((id) => String(id))
    : []
  const substitutes = Array.isArray(rec.substitutes)
    ? rec.substitutes.map((id) => String(id))
    : []
  const actions = Array.isArray(rec.actions)
    ? rec.actions.map(migrateAction).filter((a): a is GameAction => Boolean(a))
    : []
  const startingSaved = migrateFormation(rec.startingFormation)
  return {
    id: asString(rec.id, `game_legacy_${index}`),
    date: asString(rec.date, new Date().toISOString().slice(0, 10)),
    teamName: asString(rec.teamName, 'TEAM'),
    opponentName: asString(rec.opponentName, 'OPPONENT').toUpperCase(),
    matchType: asMatchType(rec.matchType),
    numPeriods: Math.max(1, asNumber(rec.numPeriods, 2)),
    periodDuration: Math.max(1, asNumber(rec.periodDuration, 12)),
    homeScore: asNumber(rec.homeScore, 0),
    awayScore: asNumber(rec.awayScore, 0),
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
    elapsedSeconds: asNumber(rec.elapsedSeconds ?? rec.totalGameTime ?? rec.gameTime, 0),
    periodScores: Array.isArray(rec.periodScores)
      ? rec.periodScores.map((p) => {
          const row = asRecord(p)
          return { home: asNumber(row?.home, 0), away: asNumber(row?.away, 0) }
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
    id: asString(rec.id, `t${index + 1}`),
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
    out[key] = rec[key].filter((id): id is string => typeof id === 'string' && id.length > 0)
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
    const currentTeamId = asString(rec.currentTeamId, safeTeams[0].id)
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
  })
}
