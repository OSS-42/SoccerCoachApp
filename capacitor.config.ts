import type { CapacitorConfig } from '@capacitor/cli'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Builtin Capgo version for the web assets baked into the native shell, read from
 * package.json (without it Capgo defaults to "1.0" and blocks later OTA tips).
 */
const BUILTIN_WEB_VERSION: string = JSON.parse(
  readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
).version

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
  ios: {
    backgroundColor: '#07110c',
    contentInset: 'never',
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
