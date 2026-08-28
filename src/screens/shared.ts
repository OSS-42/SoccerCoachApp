import { canSelectTeam } from '@/domain/entitlement'
import { t } from '@/i18n'
import { getCurrentTeam, getSave, selectTeam } from '@/state/store'
import { el } from '@/ui/dom'

export function fillTeamSelectors(): void {
  const save = getSave()
  const visible = save.teams.filter((team) => canSelectTeam(save, team.id))
  if (visible.length && !visible.some((team) => team.id === save.currentTeamId)) {
    selectTeam(visible[0].id)
    return
  }
  const ids = ['main-team-selector', 'team-selector', 'reports-team-selector']
  for (const id of ids) {
    const select = document.getElementById(id) as HTMLSelectElement | null
    if (!select) continue
    select.innerHTML = ''
    for (const team of visible) {
      const opt = document.createElement('option')
      opt.value = team.id
      opt.textContent = team.name
      opt.selected = team.id === save.currentTeamId
      select.appendChild(opt)
    }
  }
  const team = getCurrentTeam()
  document.querySelectorAll('[data-team-name]').forEach((node) => {
    node.textContent = team?.name ?? t('teamName')
  })
  const nameInput = document.getElementById('team-name-input') as HTMLInputElement | null
  if (nameInput && team) nameInput.value = team.name
  const playerCount = team?.players.length ?? 0
  const completed = team?.games.filter((g) => g.isCompleted).length ?? 0
  const mainCounter = document.getElementById('player-counter')
  if (mainCounter) mainCounter.textContent = String(playerCount)
  const teamCounter = document.getElementById('team-player-counter')
  if (teamCounter) teamCounter.textContent = String(playerCount)
  const reportCounter = document.getElementById('game-report-counter')
  if (reportCounter) reportCounter.textContent = String(completed)
}

export function bindTeamSelectors(): void {
  for (const id of ['main-team-selector', 'team-selector', 'reports-team-selector']) {
    const select = document.getElementById(id)
    select?.addEventListener('change', () => {
      const value = (select as HTMLSelectElement).value
      selectTeam(value)
    })
  }
}

export function todayInputValue(): string {
  const now = new Date()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

export function requireEl(id: string): HTMLElement {
  return el(id)
}
