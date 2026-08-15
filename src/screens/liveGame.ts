import { actionLabel, t } from '@/i18n'
import {
  playerIsUnavailable,
  statsFromActions,
  teamCardCounts,
} from '@/domain/actions'
import { currentPeriod, formatClock, isLastPeriod } from '@/domain/clock'
import type { ActionType, Player } from '@/domain/types'
import {
  endCurrentGame,
  finishCurrentPeriod,
  getCurrentGame,
  getCurrentTeam,
  getSave,
  liveElapsedSeconds,
  liveSubRemaining,
  pauseClock,
  playClock,
  recordLiveAction,
  resetSubTimer,
  undoLiveAction,
} from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'

let pendingPlayer: Player | null = null
let goalScorerId: string | null = null
let assisterId: string | null = null
let periodAction: 'finish' | 'end' = 'finish'

const LIVE_ACTIONS: { type: ActionType; emoji: string }[] = [
  { type: 'goal', emoji: '⚽' },
  { type: 'assist', emoji: '👟' },
  { type: 'save', emoji: '🧤' },
  { type: 'shot_on_goal', emoji: '🎯' },
  { type: 'goal_allowed', emoji: '🔴' },
  { type: 'blocked_shot', emoji: '❌' },
  { type: 'fault', emoji: '⚠️' },
  { type: 'yellow_card', emoji: '🟨' },
  { type: 'red_card', emoji: '🟥' },
  { type: 'own_goal', emoji: '⚽' },
  { type: 'injury', emoji: '🏥' },
  { type: 'late_to_game', emoji: '🕒' },
  { type: 'note', emoji: '📝' },
]

function availablePlayers(excludeId?: string | null): Player[] {
  const team = getCurrentTeam()
  const game = getCurrentGame()
  if (!team || !game) return []
  return team.players.filter((player) => {
    if (player.id === excludeId) return false
    if (game.unavailablePlayers.includes(player.id)) return false
    return !playerIsUnavailable(statsFromActions(game.actions, player.id))
  })
}

function fillPicker(containerId: string, players: Player[], onPick: (id: string) => void): void {
  const grid = document.getElementById(containerId)
  if (!grid) return
  grid.innerHTML = ''
  for (const player of players) {
    const item = document.createElement('div')
    item.className = 'player-select-item'
    item.innerHTML = `<div class="player-select-number">${player.jerseyNumber}</div><div>${escapeHtml(player.name)}</div>`
    item.addEventListener('click', () => onPick(player.id))
    grid.appendChild(item)
  }
}

export function updateClockLabels(): void {
  const game = getCurrentGame()
  if (!game) return
  const elapsed = liveElapsedSeconds()
  const subLeft = liveSubRemaining()
  const time = document.getElementById('game-time')
  if (time) time.textContent = formatClock(elapsed)
  const period = document.getElementById('period-counter')
  if (period) {
    period.textContent = t('periodOf', {
      current: currentPeriod(elapsed, game.periodDuration, game.numPeriods),
      total: game.numPeriods,
    })
  }
  const subWrap = document.getElementById('substitution-timer')
  if (subWrap) {
    const value = subWrap.querySelector('.timer-value')
    if (value) value.textContent = formatClock(subLeft)
    subWrap.classList.toggle('timer-alert', subLeft === 0)
  }
}

export function renderLiveGame(): void {
  const game = getCurrentGame()
  const team = getCurrentTeam()
  const { clock } = getSave()
  if (!game || !team) {
    showScreen('main-screen')
    return
  }
  const home = document.getElementById('home-team-name')
  const away = document.getElementById('opponent-team-name')
  if (home) home.textContent = game.teamName
  if (away) away.textContent = game.opponentName
  const homeScore = document.getElementById('home-score')
  const awayScore = document.getElementById('away-score')
  if (homeScore) homeScore.textContent = String(game.homeScore)
  if (awayScore) awayScore.textContent = String(game.awayScore)
  const elapsed = liveElapsedSeconds()
  const time = document.getElementById('game-time')
  if (time) time.textContent = formatClock(elapsed)
  const period = document.getElementById('period-counter')
  if (period) {
    period.textContent = t('periodOf', {
      current: currentPeriod(elapsed, game.periodDuration, game.numPeriods),
      total: game.numPeriods,
    })
  }
  const cards = teamCardCounts(game.actions)
  const yellow = document.getElementById('yellow-card-count')
  const red = document.getElementById('red-card-count')
  if (yellow) yellow.textContent = String(cards.yellow)
  if (red) red.textContent = String(cards.red)
  const subWrap = document.getElementById('substitution-timer')
  if (subWrap) {
    subWrap.style.display = clock.useSubstitutionTimer ? '' : 'none'
    const value = subWrap.querySelector('.timer-value')
    if (value) value.textContent = formatClock(liveSubRemaining())
    subWrap.classList.toggle('timer-alert', clock.subRemaining === 0)
  }

  const grid = document.getElementById('player-grid')
  if (!grid) return
  grid.innerHTML = ''
  const starters = new Set(game.formation.map((f) => f.playerId))
  for (const player of [...team.players].sort((a, b) => a.jerseyNumber - b.jerseyNumber)) {
    if (game.unavailablePlayers.includes(player.id)) continue
    const stats = statsFromActions(game.actions, player.id)
    const item = document.createElement('div')
    item.className = `player-grid-item ${starters.has(player.id) ? 'starter' : 'substitute'}`
    item.dataset.playerId = player.id
    if (stats.injured) item.classList.add('injured')
    else if (stats.redCards > 0) item.classList.add('red-card')
    else if (stats.yellowCards > 0) item.classList.add('yellow-card')
    if (playerIsUnavailable(stats)) {
      item.style.opacity = '0.6'
    }
    item.innerHTML = `
      <span class="live-tile-num">${player.jerseyNumber}</span>
      <span class="live-tile-name">${escapeHtml(player.name)}</span>
    `
    item.addEventListener('click', () => openActions(player))
    grid.appendChild(item)
  }
}

function openActions(player: Player): void {
  const game = getCurrentGame()
  if (!game) return
  const stats = statsFromActions(game.actions, player.id)
  if (playerIsUnavailable(stats)) {
    showMessage(t('cannotAct'), 'error')
    return
  }
  pendingPlayer = player
  const name = document.getElementById('action-player-name')
  if (name) name.textContent = player.name
  const buttons = document.getElementById('action-buttons')
  if (buttons) {
    buttons.innerHTML = LIVE_ACTIONS.map(
      (action) =>
        `<button class="action-btn" data-action="${action.type}"><span class="stat-emoji">${action.emoji}</span> ${actionLabel(action.type)}</button>`,
    ).join('')
  }
  toggleDialog('player-action-dialog', true)
}

function closeActionDialog(): void {
  toggleDialog('player-action-dialog', false)
  pendingPlayer = null
}

function commit(type: ActionType, playerId: string | null, note?: string): void {
  const result = recordLiveAction(type, playerId, note)
  if (!result.ok) {
    showMessage(result.message ?? t('noGame'), 'error')
    return
  }
  if (result.convertedToRed) {
    const player = getCurrentTeam()?.players.find((p) => p.id === playerId)
    showMessage(t('yellowSendOff', { name: player?.name ?? t('unknownPlayer') }), 'warning')
  }
  renderLiveGame()
}

export function bindLiveGame(): void {
  document.getElementById('play-clock')?.addEventListener('click', () => playClock())
  document.getElementById('pause-clock')?.addEventListener('click', () => pauseClock())
  document.getElementById('reset-sub')?.addEventListener('click', () => resetSubTimer())
  document.getElementById('end-game')?.addEventListener('click', () => {
    toggleDialog('end-game-dialog', true)
  })
  document.getElementById('cancel-end-game')?.addEventListener('click', () => {
    toggleDialog('end-game-dialog', false)
  })
  document.getElementById('confirm-end-game')?.addEventListener('click', () => {
    const result = endCurrentGame()
    toggleDialog('end-game-dialog', false)
    if (result.ok && result.gameId) {
      showScreen('reports')
      window.dispatchEvent(new CustomEvent('sca:view-report', { detail: result.gameId }))
    }
  })
  document.getElementById('stop-period')?.addEventListener('click', () => {
    const game = getCurrentGame()
    if (!game) return
    pauseClock()
    const last = isLastPeriod(liveElapsedSeconds(), game.periodDuration, game.numPeriods)
    periodAction = last ? 'end' : 'finish'
    const title = document.getElementById('period-finish-title')
    const msg = document.getElementById('period-finish-message')
    if (title) title.textContent = last ? t('endGameTitle') : t('finishPeriod')
    if (msg) {
      msg.textContent = last ? t('gameFinishedAsk') : t('periodFinishedAsk')
    }
    toggleDialog('period-finish-dialog', true)
  })
  document.getElementById('cancel-period')?.addEventListener('click', () => {
    toggleDialog('period-finish-dialog', false)
  })
  document.getElementById('confirm-period')?.addEventListener('click', () => {
    toggleDialog('period-finish-dialog', false)
    if (periodAction === 'end') {
      const result = endCurrentGame()
      if (result.ok && result.gameId) {
        showScreen('reports')
        window.dispatchEvent(new CustomEvent('sca:view-report', { detail: result.gameId }))
      }
    } else {
      const result = finishCurrentPeriod()
      showMessage(result.message, result.ok ? 'success' : 'error')
    }
  })

  document.getElementById('action-buttons')?.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
    if (!btn || !pendingPlayer) return
    const type = btn.dataset.action as ActionType
    if (type === 'goal') {
      goalScorerId = pendingPlayer.id
      closeActionDialog()
      fillPicker('assist-players-grid', availablePlayers(goalScorerId), (id) => {
        if (goalScorerId) commit('goal', goalScorerId)
        commit('assist', id)
        toggleDialog('assist-selection-dialog', false)
        goalScorerId = null
      })
      toggleDialog('assist-selection-dialog', true)
      return
    }
    if (type === 'assist') {
      assisterId = pendingPlayer.id
      closeActionDialog()
      fillPicker('scorer-players-grid', availablePlayers(assisterId), (id) => {
        if (assisterId) commit('assist', assisterId)
        commit('goal', id)
        toggleDialog('scorer-selection-dialog', false)
        assisterId = null
      })
      toggleDialog('scorer-selection-dialog', true)
      return
    }
    if (type === 'note') {
      const name = document.getElementById('note-player-name')
      if (name) name.textContent = pendingPlayer.name
      ;(document.getElementById('note-text') as HTMLTextAreaElement).value = ''
      toggleDialog('note-dialog', true)
      return
    }
    commit(type, pendingPlayer.id)
    closeActionDialog()
  })
  document.getElementById('cancel-player-action')?.addEventListener('click', closeActionDialog)
  document.getElementById('no-assist')?.addEventListener('click', () => {
    if (goalScorerId) commit('goal', goalScorerId)
    toggleDialog('assist-selection-dialog', false)
    goalScorerId = null
  })
  document.getElementById('cancel-assist')?.addEventListener('click', () => {
    toggleDialog('assist-selection-dialog', false)
    goalScorerId = null
  })
  document.getElementById('cancel-scorer')?.addEventListener('click', () => {
    toggleDialog('scorer-selection-dialog', false)
    assisterId = null
  })
  document.getElementById('cancel-note')?.addEventListener('click', () => toggleDialog('note-dialog', false))
  document.getElementById('save-note')?.addEventListener('click', () => {
    const text = (document.getElementById('note-text') as HTMLTextAreaElement).value.trim()
    if (!text || !pendingPlayer) return showMessage(t('enterNote'), 'error')
    commit('note', pendingPlayer.id, text)
    toggleDialog('note-dialog', false)
    closeActionDialog()
  })
  document.getElementById('note-text')?.addEventListener('input', (event) => {
    const counter = document.getElementById('note-char-count')
    if (counter) counter.textContent = String((event.target as HTMLTextAreaElement).value.length)
  })
  document.getElementById('open-game-note')?.addEventListener('click', () => {
    const text = window.prompt(t('gameNotePrompt'))
    if (text?.trim()) commit('game_note', null, text.trim())
  })
  document.getElementById('open-action-review')?.addEventListener('click', renderActionReview)
  document.getElementById('close-action-review')?.addEventListener('click', () => {
    toggleDialog('action-review-dialog', false)
  })
}

function renderActionReview(): void {
  const game = getCurrentGame()
  const team = getCurrentTeam()
  const list = document.getElementById('action-review-list')
  if (!game || !list) {
    showMessage(t('noActionsYet'), 'error')
    return
  }
  if (!game.actions.length) {
    showMessage(t('noActionsYet'), 'error')
    return
  }
  list.innerHTML = ''
  ;[...game.actions].reverse().forEach((action) => {
    const player = team?.players.find((p) => p.id === action.playerId)
    const row = document.createElement('div')
    row.className = 'action-review-item'
    const minute = Math.floor(action.gameSecond / 60)
    row.innerHTML = `<span class="action-review-text">${minute}' — ${escapeHtml(player?.name ?? t('gameEvent'))} : ${actionLabel(action.actionType)}</span>`
    const btn = document.createElement('button')
    btn.className = 'action-remove-btn'
    btn.textContent = '✕'
    btn.addEventListener('click', () => {
      if (!window.confirm(t('removeActionAsk'))) return
      undoLiveAction(action.id)
      renderLiveGame()
      renderActionReview()
    })
    row.appendChild(btn)
    list.appendChild(row)
  })
  toggleDialog('action-review-dialog', true)
}
