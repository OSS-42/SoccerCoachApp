import './styles/app.css'
import './styles/mobile.css'
import { APP_VERSION } from '@/domain/types'
import { applyDomTranslations } from '@/i18n'
import { getSave, hydrate, persistClock, subscribe } from '@/state/store'
import { hideMessage } from '@/ui/message'
import { onShow, showScreen, type ScreenId } from '@/ui/nav'
import { bindFormation, renderFormation } from '@/screens/formation'
import { bindGameSetup, renderGameSetup } from '@/screens/gameSetup'
import { bindLiveGame, renderLiveGame, updateClockLabels } from '@/screens/liveGame'
import { bindMainMenu, renderMainMenu } from '@/screens/mainMenu'
import { bindReports, renderReports } from '@/screens/reports'
import { bindSettings, renderSettings } from '@/screens/settings'
import { bindTeamSetup, renderTeamSetup } from '@/screens/teamSetup'
import { bindTeamSelectors, fillTeamSelectors } from '@/screens/shared'

function activeScreenId(): ScreenId {
  return (document.querySelector('.screen.active')?.id as ScreenId) ?? 'main-screen'
}

function renderActive(): void {
  fillTeamSelectors()
  switch (activeScreenId()) {
    case 'main-screen':
      renderMainMenu()
      break
    case 'team-setup':
      renderTeamSetup()
      break
    case 'game-setup':
      renderGameSetup()
      break
    case 'formation-setup':
      // Keep the live tap board; do not rebuild spots on store ticks.
      break
    case 'game-tracking':
      renderLiveGame()
      break
    case 'reports':
      renderReports()
      break
    case 'settings':
      renderSettings()
      break
  }
}

function bindNavigation(): void {
  document.querySelectorAll<HTMLElement>('[data-go]').forEach((node) => {
    node.addEventListener('click', () => {
      const target = node.dataset.go as ScreenId | undefined
      if (target) showScreen(target)
    })
  })
  document.getElementById('close-message')?.addEventListener('click', hideMessage)
}

function startClockLoop(): void {
  let ticks = 0
  window.setInterval(() => {
    const { clock } = getSave()
    if (!clock.running && !clock.subRunning) return
    updateClockLabels()
    ticks += 1
    if (ticks % 10 === 0) persistClock()
  }, 1000)

  const catchUp = () => {
    if (getSave().clock.running) persistClock()
    updateClockLabels()
  }
  document.addEventListener('visibilitychange', catchUp)
  window.addEventListener('pageshow', catchUp)
  window.addEventListener('focus', catchUp)
}

hydrate()
applyDomTranslations()
onShow('main-screen', renderMainMenu)
onShow('team-setup', renderTeamSetup)
onShow('game-setup', renderGameSetup)
onShow('formation-setup', renderFormation)
onShow('game-tracking', renderLiveGame)
onShow('reports', renderReports)
onShow('settings', renderSettings)

bindNavigation()
bindTeamSelectors()
bindMainMenu()
bindTeamSetup()
bindGameSetup()
bindFormation()
bindLiveGame()
bindReports()
bindSettings()
subscribe(renderActive)
startClockLoop()

const footer = document.getElementById('version-footer')
if (footer) footer.textContent = `v${APP_VERSION}`

showScreen('main-screen')
