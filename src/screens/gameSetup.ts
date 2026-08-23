import {
  DEFAULT_SUB_MINUTES,
  ELEVEN_V11_FRIENDLY_MINUTES,
  ELEVEN_V11_OFFICIAL_MINUTES,
  ELEVEN_V11_PERIODS,
} from '@/domain/config'
import { isMatchType, MATCH_PERIOD_DEFAULTS, ON_FIELD_COUNT, type MatchType } from '@/domain/types'
import { t } from '@/i18n'
import { getCurrentTeam, setDefaultSubstitution } from '@/state/store'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { fillTeamSelectors, todayInputValue } from './shared'

export type GameDraft = {
  opponentName: string
  date: string
  matchType: MatchType
  numPeriods: number
  periodDuration: number
  useSubstitutionTimer: boolean
  substitutionMinutes: number
  official11: boolean
}

let draft: GameDraft | null = null

export function getGameDraft(): GameDraft | null {
  return draft
}

export function clearGameDraft(): void {
  draft = null
}

function syncSubTimerNeeded(): void {
  const notNeeded = document.getElementById('timer-not-needed') as HTMLInputElement | null
  const subInput = document.getElementById('substitution-time') as HTMLInputElement | null
  if (!notNeeded || !subInput) return
  const minutes = Number(subInput.value)
  if (minutes > 0) notNeeded.checked = false
}

export function renderGameSetup(): void {
  fillTeamSelectors()
  const date = document.getElementById('game-date') as HTMLInputElement
  if (date && !date.value) date.value = todayInputValue()
  const team = getCurrentTeam()
  const subDefault = team?.settings.defaultSubstitutionSeconds
  const subInput = document.getElementById('substitution-time') as HTMLInputElement
  const notNeeded = document.getElementById('timer-not-needed') as HTMLInputElement | null
  if (subInput && subDefault) {
    subInput.value = String(Math.round(subDefault / 60))
    if (notNeeded) notNeeded.checked = false
  }
  const matchType = (document.getElementById('match-type') as HTMLSelectElement | null)?.value ?? ''
  syncRegulationUi(isMatchType(matchType) ? matchType : '')
}

function official11Selected(): boolean {
  const checked = document.querySelector<HTMLInputElement>(
    'input[name="match-regulation"]:checked',
  )
  return checked?.value === 'official'
}

function elevenDuration(): number {
  return official11Selected() ? ELEVEN_V11_OFFICIAL_MINUTES : ELEVEN_V11_FRIENDLY_MINUTES
}

function syncElevenTimingPresets(): void {
  const presets = document.getElementById('eleven-timing-presets')
  const matchType = (document.getElementById('match-type') as HTMLSelectElement | null)?.value
  const periods = (document.getElementById('num-periods') as HTMLInputElement | null)?.value
  const duration = (document.getElementById('period-duration') as HTMLInputElement | null)?.value
  if (presets) presets.hidden = matchType !== '11v11'
  document.querySelectorAll<HTMLButtonElement>('[data-eleven-timing]').forEach((btn) => {
    btn.classList.toggle(
      'is-active',
      matchType === '11v11' && periods === '2' && duration === btn.dataset.elevenTiming,
    )
  })
}

function syncRegulationUi(matchType: MatchType | ''): void {
  const group = document.getElementById('match-regulation-group')
  const hint = document.getElementById('match-regulation-hint')
  if (group) group.hidden = matchType !== '11v11'
  if (hint) {
    hint.textContent =
      matchType !== '11v11'
        ? ''
        : official11Selected()
          ? t('regulationOfficialHint')
          : t('regulationFriendlyHint')
  }
  syncElevenTimingPresets()
}

function applyMatchTypeDefaults(matchType: MatchType): void {
  const defaults = MATCH_PERIOD_DEFAULTS[matchType]
  const periods = document.getElementById('num-periods') as HTMLInputElement | null
  const duration = document.getElementById('period-duration') as HTMLInputElement | null
  if (matchType === '11v11') {
    if (periods) periods.value = String(ELEVEN_V11_PERIODS)
    if (duration) duration.value = String(elevenDuration())
  } else {
    if (periods) periods.value = String(defaults.numPeriods)
    if (duration) duration.value = String(defaults.periodDuration)
  }
  syncRegulationUi(matchType)
}

function applyElevenTiming(minutes: number): void {
  const periods = document.getElementById('num-periods') as HTMLInputElement | null
  const duration = document.getElementById('period-duration') as HTMLInputElement | null
  if (periods) periods.value = String(ELEVEN_V11_PERIODS)
  if (duration) duration.value = String(minutes)
  syncElevenTimingPresets()
}

export function bindGameSetup(): void {
  document.getElementById('match-type')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    if (isMatchType(value)) applyMatchTypeDefaults(value)
    else syncRegulationUi('')
  })
  document.getElementById('match-regulation-group')?.addEventListener('change', () => {
    const value = (document.getElementById('match-type') as HTMLSelectElement).value
    const duration = document.getElementById('period-duration') as HTMLInputElement | null
    if (
      value === '11v11' &&
      duration &&
      (duration.value === String(ELEVEN_V11_FRIENDLY_MINUTES) ||
        duration.value === String(ELEVEN_V11_OFFICIAL_MINUTES))
    ) {
      duration.value = String(elevenDuration())
    }
    syncRegulationUi(isMatchType(value) ? value : '')
  })
  document.getElementById('eleven-timing-presets')?.addEventListener('click', (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLElement>('[data-eleven-timing]')
    const minutes = Number(btn?.dataset.elevenTiming)
    if (minutes === ELEVEN_V11_FRIENDLY_MINUTES || minutes === ELEVEN_V11_OFFICIAL_MINUTES) {
      applyElevenTiming(minutes)
    }
  })
  document.getElementById('num-periods')?.addEventListener('input', syncElevenTimingPresets)
  document.getElementById('period-duration')?.addEventListener('input', syncElevenTimingPresets)
  document.getElementById('substitution-time')?.addEventListener('input', syncSubTimerNeeded)
  document.getElementById('go-formation')?.addEventListener('click', () => {
    const team = getCurrentTeam()
    const opponent = (document.getElementById('opponent-name') as HTMLInputElement).value.trim()
    const date = (document.getElementById('game-date') as HTMLInputElement).value
    const matchType = (document.getElementById('match-type') as HTMLSelectElement).value as MatchType
    const numPeriods = Number((document.getElementById('num-periods') as HTMLInputElement).value)
    const periodDuration = Number((document.getElementById('period-duration') as HTMLInputElement).value)
    const timerNotNeeded = (document.getElementById('timer-not-needed') as HTMLInputElement).checked
    const substitutionMinutes = Number(
      (document.getElementById('substitution-time') as HTMLInputElement).value,
    )
    if (!opponent) return showMessage(t('needOpponent'), 'error')
    if (!date) return showMessage(t('needDate'), 'error')
    if (!matchType) return showMessage(t('needMatchType'), 'error')
    if (!numPeriods || numPeriods < 1) return showMessage(t('needPeriod'), 'error')
    if (!periodDuration || periodDuration < 1) {
      return showMessage(t('needPeriodTime'), 'error')
    }
    if (!timerNotNeeded && !substitutionMinutes) {
      return showMessage(t('needSubTime'), 'error')
    }
    const required = ON_FIELD_COUNT[matchType]
    if ((team?.players.length ?? 0) < required) {
      return showMessage(
        t('needPlayers', { required, matchType, count: team?.players.length ?? 0 }),
        'error',
      )
    }
    if ((document.getElementById('save-substitution-default') as HTMLInputElement).checked) {
      setDefaultSubstitution(Math.max(1, substitutionMinutes) * 60)
    }
    draft = {
      opponentName: opponent,
      date,
      matchType,
      numPeriods,
      periodDuration,
      useSubstitutionTimer: !timerNotNeeded,
      substitutionMinutes: substitutionMinutes || DEFAULT_SUB_MINUTES,
      official11: matchType === '11v11' && official11Selected(),
    }
    showScreen('formation-setup')
  })
}


