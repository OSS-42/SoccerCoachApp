import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Builtin Capgo version for the web assets baked into the APK.
 * Must track package.json / APP_BUNDLE_VERSION (ota-publish bumps package.json;
 * keep this in sync or Capgo defaults to "1.0" and blocks later OTA tips).
 */
const BUILTIN_WEB_VERSION = '2.4.70'

const config: CapacitorConfig = {
  appId: 'com.actionpitch.app',
  appName: 'ActionPitch',
  webDir: 'dist',
  backgroundColor: '#07110c',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#07110c',
    allowMixedContent: false,
  },
  plugins: {
    CapacitorUpdater: {
      autoUpdate: false,
      appReadyTimeout: 12_000,
      version: BUILTIN_WEB_VERSION,
    },
  },
}

export default config
