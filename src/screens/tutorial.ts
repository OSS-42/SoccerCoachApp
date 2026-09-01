import { APP_VERSION, DEMO_TEAM_ID } from '@/domain/config'
import { shouldShowChangelog, shouldShowTutorial, type TutorialRole } from '@/domain/tutorial'
import { t, type MessageKey } from '@/i18n'
import {
  completeTutorial,
  getCurrentTeam,
  getParentProfile,
  getRole,
  getSave,
  hasChosenRole,
  hasInProgressGame,
  markChangelogSeen,
  selectTeam,
  setRole,
} from '@/state/store'
import {
  setTutorialEventHandler,
  setTutorialLiveGate,
  setTutorialRunning,
  type TutorialEvent,
} from '@/ui/tutorialBus'
import {
  hideTutorialCard,
  layoutTutorialSpot,
  showTutorialCard,
} from '@/ui/tutorialOverlay'
import { activeScreenId, onAfterShow, showScreen, type ScreenId } from '@/ui/nav'
import { seedTutorialFormation } from './formation'
import { dismissLiveActionUi } from './liveGame'
import { armParentKickoffPlacement } from './parentLive'
import { openWhatsNew } from './whatsNew'

type LiveGate = 'goal' | 'yellow' | 'opp-goal' | 'switch' | null

type Step = {
  id: string
  screen: ScreenId
  title: MessageKey
  body: MessageKey
  target?: string | string[] | (() => HTMLElement | HTMLElement[] | null)
  allowTarget?: boolean
  wait?: TutorialEvent | 'screen'
  next?: 'start' | 'next' | 'done'
  enter?: () => void
}

let active: TutorialRole | null = null
let index = 0
let liveGate: LiveGate = null

function resolveTargets(step: Step): HTMLElement[] {
  if (!step.target) return []
  if (typeof step.target === 'function') {
    const got = step.target()
    if (!got) return []
    return (Array.isArray(got) ? got : [got]).filter((el) => document.body.contains(el))
  }
  const selectors = Array.isArray(step.target) ? step.target : [step.target]
  return selectors.flatMap((sel) => [...document.querySelectorAll<HTMLElement>(sel)])
}

function prefillOpponent(id: string, value: string): void {
  const input = document.getElementById(id) as HTMLInputElement | null
  if (input && !input.value.trim()) input.value = value
}

function prefillCoachMatchType(): void {
  const select = document.getElementById('match-type') as HTMLSelectElement | null
  if (!select) return
  if (select.value === '9v9') return
  select.value = '9v9'
  select.dispatchEvent(new Event('change'))
}

function ensureCoachDemoRoster(): void {
  const team = getCurrentTeam()
  if ((team?.players.length ?? 0) >= 9) return
  selectTeam(DEMO_TEAM_ID)
}

function livePlayStep(id: string, again: boolean): Step {
  return {
    id,
    screen: 'game-tracking',
    title: again ? 'tutLivePlayAgainTitle' : 'tutLivePlayTitle',
    body: again ? 'tutCoachPlayAgainBody' : 'tutCoachPlayBody',
    target: '#play-clock',
    allowTarget: true,
    wait: 'play',
  }
}

function livePeriodStep(id: string): Step {
  return {
    id,
    screen: 'game-tracking',
    title: 'tutLivePeriodTitle',
    body: 'tutCoachPeriodBody',
    target: '#stop-period',
    allowTarget: true,
    wait: 'period',
  }
}

const COACH_STEPS: Step[] = [
  {
    id: 'welcome',
    screen: 'main-screen',
    title: 'tutCoachWelcomeTitle',
    body: 'tutCoachWelcomeBody',
    next: 'start',
  },
  {
    id: 'team',
    screen: 'main-screen',
    title: 'tutCoachTeamTitle',
    body: 'tutCoachTeamBody',
    target: '#main-screen [data-go="team-setup"]',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'addPlayer',
    screen: 'team-setup',
    title: 'tutCoachAddTitle',
    body: 'tutCoachAddBody',
    target: '#open-add-player',
    allowTarget: true,
    wait: 'player-added',
  },
  {
    id: 'deletePlayer',
    screen: 'team-setup',
    title: 'tutCoachDeletePlayerTitle',
    body: 'tutCoachDeletePlayerBody',
    target: () => {
      const bar = document.getElementById('player-select-bar')
      if (bar && !bar.hidden) return bar
      return document.querySelector<HTMLElement>(
        '#players-list .player-item, #players-list .player-checkbox, #players-list',
      )
    },
    allowTarget: true,
    wait: 'player-deleted',
  },
  {
    id: 'newGame',
    screen: 'main-screen',
    title: 'tutCoachGameTitle',
    body: 'tutCoachGameBody',
    target: '#start-new-game-btn',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'gameForm',
    screen: 'game-setup',
    title: 'tutCoachFormTitle',
    body: 'tutCoachFormBody',
    target: '#go-formation',
    allowTarget: true,
    wait: 'screen',
    enter: () => {
      ensureCoachDemoRoster()
      prefillOpponent('opponent-name', t('tutorialOpponent'))
      prefillCoachMatchType()
    },
  },
  {
    id: 'formation',
    screen: 'formation-setup',
    title: 'tutCoachPosTitle',
    body: 'tutCoachPosBody',
    target: '#formation-setup .formation-container',
    allowTarget: true,
    wait: 'formation-ready',
    enter: () => {
      window.requestAnimationFrame(() => {
        seedTutorialFormation()
        layoutTutorialSpot()
      })
    },
  },
  {
    id: 'formationStart',
    screen: 'formation-setup',
    title: 'tutCoachStartTitle',
    body: 'tutCoachStartBody',
    target: '#start-from-formation',
    allowTarget: true,
    wait: 'screen',
  },
  livePlayStep('livePlay', false),
  {
    id: 'liveGoal',
    screen: 'game-tracking',
    title: 'tutLiveGoalTitle',
    body: 'tutCoachGoalBody',
    target: '#on-field-grid',
    allowTarget: true,
    wait: 'goal',
  },
  livePeriodStep('livePeriod1'),
  livePlayStep('livePlay2', true),
  {
    id: 'liveYellow',
    screen: 'game-tracking',
    title: 'tutLiveYellowTitle',
    body: 'tutCoachYellowBody',
    target: '#on-field-grid',
    allowTarget: true,
    wait: 'yellow',
  },
  livePeriodStep('livePeriod2'),
  livePlayStep('livePlay3', true),
  {
    id: 'liveOpp',
    screen: 'game-tracking',
    title: 'tutLiveOppTitle',
    body: 'tutCoachOppBody',
    target: '#open-opponent-action',
    allowTarget: true,
    wait: 'opp-goal',
  },
  {
    id: 'endGame',
    screen: 'game-tracking',
    title: 'tutCoachEndTitle',
    body: 'tutCoachEndBody',
    target: '#end-game',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'reportsHere',
    screen: 'reports',
    title: 'tutCoachReportTitle',
    body: 'tutCoachReportHereBody',
    target: '#reports-list',
  },
  {
    id: 'deleteReport',
    screen: 'reports',
    title: 'tutCoachDeleteTitle',
    body: 'tutCoachDeleteBody',
    target: () => {
      const bar = document.getElementById('report-select-bar')
      if (bar && !bar.hidden) return bar
      return document.querySelector<HTMLElement>(
        '#reports-list .report-item, #reports-list .report-checkbox, #reports-list',
      )
    },
    allowTarget: true,
    wait: 'report-deleted',
  },
  {
    id: 'stats',
    screen: 'team-setup',
    title: 'tutCoachStatsTitle',
    body: 'tutCoachStatsBody',
    target: '#team-setup [data-team-tab="statistics"]',
    allowTarget: true,
  },
  {
    id: 'openSettings',
    screen: 'main-screen',
    title: 'tutCoachSettingsTitle',
    body: 'tutCoachSettingsBody',
    target: '#main-screen [data-go="settings"]',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'settings',
    screen: 'settings',
    title: 'tutCoachSettingsTitle',
    body: 'tutCoachSettingsHereBody',
  },
  {
    id: 'done',
    screen: 'main-screen',
    title: 'tutDoneTitle',
    body: 'tutCoachDoneBody',
    next: 'done',
  },
]

const PARENT_STEPS: Step[] = [
  {
    id: 'welcome',
    screen: 'parent-home',
    title: 'tutParentWelcomeTitle',
    body: 'tutParentWelcomeBody',
    next: 'start',
  },
  {
    id: 'kid',
    screen: 'parent-home',
    title: 'tutParentKidTitle',
    body: 'tutParentKidBody',
    target: '#parent-kid-form',
    allowTarget: true,
    wait: 'kid-saved',
    enter: () => {
      window.requestAnimationFrame(() => {
        const input = document.getElementById('parent-kid-name') as HTMLInputElement | null
        input?.focus()
        input?.select()
      })
    },
  },
  {
    id: 'newGame',
    screen: 'parent-home',
    title: 'tutParentGameTitle',
    body: 'tutParentGameBody',
    target: '#parent-start-game',
    allowTarget: true,
    wait: 'screen',
    enter: () => {
      prefillOpponent('parent-opponent', t('tutorialOpponent'))
      const startsOn = document.getElementById('parent-starts-on') as HTMLInputElement | null
      if (startsOn) startsOn.checked = false
    },
  },
  {
    id: 'place',
    screen: 'game-tracking',
    title: 'tutParentPlaceTitle',
    body: 'tutParentPlaceBody',
    target: '#parent-live-board',
    allowTarget: true,
    wait: 'kid-moved',
    enter: () => armParentKickoffPlacement(),
  },
  livePlayStep('livePlay', false),
  {
    id: 'liveGoal',
    screen: 'game-tracking',
    title: 'tutLiveGoalTitle',
    body: 'tutParentGoalBody',
    target: () =>
      document.querySelector<HTMLElement>(
        '#parent-pitch .player-slot[data-player-id], #parent-bench-slot[data-player-id]',
      ),
    allowTarget: true,
    wait: 'goal',
  },
  livePeriodStep('livePeriod1'),
  livePlayStep('livePlay2', true),
  {
    id: 'liveYellow',
    screen: 'game-tracking',
    title: 'tutLiveYellowTitle',
    body: 'tutParentYellowBody',
    target: () =>
      document.querySelector<HTMLElement>(
        '#parent-pitch .player-slot[data-player-id], #parent-bench-slot[data-player-id]',
      ),
    allowTarget: true,
    wait: 'yellow',
  },
  livePeriodStep('livePeriod2'),
  livePlayStep('livePlay3', true),
  {
    id: 'liveOpp',
    screen: 'game-tracking',
    title: 'tutLiveOppTitle',
    body: 'tutParentOppBody',
    target: '#parent-away-plus',
    allowTarget: true,
    wait: 'opp-goal',
  },
  {
    id: 'endGame',
    screen: 'game-tracking',
    title: 'tutParentReportTitle',
    body: 'tutParentReportBody',
    target: '#end-game',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'stats',
    screen: 'parent-home',
    title: 'tutParentStatsTitle',
    body: 'tutParentStatsBody',
    target: '#parent-kid-stats',
  },
  {
    id: 'openSettings',
    screen: 'parent-home',
    title: 'tutParentSettingsTitle',
    body: 'tutParentSettingsBody',
    target: '#parent-home [data-go="settings"]',
    allowTarget: true,
    wait: 'screen',
  },
  {
    id: 'settings',
    screen: 'settings',
    title: 'tutParentSettingsTitle',
    body: 'tutParentSettingsHereBody',
  },
  {
    id: 'done',
    screen: 'parent-home',
    title: 'tutDoneTitle',
    body: 'tutParentDoneBody',
    next: 'done',
  },
]

function steps(): Step[] {
  return active === 'parent' ? PARENT_STEPS : COACH_STEPS
}

function current(): Step | null {
  if (!active) return null
  return steps()[index] ?? null
}

function kidName(): string {
  return getParentProfile().kid.name.trim() || t('kidFallback')
}

function hasCompletedReports(): boolean {
  return Boolean(getCurrentTeam()?.games.some((game) => game.isCompleted))
}

function paint(): void {
  const step = current()
  if (!step || !active) return
  liveGate =
    step.wait === 'goal' || step.wait === 'yellow' || step.wait === 'opp-goal' || step.wait === 'sub'
      ? step.wait === 'sub'
        ? 'switch'
        : step.wait
      : step.id === 'liveSwitch'
        ? 'switch'
        : null
  setTutorialLiveGate(liveGate)
  const vars = { name: kidName() }
  const isWelcome = step.next === 'start'
  const isDone = step.next === 'done'
  showTutorialCard({
    title: t(step.title, vars),
    body: t(step.body, vars),
    nextLabel: isWelcome ? t('tutStart') : isDone ? t('tutFinish') : t('tutNext'),
    skipLabel: t('tutSkip'),
    showNext: isWelcome || isDone || !step.wait,
    showSkip: !isDone,
    target: resolveTargets(step),
    allowTarget: Boolean(step.allowTarget && resolveTargets(step).length),
    onNext: () => {
      if (isDone) {
        finish()
        return
      }
      goNext()
    },
    onSkip: () => finish(),
  })
}

function enterCurrent(): void {
  const step = current()
  if (!step) return
  if (step.id === 'endGame' && !hasInProgressGame()) {
    goNext()
    return
  }
  if (step.id === 'deleteReport' && !hasCompletedReports()) {
    goNext()
    return
  }
  if (step.id === 'deletePlayer' && !(getCurrentTeam()?.players.length)) {
    goNext()
    return
  }
  dismissLiveActionUi()
  if (activeScreenId() !== step.screen) showScreen(step.screen, { history: 'replace' })
  step.enter?.()
  paint()
  window.requestAnimationFrame(() => layoutTutorialSpot())
}

function goNext(): void {
  index += 1
  if (index >= steps().length) {
    finish()
    return
  }
  enterCurrent()
}

function stopTutorialUi(): void {
  active = null
  index = 0
  liveGate = null
  setTutorialLiveGate(null)
  setTutorialEventHandler(null)
  setTutorialRunning(false)
  hideTutorialCard()
}

function finish(): void {
  if (active) completeTutorial(active)
  stopTutorialUi()
}

export function abortTutorial(): void {
  if (!active) return
  stopTutorialUi()
}

export function isTutorialActive(): boolean {
  return active != null
}

export function tutorialPlan(role: TutorialRole): { id: string; screen: ScreenId; wait?: TutorialEvent | 'screen' }[] {
  return (role === 'parent' ? PARENT_STEPS : COACH_STEPS).map((step) => ({
    id: step.id,
    screen: step.screen,
    wait: step.wait,
  }))
}

export function startTutorial(role: TutorialRole): void {
  active = role
  index = 0
  liveGate = null
  setTutorialRunning(true)
  setRole(role)
  setTutorialEventHandler((event) => {
    const step = current()
    if (!step) return
    if (step.wait === event) goNext()
    else if (event === 'report-selected' && step.id === 'deleteReport') paint()
    else if (event === 'player-selected' && step.id === 'deletePlayer') paint()
  })
  enterCurrent()
}

export function bindTutorial(): void {
  onAfterShow((id) => onTutorialNavigated(id))
}

export function skipTutorial(): void {
  if (active) finish()
}

export function onTutorialScreenRendered(): void {
  if (!active) return
  window.requestAnimationFrame(() => layoutTutorialSpot())
}

export function onTutorialNavigated(id: ScreenId): void {
  if (!active) return
  const step = current()
  if (step?.wait === 'screen' && id !== step.screen) {
    goNext()
    return
  }
  window.requestAnimationFrame(() => layoutTutorialSpot())
}

export function maybeResumeOnboarding(): void {
  if (active) return
  if (!hasChosenRole()) return
  const screen = activeScreenId()
  if (screen === 'ota-screen' || screen === 'intro-screen' || screen === 'role-screen') return
  const save = getSave()
  const role = getRole()
  if (shouldShowTutorial(role, save.tutorial ?? { coachRev: null, parentRev: null })) {
    startTutorial(role)
    return
  }
  if (shouldShowChangelog(save.changelogSeenVersion, APP_VERSION, save.tutorial ?? { coachRev: null, parentRev: null })) {
    markChangelogSeen()
    openWhatsNew()
  }
}

/** After coach ↔ parent switch: drop the current tour (without completing it) and start the other if new. */
export function onRoleSwitched(): void {
  abortTutorial()
  maybeResumeOnboarding()
}
