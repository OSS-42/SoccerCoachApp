import { t } from '@/i18n'
import { REPORT_MARK_MAX, REPORT_MARK_MIN, VIEW_REPORT_EVENT } from '@/domain/config'
import { formatClock, parseClockInput } from '@/domain/clock'
import { isPro } from '@/domain/entitlement'
import { askConfirm, askPrompt } from '@/ui/confirm'
import {
  deleteCompletedGames,
  findCompletedGame,
  getCurrentTeam,
  getRole,
  getSave,
  parentRosterTeam,
  setCompletedGameElapsed,
  pdfHiddenSectionsFor,
  setPdfHiddenSections,
  setReportPlayerComment,
  setReportPlayerMark,
  setReportPlayerMinutes,
} from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { saveOrSharePdf } from '@/lib/shareFile'
import { notifyTutorialEvent } from '@/ui/tutorialBus'
import { fillTeamSelectors } from './shared'
import { askPdfSections } from './pdfSections'
import { buildReportDialogHtml, type ReportDialogMode } from './reportView'

function selectedReportIds(): string[] {
  return [...document.querySelectorAll<HTMLInputElement>('.report-checkbox:checked')]
    .map((box) => box.dataset.gameId ?? '')
    .filter(Boolean)
}

function updateReportSelectBar(): void {
  const bar = document.getElementById('report-select-bar')
  const label = document.getElementById('report-select-count')
  if (!bar || !label) return
  const count = selectedReportIds().length
  bar.hidden = count === 0
  label.textContent = t('selectedCount', { count })
  document.querySelectorAll<HTMLButtonElement>('#reports-list [data-view], #reports-list [data-print]').forEach((btn) => {
    btn.disabled = count > 0
  })
}

export function renderReports(): void {
  fillTeamSelectors()
  const parent = getRole() === 'parent'
  const team = parent ? parentRosterTeam() : getCurrentTeam()
  const banner = document.querySelector<HTMLElement>('#reports .team-name-banner')
  if (banner) banner.hidden = parent
  const back = document.querySelector<HTMLElement>('#reports .back-btn')
  if (back) back.dataset.go = parent ? 'parent-home' : 'main-screen'
  const list = document.getElementById('reports-list')
  if (!list || !team) return
  const games = team.games.filter((g) => g.isCompleted).sort((a, b) => {
    const byDate = b.date.localeCompare(a.date)
    if (byDate) return byDate
    const aWhen = a.endTime || a.startTime || ''
    const bWhen = b.endTime || b.startTime || ''
    return bWhen.localeCompare(aWhen)
  })
  if (!games.length) {
    list.innerHTML = `<div class="empty-state">${t('noReports')}</div>`
    updateReportSelectBar()
    return
  }
  list.innerHTML = ''
  for (const game of games) {
    const item = document.createElement('div')
    item.className = 'report-item'
    item.innerHTML = `
      <span class="report-date">${escapeHtml(game.date)}</span>
      <div class="report-sides">
        <div class="report-side">
          <span class="report-team">${escapeHtml(team.name)}</span>
          <span class="report-score">${game.homeScore}</span>
        </div>
        <div class="report-side">
          <span class="report-team">${escapeHtml(game.opponentName)}</span>
          <span class="report-score">${game.awayScore}</span>
        </div>
      </div>
      <div class="report-actions">
        <button class="secondary-btn" data-view="${escapeHtml(game.id)}">${t('viewReport')}</button>
        <button class="secondary-btn" data-print="${escapeHtml(game.id)}">${t('pdf')}</button>
      </div>
      <input type="checkbox" class="report-checkbox" data-game-id="${escapeHtml(game.id)}" />
    `
    list.appendChild(item)
  }
  updateReportSelectBar()
}

function bindReportEditCards(gameId: string): void {
  const cards = document.getElementById('report-edit-cards')
  if (!cards) return
  const cardOf = (target: EventTarget | null) => (target as HTMLElement | null)?.closest<HTMLElement>('.report-edit-card')
  const showReset = (card: HTMLElement, edited: boolean) => {
    const reset = card.querySelector<HTMLButtonElement>('.report-edit-reset')
    if (reset) reset.hidden = !edited
  }
  cards.addEventListener('change', (event) => {
    const target = event.target as HTMLElement
    const card = cardOf(target)
    const playerId = card?.dataset.playerId
    if (!card || !playerId) return
    if (target instanceof HTMLTextAreaElement) {
      setReportPlayerComment(gameId, playerId, target.value)
      return
    }
    if (target instanceof HTMLInputElement && target.classList.contains('report-edit-mark')) {
      const raw = target.value.trim()
      const mark = raw === '' ? null : Number(raw)
      if (mark != null && (!Number.isInteger(mark) || mark < REPORT_MARK_MIN || mark > REPORT_MARK_MAX)) {
        showMessage(t('invalidMark'), 'error')
        target.value = target.defaultValue
        return
      }
      setReportPlayerMark(gameId, playerId, mark)
      target.defaultValue = target.value
      return
    }
    if (!(target instanceof HTMLInputElement) || !target.classList.contains('report-edit-minutes')) return
    const computed = Number(card.dataset.computed ?? 0)
    const raw = target.value.trim()
    const minutes = raw === '' ? null : Number(raw)
    if (minutes != null && (!Number.isFinite(minutes) || minutes < 0)) {
      showMessage(t('invalidMinutes'), 'error')
      target.value = String(computed)
      return
    }
    setReportPlayerMinutes(gameId, playerId, minutes)
    const value = minutes == null ? computed : Math.round(minutes)
    target.value = String(value)
    showReset(card, value !== computed)
  })
  cards.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (!target.classList.contains('report-edit-reset')) return
    const card = cardOf(target)
    const playerId = card?.dataset.playerId
    if (!card || !playerId) return
    setReportPlayerMinutes(gameId, playerId, null)
    const input = card.querySelector<HTMLInputElement>('.report-edit-minutes')
    if (input) input.value = card.dataset.computed ?? '0'
    showReset(card, false)
  })
}

export function viewReport(gameId: string, mode: ReportDialogMode = 'view'): void {
  const found = findCompletedGame(gameId)
  const team = found?.team
  const game = found?.game
  const dialog = document.getElementById('report-dialog-content')
  if (!team || !game || !dialog) {
    showMessage(t('reportMissing'), 'error')
    return
  }
  dialog.innerHTML = buildReportDialogHtml(game, team, mode)
  dialog.scrollTop = 0
  const closeReport = () => toggleDialog('report-dialog', false)
  document.getElementById('close-open-report')?.addEventListener('click', closeReport)
  document.getElementById('close-open-report-top')?.addEventListener('click', closeReport)
  document.getElementById('print-open-report')?.addEventListener('click', () => {
    void exportReportPdf(gameId)
  })
  document.getElementById('edit-open-report')?.addEventListener('click', () => viewReport(gameId, 'edit'))
  const finishEditing = () => {
    // Blurring commits the field being typed in (its change event) before the view re-renders.
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
    viewReport(gameId, 'view')
  }
  document.getElementById('done-edit-report')?.addEventListener('click', finishEditing)
  document.getElementById('done-edit-report-top')?.addEventListener('click', finishEditing)
  bindReportEditCards(gameId)
  document.getElementById('report-header-info')?.addEventListener('click', async () => {
    const raw = await askPrompt({
      title: t('editTimeTitle'),
      message: t('editTimeAsk'),
      value: formatClock(game.elapsedSeconds),
      confirmLabel: t('save'),
      cancelLabel: t('cancel'),
    })
    if (raw == null) return
    const seconds = parseClockInput(raw)
    if (seconds == null) {
      showMessage(t('invalidTime'), 'error')
      return
    }
    const result = setCompletedGameElapsed(gameId, seconds)
    showMessage(result.message, result.ok ? 'success' : 'error')
    if (result.ok) viewReport(gameId, mode)
  })
  toggleDialog('report-dialog', true)
}

async function exportReportPdf(gameId: string): Promise<void> {
  const found = findCompletedGame(gameId)
  const team = found?.team
  const game = found?.game
  if (!team || !game) {
    showMessage(t('reportMissing'), 'error')
    return
  }
  const hidden = await askPdfSections(pdfHiddenSectionsFor(team))
  if (!hidden) return
  setPdfHiddenSections(gameId, hidden)
  try {
    // jsPDF + html2canvas + DOMPurify (~390 kB) load only when a report is exported.
    const { buildGameReportPdf, reportPdfFileName } = await import('@/domain/reportPdf')
    const pdf = buildGameReportPdf(game, team, { promo: !isPro(getSave()), hidden })
    const bytes = pdf.output('arraybuffer')
    if (!bytes.byteLength) throw new Error('empty pdf')
    await saveOrSharePdf(bytes, reportPdfFileName(game))
  } catch (err) {
    console.error('PDF export failed', err)
    showMessage(t('pdfExportFailed'), 'error')
  }
}

export function bindReports(): void {
  document.getElementById('reports-list')?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement
    if (target.classList.contains('report-checkbox')) return
    const view = target.closest<HTMLElement>('[data-view]')?.dataset.view
    const print = target.closest<HTMLElement>('[data-print]')?.dataset.print
    if (view) viewReport(view)
    if (print) void exportReportPdf(print)
  })
  document.getElementById('reports-list')?.addEventListener('change', (event) => {
    if (!(event.target as HTMLElement).classList.contains('report-checkbox')) return
    updateReportSelectBar()
    notifyTutorialEvent('report-selected')
  })
  document.getElementById('report-select-cancel')?.addEventListener('click', () => {
    document.querySelectorAll<HTMLInputElement>('.report-checkbox').forEach((box) => {
      box.checked = false
    })
    updateReportSelectBar()
  })
  document.getElementById('report-select-delete')?.addEventListener('click', async () => {
    const ids = selectedReportIds()
    if (!ids.length) return
    const ok = await askConfirm({
      title: t('deleteReportsTitle'),
      message: t('deleteReportsAsk', { count: ids.length }),
      confirmLabel: t('confirmDelete'),
      cancelLabel: t('cancel'),
    })
    if (!ok) return
    const result = deleteCompletedGames(ids)
    showMessage(result.message, result.ok ? 'success' : 'error')
    if (result.ok) notifyTutorialEvent('report-deleted')
  })
  window.addEventListener(VIEW_REPORT_EVENT, (event) => {
    viewReport((event as CustomEvent<string>).detail)
  })
}
