import { actionLabel, t } from '@/i18n'
import { askConfirm, askPrompt } from '@/ui/confirm'
import {
  ACTION_EMOJI,
  BENCH_PLAYER_ACTIONS,
  FIELD_PLAYER_ACTIONS,
  OPPONENT_ACTIONS,
  playerIsUnavailable,
  statsFromActions,
} from '@/domain/actions'
import { DOUBLE_TAP_MS, NOTE_MAX_LENGTH, VIEW_REPORT_EVENT } from '@/domain/config'
import { fieldSpotDepth, spotLabel } from '@/domain/formation'
import { playedMinutesByPlayer } from '@/domain/playingTime'
import { currentPeriod, formatClock, isLastPeriod, parseClockInput } from '@/domain/clock'
import {
  extraTimeActive,
  playerHasRed,
  substitutionCap,
  substitutionCount,
  usedOffPlayerIds,
} from '@/domain/substitutions'
import { substitutionLine, substitutionSpotLabel } from '@/domain/timeline'
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
  setLiveElapsed,
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
let actionTapTimer: number | null = null
let goalScorerId: string | null = null
let assisterId: string | null = null
let periodAction: 'finish' | 'end' = 'finish'

function opponentActionLabel(type: ActionType): string {
  if (type === 'goal_allowed') return t('oppGoal')
  if (type === 'own_goal') return t('oppOwnGoal')
  if (type === 'opp_yellow') return t('statShortYellow')
  if (type === 'opp_red') return t('statShortRed')
  return actionLabel(type)
}

function availablePlayers(excludeId?: string | null): Player[] {
  const team = getCurrentTeam()
  const game = getCurrentGame()
  if (!team || !game) return []
  const onField = new Set(game.formation.map((spot) => spot.playerId))
  return team.players.filter((player) => {
    if (player.id === excludeId) return false
    if (!onField.has(player.id)) return false
    if (game.unavailablePlayers.includes(player.id)) return false
    return !playerIsUnavailable(statsFromActions(game.actions, player.id))
  })
}

function fillPicker(containerId: string, players: Player[], onPick: (id: string) => void): void {
  const grid = document.getElementById(containerId)
  if (!grid) return
  grid.innerHTML = ''
  const gkId = getCurrentGame()?.formation.find((spot) => spot.position === 'GK')?.playerId
  const ordered = [...players].sort((a, b) => {
    const aGk = a.id === gkId ? 1 : 0
    const bGk = b.id === gkId ? 1 : 0
    if (aGk !== bGk) return aGk - bGk
    return a.jerseyNumber - b.jerseyNumber
  })
  for (const player of ordered) {
    const item = document.createElement('div')
    item.className = `player-select-item${player.id === gkId ? ' is-gk' : ''}`
    item.innerHTML = `<div class="player-select-number">${player.jerseyNumber}</div><div class="player-select-name">${escapeHtml(player.name)}</div>`
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
  const subWrap = document.getElementById('substitution-timer')
  if (subWrap) {
    const showTimer = clock.useSubstitutionTimer || game.useSubstitutionTimer
    subWrap.hidden = !showTimer
    subWrap.style.display = showTimer ? '' : 'none'
  }
  updateClockLabels()

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
  const onField = new Map(game.formation.map((f) => [f.playerId, f.position]))
  const gkId = game.formation.find((spot) => spot.position === 'GK')?.playerId
  const usedOff = usedOffPlayerIds(game)
  const minutes = playedMinutesByPlayer({ ...game, elapsedSeconds: liveElapsedSeconds() })
  const roster = [...team.players].filter((player) => !game.unavailablePlayers.includes(player.id))
  const fieldPlayers = roster
    .filter((player) => onField.has(player.id))
    .sort((a, b) => {
      const depth = fieldSpotDepth(onField.get(a.id)) - fieldSpotDepth(onField.get(b.id))
      if (depth !== 0) return depth
      return a.jerseyNumber - b.jerseyNumber
    })
  const benchPlayers = roster
    .filter((player) => !onField.has(player.id))
    .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
  for (const player of fieldPlayers) {
    fieldGrid.appendChild(
      liveTile(
        player,
        'field',
        usedOff.has(player.id),
        player.id === gkId,
        onField.get(player.id),
        minutes.get(player.id) ?? 0,
      ),
    )
  }
  for (const player of benchPlayers) {
    benchGrid.appendChild(
      liveTile(player, 'bench', usedOff.has(player.id), false, undefined, minutes.get(player.id) ?? 0),
    )
  }
}

function liveTile(
  player: Player,
  role: 'field' | 'bench',
  usedOff: boolean,
  isGk = false,
  fieldPosition?: string,
  playedMinutes = 0,
): HTMLElement {
  const game = getCurrentGame()
  const item = document.createElement('div')
  const stats = game ? statsFromActions(game.actions, player.id) : null
  item.className = `player-grid-item ${role === 'field' ? 'starter' : 'substitute'}`
  item.dataset.playerId = player.id
  item.dataset.role = role
  if (isGk) item.classList.add('is-gk')
  if (stats?.injured) item.classList.add('injured')
  else if (stats && stats.redCards > 0) item.classList.add('red-card')
  else if (stats && stats.yellowCards > 0) item.classList.add('yellow-card')
  if (usedOff) item.classList.add('used-off')
  if (pendingSubId === player.id) item.classList.add('sub-selected')
  const canComeOn = !usedOff && !(stats && playerIsUnavailable(stats))
  const canGoOff = !(stats && stats.redCards > 0)
  if (pendingRole === 'field' && role === 'bench' && canComeOn) item.classList.add('sub-target')
  if (pendingRole === 'bench' && role === 'field' && canGoOff) item.classList.add('sub-target')
  const pos = role === 'field' && fieldPosition ? spotLabel(fieldPosition) : ''
  item.innerHTML = `
    <span class="live-tile-name">${escapeHtml(player.name)}</span>
    <span class="live-tile-num">${player.jerseyNumber}</span>
    ${pos ? `<span class="live-tile-pos">${escapeHtml(pos)}</span>` : ''}
    ${usedOff ? `<span class="live-tile-used">${escapeHtml(t('usedOff'))}</span>` : ''}
    <span class="live-tile-mins">${playedMinutes}'</span>
  `
  item.addEventListener('click', () => onTileClick(player, role))
  return item
}

function onTileClick(player: Player, role: 'field' | 'bench'): void {
  const now = Date.now()
  if (actionTapTimer != null) {
    window.clearTimeout(actionTapTimer)
    actionTapTimer = null
  }
  if (lastTapId === player.id && now - lastTapAt <= DOUBLE_TAP_MS) {
    lastTapId = null
    lastTapAt = 0
    handleLiveTile(player, role)
    return
  }
  lastTapId = player.id
  lastTapAt = now
  actionTapTimer = window.setTimeout(() => {
    actionTapTimer = null
    lastTapId = null
    openActions(player, role)
  }, DOUBLE_TAP_MS)
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
  const actions = role === 'bench' ? BENCH_PLAYER_ACTIONS : FIELD_PLAYER_ACTIONS
  const buttons = document.getElementById('action-buttons')
  if (buttons) {
    buttons.innerHTML = actions
      .map(
        (type) =>
          `<button class="action-btn" data-action="${type}"><span class="stat-emoji">${ACTION_EMOJI[type]}</span> ${actionLabel(type)}</button>`,
      )
      .join('')
  }
  toggleDialog('player-action-dialog', true)
}

function closeActionDialog(): void {
  toggleDialog('player-action-dialog', false)
  pendingPlayer = null
}

function currentGkId(): string | null {
  return getCurrentGame()?.formation.find((spot) => spot.position === 'GK')?.playerId ?? null
}

function openOpponentActions(): void {
  const buttons = document.getElementById('opponent-action-buttons')
  if (!buttons) return
  buttons.innerHTML = OPPONENT_ACTIONS.map(
    (type) =>
      `<button class="action-btn" data-opp-action="${type}"><span class="stat-emoji">${ACTION_EMOJI[type]}</span> ${escapeHtml(opponentActionLabel(type))}</button>`,
  ).join('')
  toggleDialog('opponent-action-dialog', true)
}

function commitOpponent(type: ActionType): void {
  const playerId = type === 'goal_allowed' ? currentGkId() : null
  commit(type, playerId)
  toggleDialog('opponent-action-dialog', false)
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

function finishMatchToReport(): void {
  const result = endCurrentGame()
  if (result.ok && result.gameId) {
    showScreen('reports')
    window.dispatchEvent(new CustomEvent(VIEW_REPORT_EVENT, { detail: result.gameId }))
  }
}

export function bindLiveGame(): void {
  document.getElementById('game-time')?.addEventListener('click', async () => {
    if (!getCurrentGame()) return
    const raw = await askPrompt({
      title: t('editTimeTitle'),
      message: t('editTimeAsk'),
      value: formatClock(liveElapsedSeconds()),
      confirmLabel: t('save'),
      cancelLabel: t('cancel'),
    })
    if (raw == null) return
    const seconds = parseClockInput(raw)
    if (seconds == null) {
      showMessage(t('invalidTime'), 'error')
      return
    }
    const result = setLiveElapsed(seconds)
    showMessage(result.message, result.ok ? 'success' : 'error')
    renderLiveGame()
  })
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
    toggleDialog('end-game-dialog', false)
    finishMatchToReport()
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
      finishMatchToReport()
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
  const noteText = document.getElementById('note-text') as HTMLTextAreaElement | null
  if (noteText) noteText.maxLength = NOTE_MAX_LENGTH
  const noteLimit = document.querySelector('#note-dialog .char-count')
  if (noteLimit) {
    noteLimit.innerHTML = `<span id="note-char-count">0</span>/${NOTE_MAX_LENGTH}`
  }
  noteText?.addEventListener('input', (event) => {
    const counter = document.getElementById('note-char-count')
    if (counter) counter.textContent = String((event.target as HTMLTextAreaElement).value.length)
  })
  document.getElementById('open-opponent-action')?.addEventListener('click', openOpponentActions)
  document.getElementById('cancel-opponent-action')?.addEventListener('click', () => {
    toggleDialog('opponent-action-dialog', false)
  })
  document.getElementById('opponent-action-buttons')?.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-opp-action]')
    if (!btn?.dataset.oppAction) return
    commitOpponent(btn.dataset.oppAction as ActionType)
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

function actionReviewText(
  action: {
    id: string
    actionType: string
    gameSecond: number
    playerId: string | null
    relatedPlayerId?: string
    noteText?: string
  },
  team: ReturnType<typeof getCurrentTeam>,
): string {
  const minute = Math.floor(action.gameSecond / 60)
  const player = team?.players.find((p) => p.id === action.playerId)
  const off = team?.players.find((p) => p.id === action.relatedPlayerId)
  if (action.actionType === 'substitution') {
    const game = getCurrentGame()
    const pos = game ? substitutionSpotLabel(game, action.id) : null
    return `${minute}' — ${substitutionLine(
      player?.name ?? t('unknownPlayer'),
      off?.name ?? t('unknownPlayer'),
      pos,
    )}`
  }
  if (action.actionType === 'goal_allowed' && !action.playerId) {
    return `${minute}' — ${t('opponent')} : ${actionLabel('goal_allowed')}`
  }
  if (action.actionType === 'own_goal' && !action.playerId) {
    return `${minute}' — ${t('opponentOg')}`
  }
  if (action.actionType === 'opp_yellow' || action.actionType === 'opp_red') {
    return `${minute}' — ${t('opponent')} : ${actionLabel(action.actionType)}`
  }
  if (action.actionType === 'game_note' || action.actionType === 'note') {
    const who = action.actionType === 'game_note' ? t('gameNote') : (player?.name ?? t('gameEvent'))
    const note = action.noteText ? ` — ${action.noteText}` : ''
    return `${minute}' — ${who}${note}`
  }
  return `${minute}' — ${player?.name ?? t('gameEvent')} : ${actionLabel(action.actionType)}`
}

function paintActionReviewList(): boolean {
  const game = getCurrentGame()
  const team = getCurrentTeam()
  const list = document.getElementById('action-review-list')
  if (!list) return false
  list.replaceChildren()
  if (!game?.actions.length) return false
  for (const action of [...game.actions].reverse()) {
    const row = document.createElement('div')
    row.className = 'action-review-item'
    row.innerHTML = `<span class="action-review-text">${escapeHtml(actionReviewText(action, team))}</span>`
    const btn = document.createElement('button')
    btn.className = 'action-remove-btn'
    btn.type = 'button'
    btn.textContent = '✕'
    btn.addEventListener('click', () => void removeReviewedAction(action.id))
    row.appendChild(btn)
    list.appendChild(row)
  }
  return true
}

async function removeReviewedAction(actionId: string): Promise<void> {
  const ok = await askConfirm({
    title: t('removeActionTitle'),
    message: t('removeActionAsk'),
    confirmLabel: t('confirmDelete'),
    cancelLabel: t('cancel'),
  })
  if (!ok) return
  undoLiveAction(actionId)
  renderLiveGame()
  if (!paintActionReviewList()) {
    toggleDialog('action-review-dialog', false)
    showMessage(t('noActionsYet'), 'error')
  }
}

function renderActionReview(): void {
  if (!paintActionReviewList()) {
    showMessage(t('noActionsYet'), 'error')
    toggleDialog('action-review-dialog', false)
    return
  }
  toggleDialog('action-review-dialog', true)
}
