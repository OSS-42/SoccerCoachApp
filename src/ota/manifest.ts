import type { OtaManifest } from './config'

export const OTA_BUNDLE_ORIGIN = 'https://cdn-studiophoenix.net'

const SEMVER = /^\d+\.\d+\.\d+$/
const SHA256_HEX = /^[0-9a-f]{64}$/

export function cmpSemver(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const len = Math.max(pa.length, pb.length)
  for (let i = 0; i < len; i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

export type ManifestCheck =
  | { ok: true; manifest: OtaManifest }
  | { ok: false; reason: 'invalid' | 'origin' | 'checksum' | 'minAppVersion'; message: string }

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * `nativeVersion` is the installed shell's version (App.getInfo). When it is unknown
 * or not X.Y.Z, minAppVersion is not enforced so updates keep flowing.
 */
export function validateManifest(raw: unknown, nativeVersion: string | null): ManifestCheck {
  const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const version = str(rec.version)
  const bundleUrl = str(rec.bundleUrl)
  if (!SEMVER.test(version) || !bundleUrl) {
    return { ok: false, reason: 'invalid', message: 'Manifest missing required fields' }
  }

  let origin = ''
  try {
    const url = new URL(bundleUrl)
    if (url.protocol === 'https:') origin = url.origin
  } catch {
    /* not a URL */
  }
  if (origin !== OTA_BUNDLE_ORIGIN) {
    return { ok: false, reason: 'origin', message: `Bundle host not allowed: ${bundleUrl}` }
  }

  const checksum = str(rec.checksum).toLowerCase()
  if (!SHA256_HEX.test(checksum)) {
    return { ok: false, reason: 'checksum', message: 'Manifest has no valid SHA-256 checksum' }
  }

  const minAppVersion = SEMVER.test(str(rec.minAppVersion)) ? str(rec.minAppVersion) : undefined
  const native = str(nativeVersion)
  if (minAppVersion && SEMVER.test(native) && cmpSemver(native, minAppVersion) < 0) {
    return {
      ok: false,
      reason: 'minAppVersion',
      message: `Update requires app ${minAppVersion}+ (installed ${native})`,
    }
  }

  const notes = str(rec.notes)
  return {
    ok: true,
    manifest: { version, bundleUrl, checksum, minAppVersion, notes: notes || undefined },
  }
}
