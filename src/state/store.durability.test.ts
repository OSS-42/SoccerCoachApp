/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { APP_VERSION, SAVE_BACKUP_KEY, SAVE_GOOD_KEY, SAVE_KEY, SAVE_LIVE_KEY } from '@/domain/config'
import { loadSave, writeGoodSnapshot, writeLiveClock } from '@/lib/storage'
import { memoryStorage } from '@/test/memoryStorage'
import { getSave, hydrate, importBackup, onSaveError, persistClock, setTheme, subscribe } from './store'

let storage: ReturnType<typeof memoryStorage>

function rawSave(overrides: Record<string, unknown> = {}) {
  return {
    saveVersion: 2,
    appVersion: '2.4.77',
    currentTeamId: 't1',
    teams: [{ id: 't1', name: 'U12 Tigers', players: [{ id: 'p1', name: 'ADA', jerseyNumber: 9 }], games: [] }],
    ...overrides,
  }
}

function liveGameSave() {
  return rawSave({
    currentGame: { id: 'g1', opponentName: 'RIVALS', isCompleted: false, elapsedSeconds: 60 },
    clock: { elapsedSeconds: 60, running: false, runningStartedAt: null, subRemaining: 0, subDuration: 0, subRunning: false, useSubstitutionTimer: false },
  })
}

function clock(elapsedSeconds: number) {
  return { elapsedSeconds, running: false, runningStartedAt: null, subRemaining: 0, subDuration: 0, subRunning: false, useSubstitutionTimer: false }
}

function good() {
  return JSON.parse(storage.getItem(SAVE_GOOD_KEY) ?? 'null') as { appVersion: string; save: ReturnType<typeof rawSave> } | null
}

beforeEach(() => {
  storage = memoryStorage()
  vi.stubGlobal('localStorage', storage)
})

describe('save durability', () => {
  it('keeps the last save, still updates the UI, and reports a full storage once', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(rawSave()))
    hydrate()
    const saved = storage.getItem(SAVE_KEY)
    const renders = vi.fn()
    const errors = vi.fn()
    const unsubscribe = subscribe(renders)
    const offError = onSaveError(errors)

    storage.failWrites = true
    expect(() => setTheme('light')).not.toThrow()
    setTheme('dark')
    expect(renders).toHaveBeenCalledTimes(2)
    expect(errors).toHaveBeenCalledTimes(1)
    expect(storage.getItem(SAVE_KEY)).toBe(saved)

    storage.failWrites = false
    setTheme('light')
    storage.failWrites = true
    setTheme('dark')
    expect(errors).toHaveBeenCalledTimes(2)

    unsubscribe()
    offError()
  })

  it('falls back to the good snapshot when the main save is corrupt', () => {
    writeGoodSnapshot(rawSave())
    storage.setItem(SAVE_KEY, '{"teams": [')
    const loaded = loadSave()
    expect(loaded.source).toBe('good')
    expect(loaded.save.teams.some((t) => t.name === 'U12 TIGERS')).toBe(true)
  })

  it('snapshots what the previous app version wrote on first launch of a new version', () => {
    const previous = rawSave()
    storage.setItem(SAVE_KEY, JSON.stringify(previous))
    storage.setItem(SAVE_BACKUP_KEY, JSON.stringify(previous))
    hydrate()
    expect(good()?.appVersion).toBe(APP_VERSION)
    expect(good()?.save).toEqual(previous)
    expect(storage.getItem(SAVE_BACKUP_KEY)).toBeNull()

    const before = storage.getItem(SAVE_GOOD_KEY)
    hydrate()
    expect(storage.getItem(SAVE_GOOD_KEY)).toBe(before)
  })

  it('does not snapshot a fresh install', () => {
    hydrate()
    expect(storage.getItem(SAVE_GOOD_KEY)).toBeNull()
  })

  it('clock tick writes only the small live record, never the full save or the snapshot', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(liveGameSave()))
    hydrate()
    const main = storage.getItem(SAVE_KEY)
    const snapshot = storage.getItem(SAVE_GOOD_KEY)

    persistClock()

    expect(storage.getItem(SAVE_KEY)).toBe(main)
    expect(storage.getItem(SAVE_GOOD_KEY)).toBe(snapshot)
    expect(JSON.parse(storage.getItem(SAVE_LIVE_KEY) ?? '{}').gameId).toBe('g1')
  })

  it('folds the live clock back into its game on reload', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(liveGameSave()))
    writeLiveClock('g1', clock(300), 300)
    const { save } = loadSave()
    expect(save.currentGame?.elapsedSeconds).toBe(300)
    expect(save.clock.elapsedSeconds).toBe(300)
  })

  it('ignores a live clock that belongs to another game', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(liveGameSave()))
    writeLiveClock('other-game', clock(900), 900)
    expect(loadSave().save.currentGame?.elapsedSeconds).toBe(60)
  })

  it('a full save supersedes the live record', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(liveGameSave()))
    hydrate()
    persistClock()
    setTheme('light')
    expect(storage.getItem(SAVE_LIVE_KEY)).toBeNull()
  })

  it('keeps the pre-import data as the good snapshot', () => {
    storage.setItem(SAVE_KEY, JSON.stringify(rawSave()))
    hydrate()
    importBackup(
      loadSaveFrom(rawSave({ teams: [{ id: 't9', name: 'Imported', players: [], games: [] }] })),
      'full',
    )
    expect(getSave().teams.some((t) => t.name === 'IMPORTED')).toBe(true)
    expect(good()?.save.teams.some((t) => t.name === 'U12 TIGERS')).toBe(true)
  })
})

function loadSaveFrom(raw: unknown) {
  const scratch = memoryStorage()
  scratch.setItem(SAVE_KEY, JSON.stringify(raw))
  vi.stubGlobal('localStorage', scratch)
  const { save } = loadSave()
  vi.stubGlobal('localStorage', storage)
  return save
}
