import { applyAction, createAction, revertAction } from '@/domain/actions'
import { MAX_TEAMS, YELLOWS_FOR_RED } from '@/domain/config'
import {
  commitWallClock,
  currentPeriod,
  finishPeriodElapsed,
  wallElapsed,
  wallSubRemaining,
} from '@/domain/clock'
import { createGame, completeGame, capturePeriodScore } from '@/domain/game'
import {
  asParentTeam,
  createParentGame,
  emptyParentProfile,
  isParentGame,
  moveParentKid,
  validateParentKid,
} from '@/domain/parent'
import { applySubstitution, beginExtraTime as unlockExtraTime } from '@/domain/substitutions'
import type { NewGameInput } from '@/domain/game'
import { freshSave } from '@/domain/migrate'
import { TUTORIAL_COACH_REV, TUTORIAL_PARENT_REV, emptyTutorial } from '@/domain/tutorial'
import { canSelectTeam } from '@/domain/entitlement'
import { canAddTeam, createPlayer, createTeam, findTeam, updatePlayer } from '@/domain/teams'
import {
  APP_VERSION,
  DEFAULT_CLOCK,
  DEMO_TEAM_ID,
  SAVE_VERSION,
  type ActionType,
  type AppRole,
  type AppSave,
  type AppTheme,
  type FormationSpot,
  type Game,
  type MatchType,
  type PlayerPosition,
  type Team,
} from '@/domain/types'
import { setLocale, t, type Locale, type MessageKey } from '@/i18n'
import { applyTheme } from '@/lib/theme'
import { clearSaves, loadSave, writeSave } from '@/lib/storage'

type Listener = () => void

let state: AppSave = freshSave()
const listeners = new Set<Listener>()

function emit(): void {
  for (const listener of listeners) listener()
}

function persist(): void {
  state = { ...state, appVersion: APP_VERSION, saveVersion: SAVE_VERSION, updatedAt: new Date().toISOString() }
  writeSave(state)
  emit()
}

function updateCurrentTeam(mutator: (team: Team) => Team): void {
  const current = findTeam(state.teams, state.currentTeamId)
  if (!current) return
  state = {
    ...state,
    teams: state.teams.map((t) => (t.id === current.id ? mutator(t) : t)),
    currentTeamId: current.id,
  }
}

export function hydrate(): void {
  state = loadSave()
  setLocale(state.language)
  applyTheme(state.theme ?? 'dark')
  if (state.clock?.running && !state.clock.runningStartedAt) {
    state = {
      ...state,
      clock: { ...state.clock, runningStartedAt: Date.now() },
    }
  }
  persist()
}

export function setLanguage(language: Locale): void {
  setLocale(language)
  state = { ...state, language }
  persist()
}

export function setTheme(theme: AppTheme): void {
  applyTheme(theme)
  state = { ...state, theme }
  persist()
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSave(): AppSave {
  return state
}

export function getCurrentTeam(): Team | null {
  return findTeam(state.teams, state.currentTeamId)
}

export function getCurrentGame(): Game | null {
  return state.currentGame
}

export function hasInProgressGame(): boolean {
  return Boolean(state.currentGame && !state.currentGame.isCompleted)
}

export function getRole(): AppRole {
  return state.role === 'parent' ? 'parent' : 'coach'
}

export function hasChosenRole(): boolean {
  return Boolean(state.roleChosen)
}

export function setRole(role: AppRole): void {
  state = { ...state, role, roleChosen: true }
  persist()
}

export function completeTutorial(role: AppRole): void {
  const key = role === 'parent' ? 'parentRev' : 'coachRev'
  const rev = role === 'parent' ? TUTORIAL_PARENT_REV : TUTORIAL_COACH_REV
  state = {
    ...state,
    tutorial: { ...(state.tutorial ?? emptyTutorial()), [key]: rev },
    changelogSeenVersion: APP_VERSION,
  }
  persist()
}

export function markChangelogSeen(): void {
  state = { ...state, changelogSeenVersion: APP_VERSION }
  persist()
}

export function getParentProfile() {
  return state.parent ?? emptyParentProfile()
}

export function parentRosterTeam(): Team {
  return asParentTeam(getParentProfile(), t('homeTeam'))
}

export function isParentLive(): boolean {
  return isParentGame(state.currentGame)
}

export function hasInProgressGameFor(role: AppRole): boolean {
  if (!hasInProgressGame() || !state.currentGame) return false
  const source = state.currentGame.source ?? 'coach'
  return source === role
}

export function saveParentKid(
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
): { ok: boolean; message: string } {
  const result = validateParentKid(name, jerseyNumber, position)
  if (!result.ok) return { ok: false, message: t(result.message) }
  state = { ...state, parent: { ...getParentProfile(), kid: result.kid } }
  persist()
  return { ok: true, message: t('playerUpdated', { name: result.kid.name }) }
}

export function startParentGame(input: {
  opponentName: string
  date: string
  numPeriods: number
  periodDuration: number
  startsOnField: boolean
}): { ok: boolean; message: string } {
  const kid = getParentProfile().kid
  if (!kid.name) return { ok: false, message: t('playerNameRequired') }
  if (!input.opponentName.trim()) return { ok: false, message: t('needOpponent') }
  if (!input.date) return { ok: false, message: t('needDate') }
  if (input.numPeriods < 1) return { ok: false, message: t('needPeriod') }
  if (input.periodDuration < 1) return { ok: false, message: t('needPeriodTime') }
  if (hasInProgressGame()) discardCurrentGame()
  const game = createParentGame({
    kid,
    opponentName: input.opponentName,
    date: input.date,
    numPeriods: input.numPeriods,
    periodDuration: input.periodDuration,
    startsOnField: input.startsOnField,
  })
  state = {
    ...state,
    currentGame: game,
    clock: {
      elapsedSeconds: 0,
      running: false,
      runningStartedAt: null,
      subDuration: game.substitutionSeconds,
      subRemaining: game.substitutionSeconds,
      subRunning: false,
      useSubstitutionTimer: false,
    },
  }
  persist()
  return { ok: true, message: t('gameStarted') }
}

export function moveParentKidLive(dest: string | null): { ok: boolean; message?: string } {
  const game = state.currentGame
  const kid = getParentProfile().kid
  if (!game || !isParentGame(game)) return { ok: false, message: t('noGame') }
  const next = moveParentKid(game, kid.id, dest, wallElapsed(state.clock))
  state = { ...state, currentGame: { ...next, elapsedSeconds: wallElapsed(state.clock) } }
  persist()
  return { ok: true }
}

export function findCompletedGame(gameId: string): { game: Game; team: Team } | null {
  const parent = getParentProfile()
  const parentGame = parent.games.find((g) => g.id === gameId)
  if (parentGame) return { game: parentGame, team: parentRosterTeam() }
  for (const team of state.teams) {
    const game = team.games.find((g) => g.id === gameId)
    if (game) return { game, team }
  }
  return null
}

export function selectTeam(teamId: string): void {
  if (!state.teams.some((t) => t.id === teamId)) return
  if (!canSelectTeam(state, teamId)) return
  state = { ...state, currentTeamId: teamId }
  persist()
}

export function renameTeam(name: string): { ok: boolean; message: string } {
  const trimmed = name.trim().toUpperCase()
  if (!trimmed) return { ok: false, message: t('teamNameRequired') }
  updateCurrentTeam((team) => ({ ...team, name: trimmed }))
  persist()
  return { ok: true, message: t('teamNameSaved') }
}

export function addTeam(name: string): { ok: boolean; message: string } {
  if (!canAddTeam(state.teams)) {
    return {
      ok: false,
      message: t('maxTeams', { max: MAX_TEAMS }),
    }
  }
  const team = createTeam(name)
  state = { ...state, teams: [...state.teams, team], currentTeamId: team.id }
  persist()
  return { ok: true, message: t('teamCreated', { name: team.name }) }
}

export function deleteCurrentTeam(): { ok: boolean; message: string } {
  if (state.teams.length <= 1) return { ok: false, message: t('needOneTeam') }
  const current = getCurrentTeam()
  if (!current) return { ok: false, message: t('noTeamToDelete') }
  const teams = state.teams.filter((t) => t.id !== current.id)
  const nextGame =
    state.currentGame && state.currentGame.teamName === current.name ? null : state.currentGame
  state = {
    ...state,
    teams,
    currentTeamId: teams[0].id,
    currentGame: nextGame,
    clock: nextGame ? state.clock : { ...DEFAULT_CLOCK },
  }
  persist()
  return { ok: true, message: t('teamDeleted', { name: current.name }) }
}

export function addPlayerToTeam(
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
): { ok: boolean; message: string } {
  const team = getCurrentTeam()
  if (!team) return { ok: false, message: t('noTeamSelected') }
  const result = createPlayer(name, jerseyNumber, position, team.players)
  if (!result.ok) return { ok: false, message: t(result.message as MessageKey) }
  updateCurrentTeam((t) => ({ ...t, players: [...t.players, result.player] }))
  persist()
  return { ok: true, message: t('playerAdded', { name: result.player.name }) }
}

export function editPlayerOnTeam(
  playerId: string,
  name: string,
  jerseyNumber: number,
  position: PlayerPosition,
): { ok: boolean; message: string } {
  const team = getCurrentTeam()
  if (!team) return { ok: false, message: t('noTeamSelected') }
  const result = updatePlayer(team.players, playerId, name, jerseyNumber, position)
  if (!result.ok) return { ok: false, message: t(result.message as MessageKey) }
  updateCurrentTeam((t) => ({ ...t, players: result.players }))
  persist()
  return { ok: true, message: t('playerUpdated', { name: name.trim().toUpperCase() }) }
}

export function deleteCompletedGames(gameIds: string[]): { ok: boolean; message: string } {
  const team = getCurrentTeam()
  if (!team) return { ok: false, message: t('noTeamSelected') }
  const ids = new Set(gameIds)
  updateCurrentTeam((current) => ({
    ...current,
    games: current.games.filter((game) => !ids.has(game.id)),
  }))
  persist()
  return { ok: true, message: t('reportsRemoved', { count: gameIds.length }) }
}

export function deletePlayers(playerIds: string[]): { ok: boolean; message: string } {
  const team = getCurrentTeam()
  if (!team) return { ok: false, message: t('noTeamSelected') }
  const ids = new Set(playerIds)
  updateCurrentTeam((t) => ({ ...t, players: t.players.filter((p) => !ids.has(p.id)) }))
  persist()
  return {
    ok: true,
    message: t('playersRemoved', { count: playerIds.length }),
  }
}

export function startPreparedGame(
  input: NewGameInput,
  saveDefault = false,
): { ok: boolean; message: string } {
  const team = getCurrentTeam()
  if (!team) return { ok: false, message: t('noTeamSelected') }
  if (hasInProgressGame()) discardCurrentGame()
  const game = createGame(team, input)
  if (saveDefault) {
    saveDefaultFormation(input.matchType, input.formation, input.unavailablePlayers)
  }
  state = {
    ...state,
    currentGame: game,
    clock: {
      elapsedSeconds: 0,
      running: false,
      runningStartedAt: null,
      subDuration: game.substitutionSeconds,
      subRemaining: game.substitutionSeconds,
      subRunning: false,
      useSubstitutionTimer: game.useSubstitutionTimer,
    },
  }
  persist()
  return { ok: true, message: t('gameStarted') }
}

export function saveDefaultFormation(
  matchType: MatchType,
  formation: FormationSpot[],
  unavailablePlayers: string[] = [],
): void {
  updateCurrentTeam((t) => ({
    ...t,
    defaultFormations: { ...t.defaultFormations, [matchType]: formation },
    defaultUnavailable: { ...t.defaultUnavailable, [matchType]: unavailablePlayers },
  }))
  persist()
}

export function recordLiveAction(
  actionType: ActionType,
  playerId: string | null,
  noteText?: string,
): { ok: boolean; message?: string; convertedToRed?: boolean } {
  if (!state.currentGame) return { ok: false, message: t('noGame') }
  const action = createAction(actionType, playerId, wallElapsed(state.clock), {
    noteText,
  })
  const beforeYellows =
    playerId && actionType === 'yellow_card'
      ? state.currentGame.actions.filter((a) => a.playerId === playerId && a.actionType === 'yellow_card')
          .length
      : 0
  const game = applyAction(state.currentGame, action)
  state = {
    ...state,
    currentGame: { ...game, elapsedSeconds: wallElapsed(state.clock) },
  }
  persist()
  return {
    ok: true,
    convertedToRed: actionType === 'yellow_card' && beforeYellows + 1 >= YELLOWS_FOR_RED,
  }
}

export function undoLiveAction(actionId: string): { ok: boolean } {
  if (!state.currentGame) return { ok: false }
  state = { ...state, currentGame: revertAction(state.currentGame, actionId) }
  persist()
  return { ok: true }
}

export function substituteLivePlayers(
  offId: string,
  onId: string,
): { ok: boolean; reason?: string } {
  if (!state.currentGame) return { ok: false, reason: 'no_game' }
  const elapsed = wallElapsed(state.clock)
  const result = applySubstitution(state.currentGame, offId, onId, elapsed)
  if (!result.ok) return { ok: false, reason: result.reason }
  const clock = commitWallClock(state.clock)
  state = {
    ...state,
    currentGame: { ...result.game, elapsedSeconds: elapsed },
    clock: {
      ...clock,
      subRemaining: clock.subDuration,
      subRunning: clock.running && clock.useSubstitutionTimer,
    },
  }
  persist()
  return { ok: true }
}

export function startExtraTime(): { ok: boolean; message: string } {
  const game = state.currentGame
  if (!game) return { ok: false, message: t('noGame') }
  if (game.substitutionRegulation !== 'official') {
    return { ok: false, message: t('noGame') }
  }
  if (game.extraTime) return { ok: false, message: t('extraTimeAlready') }
  const next = unlockExtraTime(game)
  state = { ...state, currentGame: next }
  persist()
  return { ok: true, message: t('extraTimeStarted') }
}

export function liveElapsedSeconds(): number {
  return wallElapsed(state.clock)
}

export function liveSubRemaining(): number {
  return wallSubRemaining(state.clock)
}

export function persistClock(): void {
  const clock = commitWallClock(state.clock)
  state = {
    ...state,
    clock,
    currentGame: state.currentGame
      ? { ...state.currentGame, elapsedSeconds: clock.elapsedSeconds }
      : null,
  }
  persist()
}

export function playClock(): void {
  const now = Date.now()
  state = {
    ...state,
    clock: {
      ...state.clock,
      running: true,
      runningStartedAt: now,
      subRunning: state.clock.useSubstitutionTimer && state.clock.subRemaining > 0,
    },
  }
  persist()
}

export function pauseClock(): void {
  const clock = commitWallClock(state.clock)
  state = {
    ...state,
    clock: { ...clock, running: false, subRunning: false, runningStartedAt: null },
  }
  persist()
}

export function resetSubTimer(): void {
  const clock = commitWallClock(state.clock)
  state = {
    ...state,
    clock: {
      ...clock,
      subRemaining: clock.subDuration,
      subRunning: clock.running && clock.useSubstitutionTimer,
    },
  }
  persist()
}

export function finishCurrentPeriod(): { ok: boolean; message: string; ended?: boolean } {
  const game = state.currentGame
  if (!game) return { ok: false, message: t('noGame') }
  const live = wallElapsed(state.clock)
  const nextElapsed = finishPeriodElapsed(live, game.periodDuration, game.numPeriods)
  if (nextElapsed === live) {
    return endCurrentGame()
  }
  const withScore = capturePeriodScore({ ...game, elapsedSeconds: nextElapsed })
  state = {
    ...state,
    currentGame: withScore,
    clock: {
      ...state.clock,
      elapsedSeconds: nextElapsed,
      running: false,
      runningStartedAt: null,
      subRunning: false,
      subRemaining: state.clock.subDuration,
    },
  }
  persist()
  return { ok: true, message: t('periodFinished') }
}

export function discardCurrentGame(): void {
  if (!state.currentGame) return
  state = {
    ...state,
    currentGame: null,
    clock: { ...DEFAULT_CLOCK },
  }
  persist()
}

export function endCurrentGame(): { ok: boolean; message: string; ended: boolean; gameId?: string } {
  const game = state.currentGame
  if (!game) return { ok: false, message: t('noGame'), ended: false }
  const finished = completeGame(capturePeriodScore(game), wallElapsed(state.clock))
  if (isParentGame(finished)) {
    const parent = getParentProfile()
    state = {
      ...state,
      parent: { ...parent, games: [...parent.games, finished] },
      currentGame: null,
      clock: { ...DEFAULT_CLOCK },
    }
  } else {
    updateCurrentTeam((t) => ({ ...t, games: [...t.games, finished] }))
    state = {
      ...state,
      currentGame: null,
      clock: { ...DEFAULT_CLOCK },
    }
  }
  persist()
  return { ok: true, message: t('gameEnded'), ended: true, gameId: finished.id }
}

export function exportBackupJson(): string {
  persistClock()
  return JSON.stringify(
    {
      ...state,
      appVersion: APP_VERSION,
      saveVersion: SAVE_VERSION,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  )
}

/** @deprecated team-only export kept for older callers; prefer exportBackupJson */
export function exportCurrentTeamJson(): string {
  return exportBackupJson()
}

export function importBackup(
  imported: AppSave,
  kind: 'full' | 'team',
): { ok: boolean; message: string } {
  if (kind === 'full') {
    state = {
      ...imported,
      appVersion: APP_VERSION,
      saveVersion: SAVE_VERSION,
      updatedAt: new Date().toISOString(),
    }
    setLocale(state.language)
    applyTheme(state.theme ?? 'dark')
    persist()
    return { ok: true, message: t('importOk') }
  }
  const source = imported.teams[0]
  if (!source) return { ok: false, message: t('invalidImport') }
  updateCurrentTeam((t) => ({
    ...t,
    name: source.name || t.name,
    players: source.players,
    games: source.games,
    settings: source.settings,
    defaultFormations: source.defaultFormations,
    defaultUnavailable: source.defaultUnavailable,
  }))
  persist()
  return { ok: true, message: t('importOk') }
}

export function importIntoCurrentTeam(imported: AppSave): { ok: boolean; message: string } {
  return importBackup(imported, 'team')
}

function trimPeriodScores(game: Game, elapsedSeconds: number): Game {
  const period = currentPeriod(elapsedSeconds, game.periodDuration, game.numPeriods)
  return {
    ...game,
    elapsedSeconds,
    periodScores: game.periodScores.slice(0, Math.max(0, period - 1)),
  }
}

export function setLiveElapsed(seconds: number): { ok: boolean; message: string } {
  const game = state.currentGame
  if (!game) return { ok: false, message: t('noGame') }
  const safe = Math.max(0, Math.floor(seconds))
  const clock = commitWallClock(state.clock)
  const next = trimPeriodScores(game, safe)
  state = {
    ...state,
    currentGame: next,
    clock: {
      ...clock,
      elapsedSeconds: safe,
      runningStartedAt: clock.running ? Date.now() : null,
    },
  }
  persist()
  return { ok: true, message: t('timeUpdated') }
}

export function setCompletedGameElapsed(
  gameId: string,
  seconds: number,
): { ok: boolean; message: string } {
  const found = findCompletedGame(gameId)
  if (!found) return { ok: false, message: t('reportMissing') }
  const safe = Math.max(0, Math.floor(seconds))
  const next = trimPeriodScores(found.game, safe)
  if (isParentGame(found.game)) {
    const parent = getParentProfile()
    state = {
      ...state,
      parent: {
        ...parent,
        games: parent.games.map((g) => (g.id === gameId ? next : g)),
      },
    }
  } else {
    updateCurrentTeam((current) => ({
      ...current,
      games: current.games.map((g) => (g.id === gameId ? next : g)),
    }))
  }
  persist()
  return { ok: true, message: t('timeUpdated') }
}

export function resetAllData(): void {
  const language = state.language
  const theme = state.theme
  clearSaves()
  const next = freshSave()
  setLocale(language)
  applyTheme(theme)
  state = { ...next, currentTeamId: DEMO_TEAM_ID, language, theme }
  persist()
}

export function setDefaultSubstitution(seconds: number | null): void {
  updateCurrentTeam((t) => ({
    ...t,
    settings: { ...t.settings, defaultSubstitutionSeconds: seconds },
  }))
  persist()
}
