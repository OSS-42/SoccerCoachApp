/** @vitest-environment jsdom */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseImportJson } from '@/lib/storage'
import { getSave, hydrate, importBackup } from './store'

function memoryStorage(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, String(value)),
  }
}

describe('importBackup (full)', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    hydrate()
  })

  it('does not take the entitlement or role from the backup file', () => {
    const before = getSave()
    expect(before.entitlement).toBe('lite')

    const parsed = parseImportJson(
      JSON.stringify({
        entitlement: 'pro',
        role: 'parent',
        roleChosen: true,
        teams: [{ id: 't1', name: 'Imported', players: [], games: [] }],
      }),
    )
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.kind).toBe('full')

    const result = importBackup(parsed.save, parsed.kind)
    expect(result.ok).toBe(true)

    const after = getSave()
    expect(after.teams.some((t) => t.name === 'IMPORTED')).toBe(true)
    expect(after.entitlement).toBe('lite')
    expect(after.role).toBe(before.role)
    expect(after.roleChosen).toBe(before.roleChosen)
  })
})
