import './styles/app.css'
import './styles/mobile.css'
import './styles/theme.css'
import { Capacitor } from '@capacitor/core'
import { APP_VERSION, CLOCK_PERSIST_EVERY_TICKS, CLOCK_TICK_MS, EDGE_SWIPE_PX } from '@/domain/config'

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add('is-native')
}
import { applyDomTranslations } from '@/i18n'
import { getSave, hasInProgressGame, hydrate, persistClock, subscribe } from '@/state/store'
import { hideMessage } from '@/ui/message'
import { activeScreenId, bindHistoryNavigation, onShow, showScreen, type ScreenId } from '@/ui/nav'
import { bindFormation, renderFormation } from '@/screens/formation'
import { bindGameSetup, renderGameSetup } from '@/screens/gameSetup'
import { bindLiveGame, renderLiveGame, updateClockLabels } from '@/screens/liveGame'
import { bindMainMenu, renderMainMenu } from '@/screens/mainMenu'
import { bindReports, renderReports } from '@/screens/reports'
import { bindSettings, renderSettings } from '@/screens/settings'
import { bindTeamSetup, renderTeamSetup } from '@/screens/teamSetup'
import { bindIntro } from '@/screens/intro'
import { bootWithOta } from '@/screens/otaBoot'
import { bindTeamSelectors, fillTeamSelectors } from '@/screens/shared'

function blockEdgeSwipeBack(event: TouchEvent): void {
  const x = event.touches[0]?.clientX ?? 0
  if (x > EDGE_SWIPE_PX && x < window.innerWidth - EDGE_SWIPE_PX) return
  const target = event.target as Element | null
  if (target?.closest('.bench-slot, .unavailable-slot, .player-slot, button, input, select, textarea, a')) {
    return
  }
  event.preventDefault()
}

function renderActive(): void {
  fillTeamSelectors()
  switch (activeScreenId()) {
    case 'ota-screen':
    case 'intro-screen':
      break
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
    if (ticks % CLOCK_PERSIST_EVERY_TICKS === 0) persistClock()
  }, CLOCK_TICK_MS)

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

history.replaceState({ screen: 'ota-screen' }, '')
bindHistoryNavigation((from) => {
  if (from === 'game-tracking' && hasInProgressGame()) return true
  return false
})
document.addEventListener('touchstart', blockEdgeSwipeBack, { passive: false })
bindNavigation()
bindIntro()
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

void bootWithOta()
