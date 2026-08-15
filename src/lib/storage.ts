import { migrateUnknown, freshSave } from '@/domain/migrate'
import { t } from '@/i18n'
import { LEGACY_SAVE_KEY, LEGACY_SAVE_KEY_V1, SAVE_KEY, type AppSave } from '@/domain/types'

export function loadSave(): AppSave {
  try {
    const raw = localStorage.getItem(SAVE_KEY) ?? localStorage.getItem(LEGACY_SAVE_KEY)
    if (raw) return migrateUnknown(JSON.parse(raw))
    const v1 = localStorage.getItem(LEGACY_SAVE_KEY_V1)
    if (v1) return migrateUnknown(JSON.parse(v1))
  } catch {
    /* fall through */
  }
  return freshSave()
}

export function writeSave(save: AppSave): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function clearSaves(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY_V1)
}

export function parseImportJson(text: string): ReturnType<typeof migrateUnknown> | { error: string } {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object') return { error: 'Invalid data format' }
    const rec = parsed as Record<string, unknown>
    if (!rec.teamName && !rec.name && !Array.isArray(rec.players) && !Array.isArray(rec.teams)) {
      return { error: t('invalidImport') }
    }
    return migrateUnknown(parsed)
  } catch {
    return { error: t('importError') }
  }
}
