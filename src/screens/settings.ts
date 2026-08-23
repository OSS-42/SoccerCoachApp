import { APP_VERSION, BACKUP_FILE_PREFIX } from '@/domain/config'
import { recentChangelog } from '@/domain/changelog'
import { escapeHtml, toggleDialog } from '@/ui/dom'
import { applyDomTranslations, getLocale, isLocale, t } from '@/i18n'
import { isTheme } from '@/lib/theme'
import { parseImportJson } from '@/lib/storage'
import {
  exportBackupJson,
  getCurrentTeam,
  getSave,
  importBackup,
  resetAllData,
  setDefaultSubstitution,
  setLanguage,
  setTheme,
} from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { fillTeamSelectors } from './shared'

async function hardRefresh(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
    if ('caches' in window) {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    /* still reload */
  }
  const url = new URL(window.location.href)
  url.searchParams.set('v', String(Date.now()))
  window.location.replace(url.toString())
}

export function renderSettings(): void {
  fillTeamSelectors()
  const team = getCurrentTeam()
  const input = document.getElementById('default-sub-minutes') as HTMLInputElement
  if (input) {
    const seconds = team?.settings.defaultSubstitutionSeconds
    input.value = seconds ? String(Math.round(seconds / 60)) : ''
  }
  const current = getSave().language ?? getLocale()
  document.querySelectorAll<HTMLInputElement>('input[name="language"]').forEach((radio) => {
    radio.checked = radio.value === current
  })
  const theme = getSave().theme ?? 'dark'
  document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach((radio) => {
    radio.checked = radio.value === theme
  })
  const version = document.getElementById('settings-app-version')
  if (version) version.textContent = APP_VERSION
}

export function bindSettings(): void {
  document.querySelectorAll<HTMLInputElement>('input[name="language"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!isLocale(radio.value)) return
      setLanguage(radio.value)
      applyDomTranslations()
      renderSettings()
    })
  })
  document.querySelectorAll<HTMLInputElement>('input[name="theme"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      if (!isTheme(radio.value)) return
      setTheme(radio.value)
      renderSettings()
    })
  })
  document.getElementById('open-changelog')?.addEventListener('click', () => {
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
  })
  document.getElementById('close-changelog')?.addEventListener('click', () => {
    toggleDialog('changelog-dialog', false)
  })
  document.getElementById('reload-latest')?.addEventListener('click', () => {
    void hardRefresh()
  })
  document.getElementById('save-settings')?.addEventListener('click', () => {
    const raw = (document.getElementById('default-sub-minutes') as HTMLInputElement).value
    setDefaultSubstitution(raw ? Number(raw) * 60 : null)
    showMessage(t('settingsSaved'), 'success')
  })
  document.getElementById('export-json')?.addEventListener('click', () => {
    const blob = new Blob([exportBackupJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const day = new Date().toISOString().slice(0, 10)
    link.download = `${BACKUP_FILE_PREFIX}-${day}.json`
    link.click()
    URL.revokeObjectURL(url)
    showMessage(t('backupSaved'), 'success')
  })
  document.getElementById('import-json')?.addEventListener('click', () => {
    document.getElementById('import-file')?.click()
  })
  document.getElementById('import-file')?.addEventListener('change', async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (!file) return
    const text = await file.text()
    const parsed = parseImportJson(text)
    if ('error' in parsed) {
      showMessage(parsed.error, 'error')
      return
    }
    const ok = await askConfirm({
      title: t('importTitle'),
      message: parsed.kind === 'full' ? t('restoreAsk') : t('importReplace'),
      confirmLabel: t('confirm'),
      cancelLabel: t('cancel'),
    })
    if (!ok) {
      ;(event.target as HTMLInputElement).value = ''
      return
    }
    const result = importBackup(parsed.save, parsed.kind)
    showMessage(result.message, result.ok ? 'success' : 'error')
    ;(event.target as HTMLInputElement).value = ''
  })
  document.getElementById('clear-all-data')?.addEventListener('click', async () => {
    const ok = await askConfirm({
      title: t('clearAllTitle'),
      message: t('clearAllAsk'),
      confirmLabel: t('confirmDelete'),
      cancelLabel: t('cancel'),
    })
    if (!ok) return
    resetAllData()
    applyDomTranslations()
    showMessage(t('dataCleared'), 'success')
    showScreen('main-screen')
  })
}
