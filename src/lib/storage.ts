import { migrateUnknown, freshSave } from '@/domain/migrate'
import { t } from '@/i18n'
import {
  LEGACY_SAVE_KEY,
  LEGACY_SAVE_KEY_V1,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  type AppSave,
} from '@/domain/types'

function parseRaw(raw: string | null): AppSave | null {
  if (!raw) return null
  try {
    return migrateUnknown(JSON.parse(raw))
  } catch {
    return null
  }
}

export function loadSave(): AppSave {
  const main =
    parseRaw(localStorage.getItem(SAVE_KEY)) ??
    parseRaw(localStorage.getItem(LEGACY_SAVE_KEY)) ??
    parseRaw(localStorage.getItem(LEGACY_SAVE_KEY_V1))
  if (main) return main
  const backup = parseRaw(localStorage.getItem(SAVE_BACKUP_KEY))
  if (backup) return backup
  return freshSave()
}

export function writeSave(save: AppSave): void {
  try {
    const current = localStorage.getItem(SAVE_KEY)
    if (current) localStorage.setItem(SAVE_BACKUP_KEY, current)
  } catch {
    /* quota — still write the live save */
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(save))
}

export function clearSaves(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(SAVE_BACKUP_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY)
  localStorage.removeItem(LEGACY_SAVE_KEY_V1)
}

export type ImportPayload = { save: AppSave; kind: 'full' | 'team' }

export function parseImportJson(text: string): ImportPayload | { error: string } {
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object') return { error: t('invalidImport') }
    const rec = parsed as Record<string, unknown>
    if (!rec.teamName && !rec.name && !Array.isArray(rec.players) && !Array.isArray(rec.teams)) {
      return { error: t('invalidImport') }
    }
    const kind: ImportPayload['kind'] =
      Array.isArray(rec.teams) && rec.teams.length > 0 ? 'full' : 'team'
    return { save: migrateUnknown(parsed), kind }
  } catch {
    return { error: t('importError') }
  }
}
