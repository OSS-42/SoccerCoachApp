import { YELLOWS_FOR_RED } from './config'
import { newId } from './ids'
import { isParentGame, replayParentFormation } from './parent'
import { revertSubstitutionSwap } from './substitutions'
import { emptyLiveStats, type ActionType, type Game, type GameAction, type LiveStats } from './types'

/** Emoji used on live action buttons. Labels come from i18n (`action.*`). */
export const ACTION_EMOJI: Record<ActionType, string> = {
  goal: '⚽',
  assist: '👟',
  save: '🧤',
  goal_allowed: '⚽',
  shot_on_goal: '🎯',
  blocked_shot: '❌',
  fault: '⚠️',
  yellow_card: '🟨',
  red_card: '🟥',
  own_goal: '🔴',
  opp_yellow: '🟨',
  opp_red: '🟥',
  injury: '🏥',
  late_to_game: '🕒',
  note: '📝',
  game_note: '📝',
  substitution: '🔄',
}

export const FIELD_PLAYER_ACTIONS: ActionType[] = [
  'goal',
  'assist',
  'save',
  'shot_on_goal',
  'own_goal',
  'blocked_shot',
  'fault',
  'yellow_card',
  'red_card',
  'injury',
  'late_to_game',
  'note',
]

export const BENCH_PLAYER_ACTIONS: ActionType[] = ['yellow_card', 'red_card']

export const OPPONENT_ACTIONS: ActionType[] = ['goal_allowed', 'own_goal', 'opp_yellow', 'opp_red']

export function createAction(
  actionType: ActionType,
  playerId: string | null,
  gameSecond: number,
  extra: { noteText?: string; relatedPlayerId?: string } = {},
): GameAction {
  return {
    id: newId('act'),
    actionType,
    playerId,
    gameSecond,
    timestamp: new Date().toISOString(),
    ...extra,
  }
}

export function statsFromActions(actions: GameAction[], playerId: string): LiveStats {
  const stats = emptyLiveStats()
  for (const action of actions) {
    if (action.playerId !== playerId) continue
    switch (action.actionType) {
      case 'goal':
        stats.goals += 1
        break
      case 'assist':
        stats.assists += 1
        break
      case 'save':
        stats.saves += 1
        break
      case 'goal_allowed':
        stats.goalsAllowed += 1
        break
      case 'shot_on_goal':
        stats.shotOnGoal += 1
        break
      case 'blocked_shot':
        stats.blockedShot += 1
        break
      case 'fault':
        stats.faults += 1
        break
      case 'yellow_card':
        stats.yellowCards += 1
        break
      case 'red_card':
        stats.redCards += 1
        break
      case 'own_goal':
        stats.ownGoals += 1
        break
      case 'injury':
        stats.injured = true
        break
      case 'late_to_game':
        stats.lateToGame = true
        break
      default:
        break
    }
  }
  if (stats.yellowCards >= YELLOWS_FOR_RED && stats.redCards === 0) {
    stats.redCards = 1
  }
  return stats
}

export function scoreFromActions(actions: GameAction[]): { home: number; away: number } {
  let home = 0
  let away = 0
  for (const action of actions) {
    if (action.actionType === 'goal') home += 1
    else if (action.actionType === 'goal_allowed') away += 1
    else if (action.actionType === 'own_goal') {
      if (action.playerId) away += 1
      else home += 1
    }
  }
  return { home, away }
}

export function teamCardCounts(actions: GameAction[]): { yellow: number; red: number } {
  let yellow = 0
  let red = 0
  const yellowsByPlayer = new Map<string, number>()
  const directRed = new Set<string>()
  for (const action of actions) {
    if (action.actionType === 'yellow_card') {
      yellow += 1
      if (action.playerId) {
        yellowsByPlayer.set(action.playerId, (yellowsByPlayer.get(action.playerId) ?? 0) + 1)
      }
    }
    if (action.actionType === 'red_card') {
      red += 1
      if (action.playerId) directRed.add(action.playerId)
    }
  }
  for (const [playerId, count] of yellowsByPlayer) {
    if (count >= YELLOWS_FOR_RED && !directRed.has(playerId)) red += 1
  }
  return { yellow, red }
}

export function playerIsUnavailable(stats: LiveStats): boolean {
  return stats.redCards > 0 || stats.injured
}

export function applyAction(game: Game, action: GameAction): Game {
  const actions = [...game.actions, action]
  const score = scoreFromActions(actions)
  return {
    ...game,
    actions,
    homeScore: score.home,
    awayScore: score.away,
  }
}

export function revertAction(game: Game, actionId: string): Game {
  const removed = game.actions.find((a) => a.id === actionId)
  const actions = game.actions.filter((a) => a.id !== actionId)
  const score = scoreFromActions(actions)
  const next: Game = {
    ...game,
    actions,
    homeScore: score.home,
    awayScore: score.away,
  }
  if (removed?.actionType === 'substitution') {
    if (isParentGame(next) && removed.playerId) return replayParentFormation(next, removed.playerId)
    return revertSubstitutionSwap(next, removed)
  }
  return next
}
