import { describe, expect, it } from 'vitest'
import { APP_BUNDLE_VERSION } from './config'
import { resolveInstalledBundleVersion } from './runOta'

describe('resolveInstalledBundleVersion', () => {
  it('maps Capgo placeholders to APP_BUNDLE_VERSION', () => {
    expect(resolveInstalledBundleVersion(undefined)).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('')).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('builtin')).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('unknown')).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('1.0')).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('1.0.0')).toBe(APP_BUNDLE_VERSION)
    expect(resolveInstalledBundleVersion('v1.0')).toBe(APP_BUNDLE_VERSION)
  })

  it('keeps real OTA bundle versions', () => {
    expect(resolveInstalledBundleVersion('0.1.28')).toBe('0.1.28')
    expect(resolveInstalledBundleVersion('0.1.30')).toBe('0.1.30')
    expect(resolveInstalledBundleVersion('v0.2.0')).toBe('0.2.0')
  })
})
