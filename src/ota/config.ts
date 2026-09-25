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

/** Channel tip — the only manifest source; offline or unreachable keeps the installed build. */
export const OTA_MANIFEST_URL = `${OTA_CDN_BASE_URL}/latest.json`

/** Web bundle version, injected from package.json at build time. */
export const APP_BUNDLE_VERSION: string = __APP_VERSION__

export type OtaManifest = {
  version: string
  minAppVersion?: string
  notes?: string
  /** Direct HTTPS URL to a zip of the Vite `dist/` folder (Capgo-compatible). */
  bundleUrl: string
  /** Lowercase hex SHA-256 of the zip at bundleUrl; Capgo rejects a mismatch. */
  checksum: string
  /** ECDSA signature over the fields above (see ./signature.ts), and which trusted key made it. */
  keyId?: string
  signature?: string
}

/**
 * false = check signatures and report only; true = refuse unsigned or badly signed updates.
 * Turn on only after a report-only release has shown `signature=valid` on real devices.
 */
export const OTA_REQUIRE_SIGNATURE = false
