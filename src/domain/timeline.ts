import { t } from '@/i18n'
import { gameMinute, periodOfAction } from './clock'
import { spotLabel } from './formation'
import { reconstructStartingFormation } from './playingTime'
import type { FormationSpot, Game, GameAction, Player } from './types'

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
    if (action.actionType === 'goal' || (action.actionType === 'own_goal' && !action.playerId)) {
      user[minute] ??= { shots: 0, goals: 0 }
      user[minute].goals += 1
    } else if (action.actionType === 'shot_on_goal') {
      user[minute] ??= { shots: 0, goals: 0 }
      user[minute].shots += 1
    } else if (action.actionType === 'save') {
      opponent[minute] ??= { saves: 0, goalsAllowed: 0 }
      opponent[minute].saves += 1
    } else if (action.actionType === 'goal_allowed' || (action.actionType === 'own_goal' && action.playerId)) {
      opponent[minute] ??= { saves: 0, goalsAllowed: 0 }
      opponent[minute].goalsAllowed += 1
    }
  }
  return { user, opponent }
}

export type ReportEvent = {
  second: number
  minute: number
  period: number
  type: 'goal' | 'goalAllowed' | 'ownGoal' | 'yellow' | 'red' | 'injury' | 'substitution'
  playerName: string
  assistName: string | null
  relatedName: string | null
  scoreIndex: number | null
  isOpponent: boolean
  position: string | null
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

function liveSpots(game: Game): FormationSpot[] {
  const saved = game.startingFormation.map((spot) => ({ ...spot }))
  if (saved.length) return saved
  return reconstructStartingFormation(game.formation, game.actions)
}

function takeSpot(
  spots: FormationSpot[],
  offId: string,
  onId: string,
): { spots: FormationSpot[]; position: string | undefined } {
  const offSpot = spots.find((spot) => spot.playerId === offId)
  return {
    position: offSpot?.position,
    spots: spots.map((spot) => (spot.playerId === offId ? { ...spot, playerId: onId } : spot)),
  }
}

export function substitutionLine(on: string, off: string, position?: string | null): string {
  if (position) return t('subOnForPos', { on, off, pos: position })
  return t('subOnFor', { on, off })
}

export function substitutionSpotLabel(game: Game, actionId: string): string | null {
  let spots = liveSpots(game)
  for (const action of game.actions) {
    if (action.actionType !== 'substitution' || !action.playerId || !action.relatedPlayerId) continue
    const applied = takeSpot(spots, action.relatedPlayerId, action.playerId)
    spots = applied.spots
    const rawPos = action.position || applied.position
    if (action.id === actionId) return rawPos ? spotLabel(rawPos) : null
  }
  return null
}

export function buildGoalsCardsEvents(game: Game, players: Player[]): ReportEvent[] {
  const events: ReportEvent[] = []
  let homeGoals = 0
  let awayGoals = 0
  let spots = liveSpots(game)
  game.actions.forEach((action, index) => {
    const minute = gameMinute(action.gameSecond)
    const period = periodOfAction(action, game)
    if (action.actionType === 'goal') {
      homeGoals += 1
      const assistId = assistForGoal(game.actions, index)
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'goal',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: assistId ? playerName(players, assistId) : null,
        relatedName: null,
        scoreIndex: homeGoals,
        isOpponent: false,
        position: null,
      })
    } else if (action.actionType === 'own_goal') {
      const ours = Boolean(action.playerId)
      if (ours) awayGoals += 1
      else homeGoals += 1
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'ownGoal',
        playerName: ours
          ? playerName(players, action.playerId) || t('unknownPlayer')
          : t('opponentOg'),
        assistName: null,
        relatedName: null,
        scoreIndex: ours ? awayGoals : homeGoals,
        isOpponent: ours,
        position: null,
      })
    } else if (action.actionType === 'goal_allowed') {
      awayGoals += 1
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'goalAllowed',
        playerName: t('opponent'),
        assistName: null,
        relatedName: null,
        scoreIndex: awayGoals,
        isOpponent: true,
        position: null,
      })
    } else if (action.actionType === 'yellow_card' || action.actionType === 'opp_yellow') {
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'yellow',
        playerName:
          action.actionType === 'opp_yellow'
            ? t('opponent')
            : playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        relatedName: null,
        scoreIndex: null,
        isOpponent: action.actionType === 'opp_yellow',
        position: null,
      })
    } else if (action.actionType === 'red_card' || action.actionType === 'opp_red') {
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'red',
        playerName:
          action.actionType === 'opp_red'
            ? t('opponent')
            : playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        relatedName: null,
        scoreIndex: null,
        isOpponent: action.actionType === 'opp_red',
        position: null,
      })
    } else if (action.actionType === 'injury') {
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'injury',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        relatedName: null,
        scoreIndex: null,
        isOpponent: false,
        position: null,
      })
    } else if (action.actionType === 'substitution') {
      const offId = action.relatedPlayerId ?? ''
      const onId = action.playerId ?? ''
      const applied = offId && onId ? takeSpot(spots, offId, onId) : { spots, position: undefined }
      spots = applied.spots
      const rawPos = action.position || applied.position
      events.push({
        second: action.gameSecond,
        minute,
        period,
        type: 'substitution',
        playerName: playerName(players, action.playerId) || t('unknownPlayer'),
        assistName: null,
        relatedName: playerName(players, action.relatedPlayerId ?? null) || t('unknownPlayer'),
        scoreIndex: null,
        isOpponent: false,
        position: rawPos ? spotLabel(rawPos) : null,
      })
    }
  })
  return events.sort((a, b) => a.period - b.period || a.second - b.second || a.minute - b.minute)
}
