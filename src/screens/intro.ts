import introVideo from '@/assets/intro_ActionPitch.mp4'
import { APP_VERSION, INTRO_BUTTON_DELAY_MS, INTRO_MS } from '@/domain/config'
import { goAfterIntro } from './roleSelect'
import { maybeResumeOnboarding } from './tutorial'

let introStarted = false
let introPrimed = false

function introEl(): HTMLVideoElement | null {
  return document.getElementById('intro-video') as HTMLVideoElement | null
}

function armVideo(video: HTMLVideoElement): void {
  video.muted = true
  video.defaultMuted = true
  video.playsInline = true
  video.controls = false
  video.preload = 'auto'
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', 'true')
  video.setAttribute('controlslist', 'nodownload nofullscreen noremoteplayback')
  video.disablePictureInPicture = true
  if (!video.getAttribute('src')) video.src = introVideo
}

/** Fetch + attach the intro file during OTA so the first frame is ready. */
export function primeIntroVideo(): void {
  if (introPrimed) return
  introPrimed = true
  const video = introEl()
  if (video) {
    armVideo(video)
    try {
      video.load()
    } catch {
      /* ignore */
    }
  }
  void fetch(introVideo, { cache: 'force-cache' }).catch(() => {
    /* cache warm is best-effort; startIntro still plays */
  })
}

export function bindIntro(): void {
  const continueBtn = document.getElementById('intro-continue') as HTMLButtonElement | null
  const video = introEl()
  continueBtn?.addEventListener('click', () => {
    try {
      video?.pause()
    } catch {
      /* ignore */
    }
    goAfterIntro()
    maybeResumeOnboarding()
  })
  primeIntroVideo()
}

/** Start the 6s splash. Safe to call once after OTA (native) or immediately (web). */
export function startIntro(): void {
  if (introStarted) return
  const video = introEl()
  const overlay = document.getElementById('intro-overlay')
  const version = document.getElementById('intro-version')
  const continueBtn = document.getElementById('intro-continue') as HTMLButtonElement | null
  if (!video || !overlay || !version || !continueBtn) return
  introStarted = true
  primeIntroVideo()
  armVideo(video)

  version.textContent = `v${APP_VERSION}`
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

  const showFrame = (): void => {
    video.classList.add('is-ready')
  }
  video.addEventListener('playing', showFrame, { once: true })

  window.setTimeout(reveal, INTRO_MS)
  const play = (): void => {
    void video.play().then(showFrame).catch(() => {
      showFrame()
    })
  }
  if (video.readyState >= 2) play()
  else {
    video.addEventListener('canplay', play, { once: true })
    window.setTimeout(play, 400)
  }
}
