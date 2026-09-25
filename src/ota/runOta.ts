import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { CapacitorUpdater } from '@capgo/capacitor-updater'
import { Network } from '@capacitor/network'
import { APP_BUNDLE_VERSION, OTA_MANIFEST_URL, OTA_REQUIRE_SIGNATURE } from './config'
import { cmpSemver, validateManifest } from './manifest'
import { verifyManifestSignature } from './signature'

const MANIFEST_ATTEMPTS = 4
const DOWNLOAD_ATTEMPTS = 2
const MANIFEST_TIMEOUT_MS = 20_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

async function fetchManifest(url: string): Promise<unknown> {
  const controller = new AbortController()
  const kill = window.setTimeout(() => controller.abort(), MANIFEST_TIMEOUT_MS)
  try {
    const res = await fetch(`${url}?t=${Date.now()}`, {
      cache: 'no-store',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
    })
    if (!res.ok) throw new Error(`Manifest HTTP ${res.status}`)
    return (await res.json()) as unknown
  } finally {
    window.clearTimeout(kill)
  }
}

async function nativeAppVersion(): Promise<string | null> {
  try {
    return (await App.getInfo()).version
  } catch {
    return null
  }
}

export type OtaProgress = {
  phase: 'check' | 'download' | 'apply' | 'done' | 'skip' | 'error'
  /** 0–100 when downloading */
  percent: number
  message: string
  diagnostics?: string[]
}

/**
 * Capgo's embedded shell often reports "builtin", "unknown", or default "1.0"/"1.0.0"
 * when no OTA has been applied yet. Treating "1.0" as real would skip every 0.x channel
 * tip (0.1.30 < 1.0). Map those placeholders to the APK's baked APP_BUNDLE_VERSION.
 */
export function resolveInstalledBundleVersion(capgoVersion: string | undefined | null): string {
  const v = String(capgoVersion ?? '')
    .replace(/^v/i, '')
    .trim()
    .toLowerCase()
  if (!v || v === 'builtin' || v === 'unknown' || v === 'default') {
    return APP_BUNDLE_VERSION
  }
  // Capgo plugin default when version is not configured on the native shell
  if (v === '1.0' || v === '1.0.0') {
    return APP_BUNDLE_VERSION
  }
  // Still on 0.x product line but Capgo claims 1.x default → trust baked app version
  if (/^1(\.0)*$/.test(v) && APP_BUNDLE_VERSION.startsWith('0.')) {
    return APP_BUNDLE_VERSION
  }
  return String(capgoVersion).replace(/^v/i, '').trim()
}

/**
 * Native-only: fetch droplet CDN manifest, download zip if newer, set next bundle.
 * Safe to call on web — returns immediately as skip.
 *
 * Channel tip + zip live on the OTA host:
 *   latest.json + dist.zip under OTA_CDN_BASE_URL (/var/www/ota/live on droplet)
 */
export async function runOtaIfNeeded(
  onProgress: (p: OtaProgress) => void,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    onProgress({
      phase: 'skip',
      percent: 100,
      message: 'Web build — OTA skipped',
      diagnostics: ['platform=web', `appVersion=${APP_BUNDLE_VERSION}`],
    })
    return
  }

  // Call notifyAppReady FIRST so Capgo never rolls back a healthy shell
  // even if later update steps throw.
  try {
    await CapacitorUpdater.notifyAppReady()
  } catch {
    // plugin missing in pure web preview
  }

  onProgress({ phase: 'check', percent: 0, message: 'Checking for updates…' })

  try {
    const status = await Network.getStatus()
    if (!status.connected) {
      onProgress({
        phase: 'skip',
        percent: 100,
        message: 'Offline — continuing with installed content',
        diagnostics: ['network=offline', `appVersion=${APP_BUNDLE_VERSION}`],
      })
      return
    }
  } catch {
    // Network plugin unavailable — still try fetch
  }

  let rawManifest: unknown = null
  let manifestErr: unknown = null
  const manifestAttempts: string[] = []
  for (let attempt = 1; attempt <= MANIFEST_ATTEMPTS && rawManifest == null; attempt++) {
    try {
      onProgress({
        phase: 'check',
        percent: 0,
        message:
          attempt > 1
            ? `Retrying update check (${attempt}/${MANIFEST_ATTEMPTS})…`
            : 'Checking for updates…',
      })
      rawManifest = await fetchManifest(OTA_MANIFEST_URL)
    } catch (e) {
      manifestErr = e
      manifestAttempts.push(e instanceof Error ? e.message : String(e))
      if (attempt < MANIFEST_ATTEMPTS) {
        await sleep(700 * attempt)
      }
    }
  }

  if (rawManifest == null) {
    onProgress({
      phase: 'skip',
      percent: 100,
      message: 'Update server unreachable — using installed build',
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `manifestUrl=${OTA_MANIFEST_URL}`,
        `manifestFetch=${manifestAttempts.join(' | ')}`,
      ],
    })
    console.warn('[ota] manifest', manifestErr)
    return
  }

  const nativeVersion = await nativeAppVersion()
  const check = validateManifest(rawManifest, nativeVersion)
  if (!check.ok) {
    onProgress({
      phase: 'skip',
      percent: 100,
      message:
        check.reason === 'minAppVersion'
          ? 'Update needs a newer version of the app from the store — using installed build'
          : 'Update rejected — using installed build',
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `nativeVersion=${nativeVersion ?? '(unknown)'}`,
        `reason=${check.reason}`,
        `error=${check.message}`,
      ],
    })
    console.warn('[ota] manifest rejected', check.reason, check.message)
    return
  }
  const manifest = check.manifest

  const signature = await verifyManifestSignature(manifest)
  console.info(`[ota] manifest v${manifest.version} signature=${signature} key=${manifest.keyId ?? '(none)'}`)
  // 'unsupported' means this WebView lacks WebCrypto; an attacker cannot cause that, so don't brick updates on it.
  if (OTA_REQUIRE_SIGNATURE && signature !== 'valid' && signature !== 'unsupported') {
    onProgress({
      phase: 'skip',
      percent: 100,
      message: 'Update rejected — using installed build',
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `manifestVersion=${manifest.version}`,
        `reason=signature`,
        `signature=${signature}`,
      ],
    })
    return
  }

  let rawCapgoVersion = ''
  let currentVersion = APP_BUNDLE_VERSION
  try {
    const cur = await CapacitorUpdater.current()
    rawCapgoVersion = String(cur.bundle?.version ?? '')
    currentVersion = resolveInstalledBundleVersion(rawCapgoVersion)
  } catch {
    /* use package default */
  }

  if (cmpSemver(manifest.version, currentVersion) <= 0) {
    onProgress({
      phase: 'done',
      percent: 100,
      message: `Up to date (v${currentVersion})`,
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `capgoVersion=${rawCapgoVersion || '(none)'}`,
        `installedVersion=${currentVersion}`,
        `manifestVersion=${manifest.version}`,
        `bundleUrl=${manifest.bundleUrl}`,
      ],
    })
    return
  }

  onProgress({
    phase: 'download',
    percent: 0,
    message: `Downloading v${manifest.version}…`,
    diagnostics: [
      `appVersion=${APP_BUNDLE_VERSION}`,
      `capgoVersion=${rawCapgoVersion || '(none)'}`,
      `installedVersion=${currentVersion}`,
      `manifestVersion=${manifest.version}`,
      `bundleUrl=${manifest.bundleUrl}`,
    ],
  })

  // Progress events from Capgo
  let remove: { remove: () => Promise<void> | void } | null = null
  try {
    remove = await CapacitorUpdater.addListener('download', (ev) => {
      const percent = Math.min(100, Math.max(0, Math.round(ev.percent ?? 0)))
      onProgress({
        phase: 'download',
        percent,
        message: `Downloading v${manifest.version}… ${percent}%`,
      })
    })
  } catch (e) {
    console.warn('[ota] progress-listener', e)
  }

  try {
    let bundle: Awaited<ReturnType<typeof CapacitorUpdater.download>> | null = null
    let lastDownloadErr: unknown = null

    for (let attempt = 1; attempt <= DOWNLOAD_ATTEMPTS && !bundle; attempt++) {
      try {
        if (attempt > 1) {
          onProgress({
            phase: 'download',
            percent: 0,
            message: `Retrying download (${attempt}/${DOWNLOAD_ATTEMPTS})…`,
          })
        }
        bundle = await CapacitorUpdater.download({
          url: manifest.bundleUrl,
          version: manifest.version,
          checksum: manifest.checksum,
        })
      } catch (e) {
        lastDownloadErr = e
        if (attempt < DOWNLOAD_ATTEMPTS) {
          await sleep(1200 * attempt)
        }
      }
    }

    if (!bundle) {
      throw lastDownloadErr ?? new Error('OTA download failed')
    }

    onProgress({
      phase: 'apply',
      percent: 100,
      message: 'Installing update…',
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `manifestVersion=${manifest.version}`,
        `bundleUrl=${manifest.bundleUrl}`,
      ],
    })

    // Next launch / immediate set — set reloads WebView with new bundle
    await CapacitorUpdater.set({ id: bundle.id })

    onProgress({
      phase: 'done',
      percent: 100,
      message: `Updated to v${manifest.version}`,
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `installedVersion=${currentVersion}`,
        `updatedTo=${manifest.version}`,
        `bundleUrl=${manifest.bundleUrl}`,
      ],
    })
  } catch (e) {
    console.warn('[ota] download/apply', e)
    onProgress({
      phase: 'skip',
      percent: 100,
      message: 'Update could not be applied — using installed build',
      diagnostics: [
        `appVersion=${APP_BUNDLE_VERSION}`,
        `manifestVersion=${manifest.version}`,
        `bundleUrl=${manifest.bundleUrl}`,
        `error=${e instanceof Error ? e.message : String(e)}`,
      ],
    })
  } finally {
    if (remove) {
      await remove.remove()
    }
  }
}
