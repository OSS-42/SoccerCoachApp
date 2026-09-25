import { migrateUnknown, freshSave } from '@/domain/migrate'
import { t } from '@/i18n'
import { SAVE_GOOD_KEY, SAVE_LIVE_KEY } from '@/domain/config'
import {
  APP_VERSION,
  LEGACY_SAVE_KEY,
  LEGACY_SAVE_KEY_V1,
  SAVE_BACKUP_KEY,
  SAVE_KEY,
  type AppSave,
  type ClockState,
} from '@/domain/types'

export type SaveSource = 'main' | 'good' | 'backup' | 'legacy' | 'fresh'

const GOOD_KIND = 'actionpitch-good-save'

type GoodSnapshot = { kind: typeof GOOD_KIND; appVersion: string; savedAt: string; save: unknown }

type LiveClock = { gameId: string; clock: ClockState; elapsedSeconds: number }

function readJson(key: string): unknown {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function migrateOrNull(raw: unknown): AppSave | null {
  if (!asObject(raw)) return null
  try {
    return migrateUnknown(raw)
  } catch {
    return null
  }
}

export function parseGoodSnapshot(value: unknown): GoodSnapshot | null {
  const rec = asObject(value)
  if (!rec || rec.kind !== GOOD_KIND || !asObject(rec.save)) return null
  return rec as GoodSnapshot
}

/** The clock tick only writes the small live record; fold it back into its game. */
function withLiveClock(raw: unknown): unknown {
  const rec = asObject(raw)
  const game = asObject(rec?.currentGame)
  const live = asObject(readJson(SAVE_LIVE_KEY)) as Partial<LiveClock> | null
  if (!rec || !game || !live || typeof live.gameId !== 'string' || game.id !== live.gameId) return raw
  return { ...rec, clock: live.clock, currentGame: { ...game, elapsedSeconds: live.elapsedSeconds } }
}

export function readRawMainSave(): unknown {
  return readJson(SAVE_KEY)
}

export function loadSave(): { save: AppSave; source: SaveSource } {
  const main = migrateOrNull(withLiveClock(readJson(SAVE_KEY)))
  if (main) return { save: main, source: 'main' }
  const good = migrateOrNull(parseGoodSnapshot(readJson(SAVE_GOOD_KEY))?.save)
  if (good) return { save: good, source: 'good' }
  const backup = migrateOrNull(readJson(SAVE_BACKUP_KEY))
  if (backup) return { save: backup, source: 'backup' }
  const legacy = migrateOrNull(readJson(LEGACY_SAVE_KEY)) ?? migrateOrNull(readJson(LEGACY_SAVE_KEY_V1))
  if (legacy) return { save: legacy, source: 'legacy' }
  return { save: freshSave(), source: 'fresh' }
}

/** False when storage refused the write (quota, private mode); the previous save is untouched. */
export function writeSave(save: AppSave): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    return false
  }
  try {
    localStorage.removeItem(SAVE_LIVE_KEY)
  } catch {
    /* stale live record is ignored unless its game id matches */
  }
  return true
}

export function writeLiveClock(gameId: string, clock: ClockState, elapsedSeconds: number): boolean {
  const record: LiveClock = { gameId, clock, elapsedSeconds }
  try {
    localStorage.setItem(SAVE_LIVE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

export function goodSnapshotVersion(): string | null {
  return parseGoodSnapshot(readJson(SAVE_GOOD_KEY))?.appVersion ?? null
}

/**
 * Last known good copy, written only at milestones (never from the clock tick).
 * Returns the serialized snapshot so it can also be mirrored to a native file.
 */
export function writeGoodSnapshot(save: unknown): string {
  const snapshot: GoodSnapshot = {
    kind: GOOD_KIND,
    appVersion: APP_VERSION,
    savedAt: new Date().toISOString(),
    save,
  }
  const json = JSON.stringify(snapshot)
  try {
    localStorage.setItem(SAVE_GOOD_KEY, json)
    localStorage.removeItem(SAVE_BACKUP_KEY)
  } catch {
    /* quota — the previous snapshot stays in place */
  }
  return json
}

export function clearSaves(): void {
  for (const key of [SAVE_KEY, SAVE_GOOD_KEY, SAVE_LIVE_KEY, SAVE_BACKUP_KEY, LEGACY_SAVE_KEY, LEGACY_SAVE_KEY_V1]) {
    localStorage.removeItem(key)
  }
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
