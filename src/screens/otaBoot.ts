import { Capacitor } from '@capacitor/core'
import { APP_NAME } from '@/domain/config'
import { runOtaIfNeeded, type OtaProgress } from '@/ota/runOta'
import { showScreen } from '@/ui/nav'
import { startIntro } from './intro'

const OTA_MIN_SCREEN_MS = 10_000
const OTA_BOOT_TIMEOUT_MS = 90_000

function paint(progress: OtaProgress): void {
  const message = document.getElementById('ota-message')
  const bar = document.getElementById('ota-bar')
  const percent = document.getElementById('ota-percent')
  const brand = document.getElementById('ota-brand')
  if (brand) brand.textContent = APP_NAME
  if (message) message.textContent = progress.message
  if (bar) bar.style.width = `${Math.max(0, Math.min(100, progress.percent))}%`
  if (percent) percent.textContent = `${Math.round(progress.percent)}%`
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Native: check droplet channel, then land on the intro video. Web: intro immediately. */
export async function bootWithOta(): Promise<void> {
  if (!isNativeApp()) {
    showScreen('intro-screen', { history: 'replace' })
    startIntro()
    return
  }

  showScreen('ota-screen', { history: 'replace' })
  paint({ phase: 'check', percent: 0, message: 'Starting…' })

  const startedAt = Date.now()
  try {
    await Promise.race([
      runOtaIfNeeded(paint),
      new Promise<void>((resolve) => {
        window.setTimeout(() => {
          paint({
            phase: 'skip',
            percent: 100,
            message: 'Update is taking too long — continuing',
          })
          resolve()
        }, OTA_BOOT_TIMEOUT_MS)
      }),
    ])
  } catch (e) {
    console.warn('[boot] OTA failed', e)
    paint({
      phase: 'error',
      percent: 0,
      message: 'Update skipped — continuing',
    })
  }

  const remaining = Math.max(0, OTA_MIN_SCREEN_MS - (Date.now() - startedAt))
  if (remaining > 0) await sleep(remaining)

  showScreen('intro-screen', { history: 'replace' })
  startIntro()
}
