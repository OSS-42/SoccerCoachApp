import { APP_VERSION } from '@/domain/types'

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
import { applyDomTranslations, getLocale, isLocale } from '@/i18n'
import { t } from '@/i18n'
import { getCurrentTeam, getSave, importIntoCurrentTeam, resetAllData, setDefaultSubstitution, setLanguage } from '@/state/store'
import { askConfirm } from '@/ui/confirm'
import { parseImportJson } from '@/lib/storage'
import { showMessage } from '@/ui/message'
import { showScreen } from '@/ui/nav'
import { exportCurrentTeamJson } from '@/state/store'
import { fillTeamSelectors } from './shared'

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
  document.getElementById('reload-latest')?.addEventListener('click', () => {
    void hardRefresh()
  })
  document.getElementById('save-settings')?.addEventListener('click', () => {
    const raw = (document.getElementById('default-sub-minutes') as HTMLInputElement).value
    setDefaultSubstitution(raw ? Number(raw) * 60 : null)
    showMessage(t('settingsSaved'), 'success')
  })
  document.getElementById('export-json')?.addEventListener('click', () => {
    const team = getCurrentTeam()
    const blob = new Blob([exportCurrentTeamJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${(team?.name ?? 'team').replace(/\s+/g, '_')}_data.json`
    link.click()
    URL.revokeObjectURL(url)
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
      message: t('importReplace'),
      confirmLabel: t('confirm'),
      cancelLabel: t('cancel'),
    })
    if (!ok) {
      ;(event.target as HTMLInputElement).value = ''
      return
    }
    const result = importIntoCurrentTeam(parsed)
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
