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
