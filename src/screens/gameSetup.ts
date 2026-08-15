import { MATCH_PERIOD_DEFAULTS, MATCH_TYPES, ON_FIELD_COUNT, type MatchType } from '@/domain/types'
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
}

let draft: GameDraft | null = null

export function getGameDraft(): GameDraft | null {
  return draft
}

export function clearGameDraft(): void {
  draft = null
}

export function renderGameSetup(): void {
  fillTeamSelectors()
  const date = document.getElementById('game-date') as HTMLInputElement
  if (date && !date.value) date.value = todayInputValue()
  const team = getCurrentTeam()
  const subDefault = team?.settings.defaultSubstitutionSeconds
  const subInput = document.getElementById('substitution-time') as HTMLInputElement
  if (subInput && subDefault) subInput.value = String(Math.round(subDefault / 60))
}

function isMatchType(value: string): value is MatchType {
  return (MATCH_TYPES as readonly string[]).includes(value)
}

function applyMatchTypeDefaults(matchType: MatchType): void {
  const defaults = MATCH_PERIOD_DEFAULTS[matchType]
  const periods = document.getElementById('num-periods') as HTMLInputElement | null
  const duration = document.getElementById('period-duration') as HTMLInputElement | null
  if (periods) periods.value = String(defaults.numPeriods)
  if (duration) duration.value = String(defaults.periodDuration)
}

export function bindGameSetup(): void {
  document.getElementById('match-type')?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value
    if (isMatchType(value)) applyMatchTypeDefaults(value)
  })
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
      substitutionMinutes: substitutionMinutes || 6,
    }
    showScreen('formation-setup')
  })
}


