import { recentChangelog } from '@/domain/changelog'
import { getLocale } from '@/i18n'
import { escapeHtml, toggleDialog } from '@/ui/dom'

export function openWhatsNew(): void {
  const list = document.getElementById('changelog-list')
  if (list) {
    const locale = getLocale()
    list.innerHTML = recentChangelog(2)
      .map((entry) => {
        const items = (entry.items[locale] ?? entry.items.en)
          .map((item) => `<li>${escapeHtml(item)}</li>`)
          .join('')
        return `<section class="changelog-entry">
            <h3>v${escapeHtml(entry.version)}</h3>
            <ul>${items}</ul>
          </section>`
      })
      .join('')
  }
  toggleDialog('changelog-dialog', true)
}
