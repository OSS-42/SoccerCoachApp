import { t } from '@/i18n'
import { getCurrentGame, hasInProgressGame } from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { fillTeamSelectors } from './shared'

export function renderMainMenu(): void {
  fillTeamSelectors()
  const resume = document.getElementById('resume-game-btn') as HTMLButtonElement | null
  const inProgress = hasInProgressGame()
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
    toggleDialog('tips-dialog', true)
  })
  document.getElementById('close-tips')?.addEventListener('click', () => {
    toggleDialog('tips-dialog', false)
  })
}
