import { applyAction, createAction, revertAction } from '@/domain/actions'
import { commitWallClock, finishPeriodElapsed, wallElapsed, wallSubRemaining } from '@/domain/clock'
import { createGame, completeGame, capturePeriodScore } from '@/domain/game'
import { applySubstitution, beginExtraTime as unlockExtraTime } from '@/domain/substitutions'
import type { NewGameInput } from '@/domain/game'
import { freshSave } from '@/domain/migrate'
import {
  canAddTeam,
  createPlayer,
  createTeam,
  findTeam,
  updatePlayer,
} from '@/domain/teams'
import {
  APP_VERSION,
  DEFAULT_CLOCK,
  DEMO_TEAM_ID,
  SAVE_VERSION,
  type ActionType,
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

export function selectTeam(teamId: string): void {
  if (!state.teams.some((t) => t.id === teamId)) return
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
      message: t('maxTeams', { max: 2 }),
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
    updateCurrentTeam((t) => ({
      ...t,
      defaultFormations: { ...t.defaultFormations, [input.matchType]: input.formation },
    }))
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

export function saveDefaultFormation(matchType: MatchType, formation: FormationSpot[]): void {
  updateCurrentTeam((t) => ({
    ...t,
    defaultFormations: { ...t.defaultFormations, [matchType]: formation },
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
    convertedToRed: actionType === 'yellow_card' && beforeYellows + 1 >= 2,
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
  updateCurrentTeam((t) => ({ ...t, games: [...t.games, finished] }))
  state = {
    ...state,
    currentGame: null,
    clock: { ...DEFAULT_CLOCK },
  }
  persist()
  return { ok: true, message: t('gameEnded'), ended: true, gameId: finished.id }
}

export function exportCurrentTeamJson(): string {
  const team = getCurrentTeam()
  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      appVersion: APP_VERSION,
      teamName: team?.name ?? 'TEAM',
      players: team?.players ?? [],
      games: team?.games ?? [],
      settings: team?.settings ?? {},
      defaultFormations: team?.defaultFormations ?? {},
    },
    null,
    2,
  )
}

export function importIntoCurrentTeam(imported: AppSave): { ok: boolean; message: string } {
  const source = imported.teams[0]
  if (!source) return { ok: false, message: t('invalidImport') }
  updateCurrentTeam((t) => ({
    ...t,
    name: source.name || t.name,
    players: source.players,
    games: source.games,
    settings: source.settings,
    defaultFormations: source.defaultFormations,
  }))
  persist()
  return { ok: true, message: t('importOk') }
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
