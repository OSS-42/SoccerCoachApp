import { t } from '@/i18n'
import { statsFromActions } from './actions'
import { playedMinutesByPlayer, playedMinutesByPlayerPosition } from './playingTime'
import type { Game, Player } from './types'

export type SeasonRow = {
  playerId: string
  name: string
  jerseyNumber: number
  gamesPlayed: number
  missedGames: number
  lateToGame: number
  goals: number
  assists: number
  saves: number
  goalsAllowed: number
  shots: number
  blocks: number
  interceptions: number
  fouls: number
  yellowCards: number
  redCards: number
  ownGoals: number
  minutesPlayed: number
  minutesByPosition: Record<string, number>
}

export type SeasonCounts = Omit<SeasonRow, 'playerId' | 'name' | 'jerseyNumber' | 'minutesByPosition'>

export type SeasonMetricKind = '' | 'stat-goal' | 'stat-against' | 'stat-yellow' | 'stat-red'

/** The 14 metrics of a season stat card, in display order (shared by the Statistics tab and the PDF). */
export function seasonMetrics(row: SeasonCounts): { value: number; label: string; kind: SeasonMetricKind }[] {
  return [
    { value: row.gamesPlayed, label: t('games'), kind: '' },
    { value: row.goals, label: t('statShortGoal'), kind: 'stat-goal' },
    { value: row.assists, label: t('statShortAssist'), kind: '' },
    { value: row.shots, label: t('statShortShot'), kind: '' },
    { value: row.saves, label: t('statShortSave'), kind: '' },
    { value: row.blocks, label: t('statShortBlock'), kind: '' },
    { value: row.interceptions, label: t('statShortIntercept'), kind: '' },
    { value: row.goalsAllowed, label: t('goalsAllowedShort'), kind: 'stat-against' },
    { value: row.fouls, label: t('statShortFoul'), kind: '' },
    { value: row.yellowCards, label: t('statShortYellow'), kind: 'stat-yellow' },
    { value: row.redCards, label: t('statShortRed'), kind: 'stat-red' },
    { value: row.ownGoals, label: t('ownGoalShort'), kind: '' },
    { value: row.missedGames, label: t('missedGames'), kind: '' },
    { value: row.lateToGame, label: t('lateToGame'), kind: '' },
  ]
}

/**
 * Team card: action counts are summed over every player, but games and minutes are the
 * team's own (matches played in the range and their total length), not a sum per player.
 */
export function seasonTotals(
  rows: SeasonRow[],
  games: Game[],
  startDate: string | null = null,
  endDate: string | null = null,
): SeasonCounts {
  const totals: SeasonCounts = {
    gamesPlayed: 0,
    missedGames: 0,
    lateToGame: 0,
    goals: 0,
    assists: 0,
    saves: 0,
    goalsAllowed: 0,
    shots: 0,
    blocks: 0,
    interceptions: 0,
    fouls: 0,
    yellowCards: 0,
    redCards: 0,
    ownGoals: 0,
    minutesPlayed: 0,
  }
  for (const row of rows) {
    for (const key of Object.keys(totals) as (keyof SeasonCounts)[]) {
      if (key === 'gamesPlayed' || key === 'minutesPlayed') continue
      totals[key] += row[key]
    }
  }
  for (const game of games) {
    if (!game.isCompleted || !gameInDateRange(game, startDate, endDate)) continue
    totals.gamesPlayed += 1
    totals.minutesPlayed += Math.round(Math.max(0, game.elapsedSeconds) / 60)
  }
  return totals
}

export type SeasonRecord = { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number }

export function seasonRecord(games: Game[], startDate: string | null, endDate: string | null): SeasonRecord {
  const record: SeasonRecord = { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 }
  for (const game of games) {
    if (!game.isCompleted || !gameInDateRange(game, startDate, endDate)) continue
    record.played += 1
    record.goalsFor += game.homeScore
    record.goalsAgainst += game.awayScore
    if (game.homeScore > game.awayScore) record.wins += 1
    else if (game.homeScore < game.awayScore) record.losses += 1
    else record.draws += 1
  }
  return record
}

export function gameInDateRange(game: Game, startDate: string | null, endDate: string | null): boolean {
  if (!startDate && !endDate) return true
  if (!game.date) return false
  if (startDate && game.date < startDate) return false
  if (endDate && game.date > endDate) return false
  return true
}

export function calculateSeasonStats(
  players: Player[],
  games: Game[],
  startDate: string | null = null,
  endDate: string | null = null,
): SeasonRow[] {
  const completed = games.filter((g) => g.isCompleted && gameInDateRange(g, startDate, endDate))
  return players
    .map((player) => {
      const row: SeasonRow = {
        playerId: player.id,
        name: player.name,
        jerseyNumber: player.jerseyNumber,
        gamesPlayed: 0,
        missedGames: 0,
        lateToGame: 0,
        goals: 0,
        assists: 0,
        saves: 0,
        goalsAllowed: 0,
        shots: 0,
        blocks: 0,
        interceptions: 0,
        fouls: 0,
        yellowCards: 0,
        redCards: 0,
        ownGoals: 0,
        minutesPlayed: 0,
        minutesByPosition: {},
      }
      for (const game of completed) {
        const unavailable = game.unavailablePlayers.includes(player.id)
        const onField = game.formation.some((f) => f.playerId === player.id)
        const onBench = game.substitutes.includes(player.id)
        if (unavailable) row.missedGames += 1
        else if (onField || onBench) row.gamesPlayed += 1

        const minutes = playedMinutesByPlayer(game)
        row.minutesPlayed += minutes.get(player.id) ?? 0
        const byPos = playedMinutesByPlayerPosition(game).get(player.id)
        if (byPos) {
          for (const [position, amount] of byPos) {
            row.minutesByPosition[position] = (row.minutesByPosition[position] ?? 0) + amount
          }
        }
        const stats = statsFromActions(game.actions, player.id)
        row.goals += stats.goals
        row.assists += stats.assists
        row.saves += stats.saves
        row.goalsAllowed += stats.goalsAllowed
        row.shots += stats.shotOnGoal
        row.blocks += stats.blockedShot
        row.interceptions += stats.interceptions
        row.fouls += stats.faults
        row.yellowCards += stats.yellowCards
        row.redCards += stats.redCards
        row.ownGoals += stats.ownGoals
        if (stats.lateToGame) row.lateToGame += 1
      }
      return row
    })
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
}
