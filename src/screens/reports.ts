import { t } from '@/i18n'
import { VIEW_REPORT_EVENT } from '@/domain/config'
import { formatClock, parseClockInput } from '@/domain/clock'
import { buildGameReportPdf, reportPdfFileName } from '@/domain/reportPdf'
import { askConfirm, askPrompt } from '@/ui/confirm'
import { deleteCompletedGames, getCurrentTeam, setCompletedGameElapsed } from '@/state/store'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { showMessage } from '@/ui/message'
import { saveOrSharePdf } from '@/lib/shareFile'
import { fillTeamSelectors } from './shared'
import { buildReportDialogHtml } from './reportView'

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
  const team = getCurrentTeam()
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
        <button class="secondary-btn" data-view="${game.id}">${t('viewReport')}</button>
        <button class="secondary-btn" data-print="${game.id}">${t('pdf')}</button>
      </div>
      <input type="checkbox" class="report-checkbox" data-game-id="${game.id}" />
    `
    list.appendChild(item)
  }
  updateReportSelectBar()
}

export function viewReport(gameId: string): void {
  const team = getCurrentTeam()
  const game = team?.games.find((g) => g.id === gameId)
  const dialog = document.getElementById('report-dialog-content')
  if (!team || !game || !dialog) {
    showMessage(t('reportMissing'), 'error')
    return
  }
  dialog.innerHTML = buildReportDialogHtml(game, team)
  const closeReport = () => toggleDialog('report-dialog', false)
  document.getElementById('close-open-report')?.addEventListener('click', closeReport)
  document.getElementById('close-open-report-top')?.addEventListener('click', closeReport)
  document.getElementById('print-open-report')?.addEventListener('click', () => {
    void exportReportPdf(gameId)
  })
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
    if (result.ok) viewReport(gameId)
  })
  toggleDialog('report-dialog', true)
}

async function exportReportPdf(gameId: string): Promise<void> {
  const team = getCurrentTeam()
  const game = team?.games.find((g) => g.id === gameId)
  if (!team || !game) {
    showMessage(t('reportMissing'), 'error')
    return
  }
  try {
    const pdf = buildGameReportPdf(game, team)
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
  })
  window.addEventListener(VIEW_REPORT_EVENT, (event) => {
    viewReport((event as CustomEvent<string>).detail)
  })
}
