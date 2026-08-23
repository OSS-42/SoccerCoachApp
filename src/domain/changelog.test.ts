import { describe, expect, it } from 'vitest'
import { CHANGELOG, recentChangelog } from './changelog'

describe('changelog', () => {
  it('returns the two newest versions with copy in both languages', () => {
    const recent = recentChangelog(2)
    expect(recent).toHaveLength(2)
    expect(recent[0]?.version).toBe(CHANGELOG[0]?.version)
    expect(recent[1]?.version).toBe(CHANGELOG[1]?.version)
    for (const entry of recent) {
      expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/)
      expect(entry.items.en.length).toBeGreaterThan(0)
      expect(entry.items.fr.length).toBeGreaterThan(0)
    }
  })
})
