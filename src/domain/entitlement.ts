import { DEMO_TEAM_ID, FORCE_PRO, LITE_REPORT_CAP, LITE_USER_TEAMS } from './config'
import type { AppSave, Game, Team } from './types'

export { LITE_REPORT_CAP, LITE_USER_TEAMS }

export function isPro(save: Pick<AppSave, 'entitlement'>): boolean {
  return FORCE_PRO || save.entitlement === 'pro'
}

export function isDemoTeam(team: Team | null | undefined): boolean {
  return team?.id === DEMO_TEAM_ID
}

export function userTeams(teams: Team[]): Team[] {
  return teams.filter((team) => team.id !== DEMO_TEAM_ID)
}

/** The one custom team Lite may use (Team A / first non-demo). */
export function liteHomeTeamId(teams: Team[]): string | null {
  return userTeams(teams)[0]?.id ?? null
}

export function canSelectTeam(save: AppSave, teamId: string): boolean {
  if (isPro(save)) return true
  if (teamId === DEMO_TEAM_ID) return true
  return teamId === liteHomeTeamId(save.teams)
}

export function canEditTeam(team: Team | null | undefined): boolean {
  return Boolean(team) && !isDemoTeam(team)
}

export function canAddUserTeam(save: AppSave): boolean {
  if (isPro(save)) return userTeams(save.teams).length < 2
  return userTeams(save.teams).length < LITE_USER_TEAMS
}

export function completedReports(games: Game[]): Game[] {
  return games.filter((game) => game.isCompleted)
}

export function liteReportLimitReached(games: Game[]): boolean {
  return completedReports(games).length >= LITE_REPORT_CAP
}

/** Keep the newest completed reports up to `cap`. */
export function capCompletedGames(games: Game[], cap: number): Game[] {
  const live = games.filter((game) => !game.isCompleted)
  const completed = completedReports(games)
  if (completed.length <= cap) return games
  const newestFirst = [...completed].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate) return byDate
    const aWhen = a.endTime || a.startTime || ''
    const bWhen = b.endTime || b.startTime || ''
    return bWhen.localeCompare(aWhen)
  })
  return [...live, ...newestFirst.slice(0, cap)]
}

export function applyLiteReportCap(games: Game[], save: Pick<AppSave, 'entitlement'>): Game[] {
  if (isPro(save)) return games
  return capCompletedGames(games, LITE_REPORT_CAP)
}
