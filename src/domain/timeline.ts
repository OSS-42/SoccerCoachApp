import { t } from '@/i18n'
import { gameMinute } from './clock'
import type { Game, GameAction, Player } from './types'

export function scheduledMinutes(game: Game): number {
  return Math.max(1, game.numPeriods * game.periodDuration)
}

export function buildShotTimeline(game: Game): {
  user: Record<number, { shots: number; goals: number }>
  opponent: Record<number, { saves: number; goalsAllowed: number }>
} {
  const user: Record<number, { shots: number; goals: number }> = {}
  const opponent: Record<number, { saves: number; goalsAllowed: number }> = {}
  for (const action of game.actions) {
    const minute = gameMinute(action.gameSecond)
    if (action.actionType === 'goal' || action.actionType === 'own_goal') {
      user[minute] ??= { shots: 0, goals: 0 }
      user[minute].goals += 1
    } else if (action.actionType === 'shot_on_goal') {
      user[minute] ??= { shots: 0, goals: 0 }
      user[minute].shots += 1
    } else if (action.actionType === 'save') {
      opponent[minute] ??= { saves: 0, goalsAllowed: 0 }
      opponent[minute].saves += 1
    } else if (action.actionType === 'goal_allowed') {
      opponent[minute] ??= { saves: 0, goalsAllowed: 0 }
      opponent[minute].goalsAllowed += 1
    }
  }
  return { user, opponent }
}

export type ReportEvent = {
  second: number
  minute: number
  type: 'goal' | 'goalAllowed' | 'yellow' | 'red' | 'injury'
  playerName: string
  assistName: string | null
  scoreIndex: number | null
  isOpponent: boolean
}

function playerName(players: Player[], playerId: string | null): string {
  if (!playerId) return ''
  return players.find((p) => p.id === playerId)?.name ?? ''
}

function assistForGoal(actions: GameAction[], index: number): string | null {
  const goal = actions[index]
  const next = actions[index + 1]
  if (next?.actionType === 'assist' && Math.abs(next.gameSecond - goal.gameSecond) <= 1) {
    return next.playerId
  }
  return null
}

export function buildGoalsCardsEvents(game: Game, players: Player[]): ReportEvent[] {
  const events: ReportEvent[] = []
  let homeGoals = 0
  let awayGoals = 0
  game.actions.forEach((action, index) => {
    const minute = gameMinute(action.gameSecond)
    if (action.actionType === 'goal' || action.actionType === 'own_goal') {
      homeGoals += 1
      const assistId = action.actionType === 'goal' ? assistForGoal(game.actions, index) : null
      events.push({
        second: action.gameSecond,
        minute,
        type: 'goal',
        playerName:
          action.actionType === 'own_goal'
            ? t('opponentOg')
            : playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: assistId ? playerName(players, assistId) : null,
        scoreIndex: homeGoals,
        isOpponent: false,
      })
    } else if (action.actionType === 'goal_allowed') {
      awayGoals += 1
      events.push({
        second: action.gameSecond,
        minute,
        type: 'goalAllowed',
        playerName: t('opponent'),
        assistName: null,
        scoreIndex: awayGoals,
        isOpponent: true,
      })
    } else if (action.actionType === 'yellow_card') {
      events.push({
        second: action.gameSecond,
        minute,
        type: 'yellow',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        scoreIndex: null,
        isOpponent: false,
      })
    } else if (action.actionType === 'red_card') {
      events.push({
        second: action.gameSecond,
        minute,
        type: 'red',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        scoreIndex: null,
        isOpponent: false,
      })
    } else if (action.actionType === 'injury') {
      events.push({
        second: action.gameSecond,
        minute,
        type: 'injury',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        scoreIndex: null,
        isOpponent: false,
      })
    }
  })
  return events.sort((a, b) => b.second - a.second)
}
