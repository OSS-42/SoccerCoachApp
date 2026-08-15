import { t } from '@/i18n'
import { getCurrentGame, hasInProgressGame } from '@/state/store'
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
  document.getElementById('start-new-game-btn')?.addEventListener('click', () => {
    if (hasInProgressGame()) {
      showMessage(t('alreadyInProgress'), 'error')
      return
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
