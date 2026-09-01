import introVideo from '@/assets/intro_ActionPitch.mp4'
import { APP_VERSION, INTRO_BUTTON_DELAY_MS, INTRO_MS } from '@/domain/config'
import { goAfterIntro } from './roleSelect'
import { maybeResumeOnboarding } from './tutorial'

let introStarted = false

export function bindIntro(): void {
  const continueBtn = document.getElementById('intro-continue') as HTMLButtonElement | null
  const video = document.getElementById('intro-video') as HTMLVideoElement | null
  continueBtn?.addEventListener('click', () => {
    try {
      video?.pause()
    } catch {
      /* ignore */
    }
    goAfterIntro()
    maybeResumeOnboarding()
  })
}

/** Start the 6s splash. Safe to call once after OTA (native) or immediately (web). */
export function startIntro(): void {
  if (introStarted) return
  const video = document.getElementById('intro-video') as HTMLVideoElement | null
  const overlay = document.getElementById('intro-overlay')
  const version = document.getElementById('intro-version')
  const continueBtn = document.getElementById('intro-continue') as HTMLButtonElement | null
  if (!video || !overlay || !version || !continueBtn) return
  introStarted = true

  version.textContent = `v${APP_VERSION}`
  video.src = introVideo
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', 'true')
  video.preload = 'auto'
  continueBtn.disabled = true

  let revealed = false
  const reveal = (): void => {
    if (revealed) return
    revealed = true
    try {
      video.pause()
    } catch {
      /* ignore */
    }
    overlay.classList.add('is-on')
    window.setTimeout(() => {
      continueBtn.disabled = false
      continueBtn.classList.add('is-on')
    }, INTRO_BUTTON_DELAY_MS)
  }

  window.setTimeout(reveal, INTRO_MS)
  void video.play().catch(() => {
    /* Autoplay may be blocked; the 6s timer still reveals the title. */
  })
}
