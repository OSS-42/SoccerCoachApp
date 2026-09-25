import { describe, expect, it } from 'vitest'
import { cmpSemver, validateManifest } from './manifest'

const CHECKSUM = 'a'.repeat(64)

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    version: '2.5.0',
    minAppVersion: '2.4.50',
    notes: 'Self-hosted icons',
    bundleUrl: 'https://cdn-studiophoenix.net/sca/live/dist.zip',
    checksum: CHECKSUM,
    ...overrides,
  }
}

describe('validateManifest', () => {
  it('accepts a well-formed manifest from the droplet', () => {
    const check = validateManifest(manifest(), '2.4.77')
    expect(check).toEqual({
      ok: true,
      manifest: {
        version: '2.5.0',
        minAppVersion: '2.4.50',
        notes: 'Self-hosted icons',
        bundleUrl: 'https://cdn-studiophoenix.net/sca/live/dist.zip',
        checksum: CHECKSUM,
      },
    })
  })

  it('normalizes an upper-case checksum', () => {
    const check = validateManifest(manifest({ checksum: 'AB'.repeat(32) }), '2.4.77')
    expect(check.ok && check.manifest.checksum).toBe('ab'.repeat(32))
  })

  it.each([
    'https://raw.githubusercontent.com/OSS-42/SoccerCoachApp/main/dist.zip',
    'https://cdn.jsdelivr.net/gh/OSS-42/SoccerCoachApp@main/dist.zip',
    'https://cdn-studiophoenix.net.evil.example/dist.zip',
    'https://cdn-studiophoenix.net@evil.example/dist.zip',
    'http://cdn-studiophoenix.net/sca/live/dist.zip',
    'not a url',
  ])('rejects bundle host %s', (bundleUrl) => {
    expect(validateManifest(manifest({ bundleUrl }), '2.4.77')).toMatchObject({ ok: false, reason: 'origin' })
  })

  it.each([undefined, '', 'abc', 'g'.repeat(64), 'a'.repeat(63)])('rejects checksum %s', (checksum) => {
    expect(validateManifest(manifest({ checksum }), '2.4.77')).toMatchObject({ ok: false, reason: 'checksum' })
  })

  it('rejects missing or malformed required fields', () => {
    expect(validateManifest(null, '2.4.77')).toMatchObject({ ok: false, reason: 'invalid' })
    expect(validateManifest(manifest({ version: '' }), '2.4.77')).toMatchObject({ reason: 'invalid' })
    expect(validateManifest(manifest({ version: '2.5' }), '2.4.77')).toMatchObject({ reason: 'invalid' })
    expect(validateManifest(manifest({ bundleUrl: undefined }), '2.4.77')).toMatchObject({ reason: 'invalid' })
  })

  it('skips the update when the native shell is older than minAppVersion', () => {
    const check = validateManifest(manifest({ minAppVersion: '2.6.0' }), '2.5.3')
    expect(check).toMatchObject({ ok: false, reason: 'minAppVersion' })
  })

  it('accepts a shell exactly at or above minAppVersion', () => {
    expect(validateManifest(manifest({ minAppVersion: '2.4.50' }), '2.4.50').ok).toBe(true)
    expect(validateManifest(manifest({ minAppVersion: '2.4.50' }), '2.4.100').ok).toBe(true)
  })

  it('does not block when the native version is unknown or not X.Y.Z', () => {
    expect(validateManifest(manifest({ minAppVersion: '9.0.0' }), null).ok).toBe(true)
    expect(validateManifest(manifest({ minAppVersion: '9.0.0' }), '1.0').ok).toBe(true)
  })

  it('ignores a missing or malformed minAppVersion', () => {
    expect(validateManifest(manifest({ minAppVersion: undefined }), '2.4.50').ok).toBe(true)
    expect(validateManifest(manifest({ minAppVersion: 'latest' }), '2.4.50').ok).toBe(true)
  })
})

describe('cmpSemver', () => {
  it('compares numerically, not lexically', () => {
    expect(cmpSemver('2.4.100', '2.4.99')).toBeGreaterThan(0)
    expect(cmpSemver('2.5.0', '2.4.100')).toBeGreaterThan(0)
    expect(cmpSemver('v2.4.77', '2.4.77')).toBe(0)
  })
})
