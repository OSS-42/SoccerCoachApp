/**
 * Droplet-hosted OTA channel for the Capacitor APK.
 *
 * Layout on the host (see .env.ota.local / docs/ANDROID.md):
 *   ${OTA_DEPLOY_REMOTE_DIR}/latest.json   → channel tip
 *   ${OTA_DEPLOY_REMOTE_DIR}/dist.zip      → Capgo web bundle
 * Public base: ${OTA_DEPLOY_BASE_URL}
 *
 * After each web release:
 *  1. npm run ota:publish
 *  2. Script builds dist.zip, writes ota/latest.json, SCPs both to the droplet
 *  3. APK fetches latest.json from the CDN on cold start
 */

/** Public HTTPS base for the live channel (no trailing slash). */
export const OTA_CDN_BASE_URL = 'https://cdn-studiophoenix.net/sca/live'

/** Channel tip — must be anonymously reachable over HTTPS. */
export const OTA_MANIFEST_URL = `${OTA_CDN_BASE_URL}/latest.json`

/**
 * Extra manifest mirrors tried after the primary CDN URL fails.
 * GitHub raw / jsDelivr only work if the repo is public — kept as last-resort.
 */
export const OTA_MANIFEST_FALLBACK_URLS: readonly string[] = [
  'https://cdn-studiophoenix.net/sca/live/latest.json',
  'https://raw.githubusercontent.com/OSS-42/SoccerCoachApp/main/ota/latest.json',
  'https://cdn.jsdelivr.net/gh/OSS-42/SoccerCoachApp@main/ota/latest.json',
]

/** Bundled app version (bumped in package.json / ota channel). */
export const APP_BUNDLE_VERSION = '2.4.69'

export type OtaManifest = {
  version: string
  minAppVersion?: string
  notes?: string
  /** Direct HTTPS URL to a zip of the Vite `dist/` folder (Capgo-compatible). */
  bundleUrl: string
}
