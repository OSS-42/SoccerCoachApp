import { PLAYER_POSITIONS, type PlayerPosition } from '@/domain/types'
import { calculateSeasonStats } from '@/domain/stats'
import { t } from '@/i18n'
import {
  getParentProfile,
  hasInProgressGame,
  hasInProgressGameFor,
  saveParentKid,
  setRole,
  startParentGame,
} from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { todayInputValue } from './shared'
import { goToRoleHome } from './roleSelect'

function fillPositionSelect(select: HTMLSelectElement, selected: string): void {
  select.innerHTML = PLAYER_POSITIONS.map(
    (pos) => `<option value="${pos}" ${pos === selected ? 'selected' : ''}>${pos}</option>`,
  ).join('')
}

function renderKidCard(): void {
  const host = document.getElementById('parent-kid-stats')
  const profile = getParentProfile()
  if (!host) return
  if (!profile.kid.name) {
    host.innerHTML = `<div class="empty-state">${t('noPlayersStats')}</div>`
    return
  }
  const rows = calculateSeasonStats([profile.kid], profile.games)
  const row = rows[0]
  if (!row) {
    host.innerHTML = `<div class="empty-state">${t('noGamesStats')}</div>`
    return
  }
  const metric = (value: number, label: string, kind = ''): string =>
    `<div class="stat-metric ${kind} ${value === 0 ? 'is-zero' : ''}">
      <span class="stat-metric-value">${value === 0 ? '–' : value}</span>
      <span class="stat-metric-label">${label}</span>
    </div>`
  host.innerHTML = `<div class="report-stat-card parent-stat-card">
    <div class="stat-card-head">
      <span class="jersey-chip">${row.jerseyNumber}</span>
      <strong>${row.name}</strong>
    </div>
    <div class="report-stat-grid">
      ${metric(row.gamesPlayed, t('games'))}
      ${metric(row.goals, t('statShortGoal'), 'stat-goal')}
      ${metric(row.assists, t('statShortAssist'))}
      ${metric(row.shots, t('statShortShot'))}
      ${metric(row.saves, t('statShortSave'))}
      ${metric(row.blocks, t('statShortBlock'))}
      ${metric(row.goalsAllowed, t('goalsAllowedShort'), 'stat-against')}
      ${metric(row.fouls, t('statShortFoul'))}
      ${metric(row.yellowCards, t('statShortYellow'), 'stat-yellow')}
      ${metric(row.redCards, t('statShortRed'), 'stat-red')}
      ${metric(row.ownGoals, t('ownGoalShort'))}
      ${metric(row.minutesPlayed, t('playedShort'))}
    </div>
  </div>`
}

export function renderParentHome(): void {
  const kid = getParentProfile().kid
  const name = document.getElementById('parent-kid-name') as HTMLInputElement | null
  const number = document.getElementById('parent-kid-number') as HTMLInputElement | null
  const position = document.getElementById('parent-kid-position') as HTMLSelectElement | null
  if (name) name.value = kid.name
  if (number) number.value = String(kid.jerseyNumber)
  if (position) fillPositionSelect(position, kid.position)
  const date = document.getElementById('parent-game-date') as HTMLInputElement | null
  if (date && !date.value) date.value = todayInputValue()
  const resume = document.getElementById('parent-resume-game') as HTMLButtonElement | null
  if (resume) resume.hidden = !hasInProgressGameFor('parent')
  renderKidCard()
}

export function bindParentHome(): void {
  document.getElementById('save-parent-kid')?.addEventListener('click', () => {
    const name = (document.getElementById('parent-kid-name') as HTMLInputElement).value
    const jersey = Number((document.getElementById('parent-kid-number') as HTMLInputElement).value)
    const position = (document.getElementById('parent-kid-position') as HTMLSelectElement)
      .value as PlayerPosition
    const result = saveParentKid(name, jersey, position)
    showMessage(result.message, result.ok ? 'success' : 'error')
    if (result.ok) renderParentHome()
  })
  document.getElementById('parent-start-game')?.addEventListener('click', async () => {
    if (hasInProgressGame()) {
      const ok = await askConfirm({
        title: t('overwriteGameTitle'),
        message: t('overwriteGameAsk'),
        confirmLabel: t('overwriteGameConfirm'),
        cancelLabel: t('cancel'),
      })
      if (!ok) return
    }
    const result = startParentGame({
      opponentName: (document.getElementById('parent-opponent') as HTMLInputElement).value,
      date: (document.getElementById('parent-game-date') as HTMLInputElement).value,
      numPeriods: Number((document.getElementById('parent-num-periods') as HTMLInputElement).value),
      periodDuration: Number(
        (document.getElementById('parent-period-duration') as HTMLInputElement).value,
      ),
      startsOnField: (document.getElementById('parent-starts-on') as HTMLInputElement).checked,
    })
    if (!result.ok) {
      showMessage(result.message, 'error')
      return
    }
    showScreen('game-tracking')
  })
  document.getElementById('parent-resume-game')?.addEventListener('click', () => {
    showScreen('game-tracking')
  })
  document.getElementById('parent-open-tips')?.addEventListener('click', () => {
    const coach = document.getElementById('tips-coach')
    const parent = document.getElementById('tips-parent')
    if (coach) coach.hidden = true
    if (parent) parent.hidden = false
    toggleDialog('tips-dialog', true)
  })
  document.getElementById('parent-switch-coach')?.addEventListener('click', () => {
    setRole('coach')
    goToRoleHome('replace')
  })
}
