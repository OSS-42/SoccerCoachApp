import { t, type MessageKey } from '@/i18n'
import { REPORT_SECTIONS, type ReportSection } from '@/domain/types'
import { escapeHtml, toggleDialog } from '@/ui/dom'

const SECTION_LABELS: Record<ReportSection, MessageKey> = {
  timeline: 'shotsTimeline',
  matchLog: 'pdfSectionMatchLog',
  notes: 'notes',
  players: 'playerStatistics',
  comments: 'pdfSectionComments',
  marks: 'pdfSectionMarks',
  dnp: 'didNotPlay',
}

/** Ask which sections go in the match PDF. Resolves with the unticked ones, or null on cancel. */
export function askPdfSections(hidden: readonly ReportSection[]): Promise<ReportSection[] | null> {
  const dialog = document.getElementById('pdf-sections-dialog')
  const list = document.getElementById('pdf-sections-list')
  const okBtn = document.getElementById('pdf-sections-ok')
  const cancelBtn = document.getElementById('pdf-sections-cancel')
  if (!dialog || !list || !okBtn || !cancelBtn) return Promise.resolve([...hidden])

  list.innerHTML = REPORT_SECTIONS.map(
    (section) => `<label class="pdf-section-option">
      <input type="checkbox" data-section="${section}"${hidden.includes(section) ? '' : ' checked'} />
      <span>${escapeHtml(t(SECTION_LABELS[section]))}</span>
    </label>`,
  ).join('')
  toggleDialog('pdf-sections-dialog', true)

  return new Promise((resolve) => {
    const finish = (value: ReportSection[] | null) => {
      okBtn.removeEventListener('click', onOk)
      cancelBtn.removeEventListener('click', onCancel)
      dialog.removeEventListener('click', onBackdrop)
      toggleDialog('pdf-sections-dialog', false)
      resolve(value)
    }
    const onOk = () => {
      const unticked = [...list.querySelectorAll<HTMLInputElement>('input[data-section]')]
        .filter((box) => !box.checked)
        .map((box) => box.dataset.section as ReportSection)
      finish(unticked)
    }
    const onCancel = () => finish(null)
    const onBackdrop = (event: Event) => {
      if (event.target === dialog) finish(null)
    }
    okBtn.addEventListener('click', onOk)
    cancelBtn.addEventListener('click', onCancel)
    dialog.addEventListener('click', onBackdrop)
  })
}
