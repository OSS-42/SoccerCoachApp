import { actionLabel, t } from '@/i18n'
import { askConfirm, askPrompt } from '@/ui/confirm'
import {
  playerIsUnavailable,
  statsFromActions,
  teamCardCounts,
} from '@/domain/actions'
import { currentPeriod, formatClock, isLastPeriod } from '@/domain/clock'
import {
  extraTimeActive,
  playerHasRed,
  substitutionCap,
  substitutionCount,
  usedOffPlayerIds,
} from '@/domain/substitutions'
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
  startExtraTime,
  substituteLivePlayers,
  undoLiveAction,
} from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'

let pendingPlayer: Player | null = null
let pendingSubId: string | null = null
let pendingRole: 'field' | 'bench' | null = null
let lastTapId: string | null = null
let lastTapAt = 0
let goalScorerId: string | null = null
let assisterId: string | null = null
let periodAction: 'finish' | 'end' = 'finish'

const DOUBLE_TAP_MS = 320

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

const BENCH_ACTIONS: { type: ActionType; emoji: string }[] = [
  { type: 'yellow_card', emoji: '🟨' },
  { type: 'red_card', emoji: '🟥' },
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

  paintSubCount()
  paintLiveRosters()
}

function paintSubCount(): void {
  const wrap = document.getElementById('live-sub-count')
  const value = document.getElementById('live-sub-count-value')
  const game = getCurrentGame()
  if (!wrap || !value || !game) return
  const cap = substitutionCap(game, liveElapsedSeconds())
  if (cap == null) {
    wrap.hidden = true
    return
  }
  wrap.hidden = false
  value.textContent = `${substitutionCount(game)}/${cap}`
}

function paintLiveRosters(): void {
  const fieldGrid = document.getElementById('on-field-grid')
  const benchGrid = document.getElementById('bench-grid')
  const game = getCurrentGame()
  const team = getCurrentTeam()
  if (!fieldGrid || !benchGrid || !game || !team) return
  fieldGrid.innerHTML = ''
  benchGrid.innerHTML = ''
  const onField = new Set(game.formation.map((f) => f.playerId))
  const usedOff = usedOffPlayerIds(game)
  const sorted = [...team.players].sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  for (const player of sorted) {
    if (game.unavailablePlayers.includes(player.id)) continue
    const role = onField.has(player.id) ? 'field' : 'bench'
    const tile = liveTile(player, role, usedOff.has(player.id))
    if (role === 'field') fieldGrid.appendChild(tile)
    else benchGrid.appendChild(tile)
  }
}

function liveTile(player: Player, role: 'field' | 'bench', usedOff: boolean): HTMLElement {
  const game = getCurrentGame()
  const item = document.createElement('div')
  const stats = game ? statsFromActions(game.actions, player.id) : null
  item.className = `player-grid-item ${role === 'field' ? 'starter' : 'substitute'}`
  item.dataset.playerId = player.id
  item.dataset.role = role
  if (stats?.injured) item.classList.add('injured')
  else if (stats && stats.redCards > 0) item.classList.add('red-card')
  else if (stats && stats.yellowCards > 0) item.classList.add('yellow-card')
  if (usedOff) item.classList.add('used-off')
  if (pendingSubId === player.id) item.classList.add('sub-selected')
  const canComeOn = !usedOff && !(stats && playerIsUnavailable(stats))
  const canGoOff = !(stats && stats.redCards > 0)
  if (pendingRole === 'field' && role === 'bench' && canComeOn) item.classList.add('sub-target')
  if (pendingRole === 'bench' && role === 'field' && canGoOff) item.classList.add('sub-target')
  item.innerHTML = `
    <span class="live-tile-num">${player.jerseyNumber}</span>
    <span class="live-tile-name">${escapeHtml(player.name)}</span>
    ${usedOff ? `<span class="live-tile-used">${escapeHtml(t('usedOff'))}</span>` : ''}
  `
  item.addEventListener('click', () => onTileClick(player, role))
  return item
}

function onTileClick(player: Player, role: 'field' | 'bench'): void {
  const now = Date.now()
  if (lastTapId === player.id && now - lastTapAt <= DOUBLE_TAP_MS) {
    lastTapId = null
    lastTapAt = 0
    clearPendingSub()
    paintLiveRosters()
    openActions(player, role)
    return
  }
  lastTapId = player.id
  lastTapAt = now
  handleLiveTile(player, role)
}

function clearPendingSub(): void {
  pendingSubId = null
  pendingRole = null
}

function handleLiveTile(player: Player, role: 'field' | 'bench'): void {
  const game = getCurrentGame()
  if (!game) return
  if (role === 'field' && playerHasRed(game, player.id)) {
    showMessage(t('subSentOff'), 'error')
    return
  }
  if (role === 'bench' && usedOffPlayerIds(game).has(player.id) && pendingRole !== 'field') {
    return
  }

  if (pendingSubId && pendingRole && pendingRole !== role) {
    const fromId = pendingSubId
    const fromRole = pendingRole
    const offId = fromRole === 'field' ? fromId : player.id
    const onId = fromRole === 'bench' ? fromId : player.id
    const team = getCurrentTeam()
    const offJersey = team?.players.find((p) => p.id === offId)?.jerseyNumber ?? ''
    const onJersey = team?.players.find((p) => p.id === onId)?.jerseyNumber ?? ''
    clearPendingSub()
    const result = substituteLivePlayers(offId, onId)
    if (!result.ok) {
      pendingSubId = fromId
      pendingRole = fromRole
      showMessage(subFailMessage(result.reason), 'error')
      paintLiveRosters()
      return
    }
    renderLiveGame()
    showMessage(t('subDone', { off: offJersey, on: onJersey }), 'success')
    return
  }

  if (pendingSubId === player.id) {
    clearPendingSub()
    paintLiveRosters()
    return
  }

  pendingSubId = player.id
  pendingRole = role
  paintLiveRosters()
}

function subFailMessage(reason?: string): string {
  const game = getCurrentGame()
  const cap = game ? substitutionCap(game, liveElapsedSeconds()) : null
  if (reason === 'cannot_return') return t('subCannotReturn')
  if (reason === 'cap_reached') return t('subCapReached', { cap: cap ?? 0 })
  if (reason === 'sent_off') return t('subSentOff')
  if (reason === 'unavailable_on') return t('subUnavailableOn')
  if (reason === 'not_on_field' || reason === 'not_on_bench' || reason === 'same_player') {
    return t('subNeedFieldThenBench')
  }
  return t('noGame')
}

function openActions(player: Player, role: 'field' | 'bench' = 'field'): void {
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
  const actions = role === 'bench' ? BENCH_ACTIONS : LIVE_ACTIONS
  const buttons = document.getElementById('action-buttons')
  if (buttons) {
    buttons.innerHTML = actions
      .map(
        (action) =>
          `<button class="action-btn" data-action="${action.type}"><span class="stat-emoji">${action.emoji}</span> ${actionLabel(action.type)}</button>`,
      )
      .join('')
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
    const extraBtn = document.getElementById('extra-time-period')
    const offerExtra =
      last &&
      game.substitutionRegulation === 'official' &&
      !extraTimeActive(game, liveElapsedSeconds())
    if (title) title.textContent = last ? t('endGameTitle') : t('finishPeriod')
    if (msg) {
      msg.textContent = last ? t('gameFinishedAsk') : t('periodFinishedAsk')
    }
    if (extraBtn) extraBtn.hidden = !offerExtra
    toggleDialog('period-finish-dialog', true)
  })
  document.getElementById('extra-time-period')?.addEventListener('click', () => {
    toggleDialog('period-finish-dialog', false)
    const started = startExtraTime()
    if (!started.ok) {
      showMessage(started.message, 'error')
      return
    }
    const finished = finishCurrentPeriod()
    showMessage(started.message, finished.ok ? 'success' : 'error')
    renderLiveGame()
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
  document.getElementById('open-game-note')?.addEventListener('click', async () => {
    const text = await askPrompt({
      title: t('gameNoteTitle'),
      message: t('gameNotePrompt'),
      confirmLabel: t('save'),
      cancelLabel: t('cancel'),
      multiline: true,
    })
    if (text) commit('game_note', null, text)
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
    const off = team?.players.find((p) => p.id === action.relatedPlayerId)
    const text =
      action.actionType === 'substitution'
        ? `${minute}' — ${t('subOnFor', {
            on: player?.name ?? t('unknownPlayer'),
            off: off?.name ?? t('unknownPlayer'),
          })}`
        : `${minute}' — ${player?.name ?? t('gameEvent')} : ${actionLabel(action.actionType)}`
    row.innerHTML = `<span class="action-review-text">${escapeHtml(text)}</span>`
    const btn = document.createElement('button')
    btn.className = 'action-remove-btn'
    btn.textContent = '✕'
    btn.addEventListener('click', async () => {
      const ok = await askConfirm({
        title: t('removeActionTitle'),
        message: t('removeActionAsk'),
        confirmLabel: t('confirmDelete'),
        cancelLabel: t('cancel'),
      })
      if (!ok) return
      undoLiveAction(action.id)
      renderLiveGame()
      renderActionReview()
    })
    row.appendChild(btn)
    list.appendChild(row)
  })
  toggleDialog('action-review-dialog', true)
}
