import { FIELD_PLAYER_ACTIONS, BENCH_PLAYER_ACTIONS, ACTION_EMOJI, statsFromActions, playerIsUnavailable } from '@/domain/actions'
import { DOUBLE_TAP_MS } from '@/domain/config'
import { parentLiveTap } from '@/domain/liveTap'
import { fieldSpotDefs, spotLabel } from '@/domain/formation'
import { currentPeriod, formatClock } from '@/domain/clock'
import { kidOnField } from '@/domain/parent'
import { actionLabel, t } from '@/i18n'
import type { ActionType, Player } from '@/domain/types'
import {
  getCurrentGame,
  getParentProfile,
  isParentLive,
  liveElapsedSeconds,
  moveParentKidLive,
  recordLiveAction,
} from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { notifyTutorialEvent, tutorialLiveGate } from '@/ui/tutorialBus'

let moveArmed = false
let lastTapAt = 0
let tapTimer: number | null = null

function kid(): Player {
  return getParentProfile().kid
}

function kidLabel(): string {
  return kid().name.trim() || t('kidFallback')
}

function paintSlot(slot: HTMLElement, player: Player | null, positionLabel: string): void {
  slot.classList.toggle('occupied', Boolean(player))
  slot.classList.toggle('sub-selected', Boolean(player) && moveArmed)
  slot.classList.toggle('sub-target', !player && moveArmed)
  if (!player) {
    delete slot.dataset.playerId
    slot.innerHTML = `<span class="spot-label">${escapeHtml(positionLabel)}</span>`
    return
  }
  slot.dataset.playerId = player.id
  slot.innerHTML = `<span class="player-number player-number-placed">
    <span class="spot-pos">${escapeHtml(positionLabel)}</span>
    <span class="jersey-num">${player.jerseyNumber}</span>
    <span class="player-name-field">${escapeHtml(player.name)}</span>
  </span>`
}

function closeKidActions(): void {
  toggleDialog('player-action-dialog', false)
}

function cancelKidTapTimer(): void {
  if (tapTimer != null) {
    window.clearTimeout(tapTimer)
    tapTimer = null
  }
}

function openKidActions(role: 'field' | 'bench'): void {
  if (moveArmed) return
  const gate = tutorialLiveGate()
  if (gate === 'switch' || gate === 'opp-goal') return
  const game = getCurrentGame()
  const player = kid()
  if (!game) return
  const stats = statsFromActions(game.actions, player.id)
  if (playerIsUnavailable(stats)) {
    showMessage(t('cannotAct'), 'error')
    return
  }
  const name = document.getElementById('action-player-name')
  if (name) name.textContent = player.name
  const available = role === 'bench' ? BENCH_PLAYER_ACTIONS : FIELD_PLAYER_ACTIONS
  const actions: ActionType[] =
    gate === 'goal' ? ['goal'] : gate === 'yellow' ? ['yellow_card'] : available
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

function clearMove(): void {
  moveArmed = false
  lastTapAt = 0
  cancelKidTapTimer()
  renderParentLive()
}

function onKidTap(role: 'field' | 'bench'): void {
  cancelKidTapTimer()
  const now = Date.now()
  const decision = parentLiveTap({
    moveArmed,
    onKid: true,
    doubleTap: now - lastTapAt <= DOUBLE_TAP_MS,
  })
  if (decision.action === 'cancel') {
    closeKidActions()
    clearMove()
    return
  }
  if (decision.action === 'arm') {
    lastTapAt = 0
    moveArmed = true
    closeKidActions()
    renderParentLive()
    return
  }
  lastTapAt = now
  tapTimer = window.setTimeout(() => {
    tapTimer = null
    lastTapAt = 0
    if (moveArmed) return
    if (tutorialLiveGate() === 'switch') return
    openKidActions(role)
  }, DOUBLE_TAP_MS)
}

function onDestTap(dest: string | null): void {
  const decision = parentLiveTap({ moveArmed, onKid: false, doubleTap: false })
  if (decision.action !== 'move') return
  cancelKidTapTimer()
  closeKidActions()
  lastTapAt = 0
  const result = moveParentKidLive(dest)
  moveArmed = false
  if (!result.ok) showMessage(result.message ?? t('noGame'), 'error')
  renderParentLive()
  if (result.ok) notifyTutorialEvent('kid-moved')
}

export function renderParentLive(): void {
  const game = getCurrentGame()
  const player = kid()
  const board = document.getElementById('parent-live-board')
  const rosters = document.getElementById('live-rosters')
  const tracking = document.getElementById('game-tracking')
  if (!game || !isParentLive()) return
  tracking?.classList.add('is-parent')
  const parentHint = document.getElementById('live-hint-parent')
  if (parentHint) parentHint.textContent = t('hintLiveParent', { name: kidLabel() })
  if (rosters) rosters.hidden = true
  if (board) board.hidden = false
  document.getElementById('parent-home-plus')?.removeAttribute('hidden')
  document.getElementById('parent-away-plus')?.removeAttribute('hidden')
  const subWrap = document.getElementById('substitution-timer')
  if (subWrap) {
    subWrap.hidden = true
    subWrap.style.display = 'none'
  }
  const subCount = document.getElementById('live-sub-count')
  if (subCount) subCount.hidden = true
  document.getElementById('reset-sub')?.setAttribute('hidden', '')
  document.getElementById('open-opponent-action')?.setAttribute('hidden', '')

  const home = document.getElementById('home-team-name')
  const away = document.getElementById('opponent-team-name')
  if (home) home.textContent = t('homeTeam')
  if (away) away.textContent = game.opponentName
  const homeScore = document.getElementById('home-score')
  const awayScore = document.getElementById('away-score')
  if (homeScore) homeScore.textContent = String(game.homeScore)
  if (awayScore) awayScore.textContent = String(game.awayScore)
  const time = document.getElementById('game-time')
  if (time) time.textContent = formatClock(liveElapsedSeconds())
  const period = document.getElementById('period-counter')
  if (period) {
    period.textContent = t('periodOf', {
      current: currentPeriod(liveElapsedSeconds(), game.periodDuration, game.numPeriods),
      total: game.numPeriods,
    })
  }

  const pitch = document.getElementById('parent-pitch')
  if (pitch && !pitch.querySelector('.formation-field-surface')) {
    pitch.innerHTML = ''
    const surface = document.createElement('div')
    surface.className = 'formation-field-surface'
    for (const spot of fieldSpotDefs()) {
      const slot = document.createElement('div')
      slot.className = `player-slot${spot.position === 'GK' ? ' gk-slot' : spot.position === 'SW' ? ' sw-slot' : ''}`
      slot.dataset.position = spot.position
      slot.style.position = 'absolute'
      slot.style.left = `${spot.x}%`
      slot.style.top = `${spot.y}%`
      slot.addEventListener('click', () => {
        const live = getCurrentGame()
        if (!live) return
        const on = kidOnField(live, kid().id)
        if (on?.position === spot.position) onKidTap('field')
        else onDestTap(spot.position)
      })
      surface.appendChild(slot)
    }
    pitch.appendChild(surface)
  }

  const on = kidOnField(game, player.id)
  pitch?.querySelectorAll<HTMLElement>('.player-slot').forEach((slot) => {
    const pos = slot.dataset.position ?? ''
    const here = on?.position === pos
    paintSlot(slot, here ? player : null, spotLabel(pos))
  })

  const bench = document.getElementById('parent-bench-slot')
  if (bench) {
    bench.classList.toggle('occupied', !on)
    bench.classList.toggle('sub-selected', !on && moveArmed)
    bench.classList.toggle('sub-target', Boolean(on) && moveArmed)
    if (on) {
      delete bench.dataset.playerId
      bench.innerHTML = ''
    } else {
      bench.dataset.playerId = player.id
      bench.innerHTML = `<span class="player-number">
        <span class="player-name-bench">${escapeHtml(player.name)}</span>
        <span class="jersey-num">${player.jerseyNumber}</span>
      </span>`
    }
  }
}

export function armParentKickoffPlacement(): void {
  moveArmed = true
  lastTapAt = 0
  cancelKidTapTimer()
}

export async function promptParentKickoffPlacement(): Promise<void> {
  if (!moveArmed || !isParentLive()) return
  const name = kidLabel()
  const ok = await askConfirm({
    title: t('placeKidTitle', { name }),
    message: t('placeKidAsk', { name }),
    confirmLabel: t('placeKidNow'),
    cancelLabel: t('later'),
  })
  if (!ok) clearMove()
  else renderParentLive()
}

export function resetParentLiveUi(): void {
  moveArmed = false
  lastTapAt = 0
  cancelKidTapTimer()
  const tracking = document.getElementById('game-tracking')
  tracking?.classList.remove('is-parent')
  const board = document.getElementById('parent-live-board')
  const rosters = document.getElementById('live-rosters')
  if (board) board.hidden = true
  if (rosters) rosters.hidden = false
  document.getElementById('parent-home-plus')?.setAttribute('hidden', '')
  document.getElementById('parent-away-plus')?.setAttribute('hidden', '')
  document.getElementById('reset-sub')?.removeAttribute('hidden')
  document.getElementById('open-opponent-action')?.removeAttribute('hidden')
}

export async function parentTeamGoal(): Promise<void> {
  const assisted = await askConfirm({
    title: t('kidLastPassTitle'),
    message: t('kidLastPassAsk', { name: kidLabel() }),
    confirmLabel: t('yes'),
    cancelLabel: t('no'),
  })
  const goal = recordLiveAction('goal', null)
  if (!goal.ok) {
    showMessage(goal.message ?? t('noGame'), 'error')
    return
  }
  if (assisted) recordLiveAction('assist', kid().id)
  renderParentLive()
}

export function parentOpponentGoal(): void {
  const result = recordLiveAction('goal_allowed', null)
  if (!result.ok) {
    showMessage(result.message ?? t('noGame'), 'error')
    return
  }
  renderParentLive()
  notifyTutorialEvent('opp-goal')
}

export function bindParentLive(): void {
  document.getElementById('parent-bench-slot')?.addEventListener('click', () => {
    const game = getCurrentGame()
    if (!game) return
    if (kidOnField(game, kid().id)) onDestTap(null)
    else onKidTap('bench')
  })
  document.getElementById('parent-home-plus')?.addEventListener('click', () => {
    void parentTeamGoal()
  })
  document.getElementById('parent-away-plus')?.addEventListener('click', () => {
    parentOpponentGoal()
  })
}

