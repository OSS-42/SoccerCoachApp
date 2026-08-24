import { t } from '@/i18n'
import { getCurrentGame, hasInProgressGame, hasInProgressGameFor, setRole } from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { fillTeamSelectors } from './shared'
import { goToRoleHome } from './roleSelect'

export function renderMainMenu(): void {
  fillTeamSelectors()
  const resume = document.getElementById('resume-game-btn') as HTMLButtonElement | null
  const inProgress = hasInProgressGameFor('coach')
  if (resume) resume.hidden = !inProgress
}

export function bindMainMenu(): void {
  document.getElementById('resume-game-btn')?.addEventListener('click', () => {
    if (!getCurrentGame()) {
      showMessage(t('noGame'), 'error')
      return
    }
    showScreen('game-tracking')
  })
  document.getElementById('start-new-game-btn')?.addEventListener('click', async () => {
    if (hasInProgressGame()) {
      const ok = await askConfirm({
        title: t('overwriteGameTitle'),
        message: t('overwriteGameAsk'),
        confirmLabel: t('overwriteGameConfirm'),
        cancelLabel: t('cancel'),
      })
      if (!ok) return
    }
    showScreen('game-setup')
  })
  document.getElementById('open-tips')?.addEventListener('click', () => {
    const coach = document.getElementById('tips-coach')
    const parent = document.getElementById('tips-parent')
    if (coach) coach.hidden = false
    if (parent) parent.hidden = true
    toggleDialog('tips-dialog', true)
  })
  document.getElementById('coach-switch-parent')?.addEventListener('click', () => {
    setRole('parent')
    goToRoleHome('replace')
  })
  document.getElementById('close-tips')?.addEventListener('click', () => {
    toggleDialog('tips-dialog', false)
  })
}
