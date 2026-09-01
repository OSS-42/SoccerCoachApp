import { DIALOG_TOGGLE_EVENT, optionalEl } from './dom'

type OverlayOpts = {
  title: string
  body: string
  nextLabel: string
  skipLabel: string
  showNext: boolean
  showSkip: boolean
  target: HTMLElement | HTMLElement[] | null
  allowTarget: boolean
  onNext: () => void
  onSkip: () => void
}

let onNext: (() => void) | null = null
let onSkip: (() => void) | null = null
let targetEls: HTMLElement[] = []
let allowTarget = false

function root(): HTMLElement | null {
  return optionalEl('tutorial-root')
}

function dialogIsOpen(): boolean {
  return Boolean(document.querySelector('.dialog.active'))
}

function overlayGuarding(): boolean {
  const node = root()
  return Boolean(node && !node.hidden && !node.classList.contains('is-paused'))
}

function asTargets(target: OverlayOpts['target']): HTMLElement[] {
  if (!target) return []
  return (Array.isArray(target) ? target : [target]).filter((el) => document.body.contains(el))
}

function pointInTargets(x: number, y: number): boolean {
  return targetEls.some((el) => {
    if (!document.body.contains(el)) return false
    const r = el.getBoundingClientRect()
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom
  })
}

function eventAllowed(event: Event): boolean {
  const node = event.target
  if (node instanceof Element) {
    if (node.closest('#tutorial-card')) return true
    if (node.closest('.dialog')) return true
    if (allowTarget && targetEls.some((el) => el === node || el.contains(node))) return true
  }
  if (!allowTarget) return false
  if (event instanceof MouseEvent || event instanceof PointerEvent) {
    return pointInTargets(event.clientX, event.clientY)
  }
  if (typeof TouchEvent !== 'undefined' && event instanceof TouchEvent) {
    const point = event.touches[0] ?? event.changedTouches[0]
    if (point) return pointInTargets(point.clientX, point.clientY)
  }
  return false
}

function blockUnexpected(event: Event): void {
  if (!overlayGuarding()) return
  if (eventAllowed(event)) return
  event.preventDefault()
  event.stopPropagation()
}

function pauseForDialog(): void {
  const node = root()
  if (!node) return
  node.classList.toggle('is-paused', dialogIsOpen())
}

export function bindTutorialOverlay(): void {
  document.getElementById('tutorial-next')?.addEventListener('click', () => {
    if (dialogIsOpen()) return
    onNext?.()
  })
  document.getElementById('tutorial-skip')?.addEventListener('click', () => {
    if (dialogIsOpen()) return
    onSkip?.()
  })
  window.addEventListener('resize', layoutTutorialSpot)
  window.addEventListener('orientationchange', layoutTutorialSpot)
  window.addEventListener('scroll', layoutTutorialSpot, true)
  document.addEventListener(DIALOG_TOGGLE_EVENT, () => {
    pauseForDialog()
    if (!dialogIsOpen()) layoutTutorialSpot()
  })
  for (const type of ['pointerdown', 'click', 'touchstart'] as const) {
    document.addEventListener(type, blockUnexpected, true)
  }
}

export function showTutorialCard(opts: OverlayOpts): void {
  const node = root()
  if (!node) return
  onNext = opts.onNext
  onSkip = opts.onSkip
  targetEls = asTargets(opts.target)
  allowTarget = opts.allowTarget
  const title = document.getElementById('tutorial-title')
  const body = document.getElementById('tutorial-body')
  const next = document.getElementById('tutorial-next') as HTMLButtonElement | null
  const skip = document.getElementById('tutorial-skip') as HTMLButtonElement | null
  if (title) title.textContent = opts.title
  if (body) body.textContent = opts.body
  if (next) {
    next.textContent = opts.nextLabel
    next.hidden = !opts.showNext
  }
  if (skip) {
    skip.textContent = opts.skipLabel
    skip.hidden = !opts.showSkip
  }
  node.hidden = false
  node.setAttribute('aria-hidden', 'false')
  pauseForDialog()
  if (allowTarget && targetEls[0]) {
    try {
      targetEls[0].scrollIntoView({ block: 'nearest', inline: 'nearest' })
    } catch {
      /* jsdom */
    }
  }
  layoutTutorialSpot()
  window.requestAnimationFrame(() => layoutTutorialSpot())
}

export function hideTutorialCard(): void {
  const node = root()
  if (node) {
    node.hidden = true
    node.classList.remove('is-paused')
    node.setAttribute('aria-hidden', 'true')
  }
  onNext = null
  onSkip = null
  targetEls = []
  allowTarget = false
  const block = document.getElementById('tutorial-block')
  const spot = document.getElementById('tutorial-spot')
  if (block) block.style.clipPath = ''
  if (spot) spot.hidden = true
}

export function layoutTutorialSpot(): void {
  const spot = document.getElementById('tutorial-spot')
  const block = document.getElementById('tutorial-block')
  if (!spot || !block) return
  const live = targetEls.filter((el) => document.body.contains(el))
  if (!live.length) {
    block.style.clipPath = ''
    spot.hidden = true
    return
  }
  const pad = 8
  const holes = live.map((el) => {
    const r = el.getBoundingClientRect()
    return {
      left: Math.max(0, r.left - pad),
      top: Math.max(0, r.top - pad),
      right: Math.min(window.innerWidth, r.right + pad),
      bottom: Math.min(window.innerHeight, r.bottom + pad),
    }
  })
  const left = Math.min(...holes.map((h) => h.left))
  const top = Math.min(...holes.map((h) => h.top))
  const right = Math.max(...holes.map((h) => h.right))
  const bottom = Math.max(...holes.map((h) => h.bottom))
  spot.hidden = false
  spot.style.left = `${left}px`
  spot.style.top = `${top}px`
  spot.style.width = `${Math.max(0, right - left)}px`
  spot.style.height = `${Math.max(0, bottom - top)}px`
  const card = document.getElementById('tutorial-card')
  if (card) {
    const tall = bottom - top > window.innerHeight * 0.4
    const low = top > window.innerHeight * 0.45
    const spansBoth = top < window.innerHeight * 0.4 && bottom > window.innerHeight * 0.6
    const cardOnTop = low || spansBoth
    card.style.top = cardOnTop ? 'max(12px, env(safe-area-inset-top, 0px))' : 'auto'
    card.style.bottom = cardOnTop ? 'auto' : 'max(16px, env(safe-area-inset-bottom, 0px))'
    card.style.maxHeight = tall || spansBoth ? '28vh' : '42vh'
  }
  const holePath = holes
    .map(
      (h) =>
        `${h.left}px ${h.top}px, ${h.left}px ${h.bottom}px, ${h.right}px ${h.bottom}px, ${h.right}px ${h.top}px, ${h.left}px ${h.top}px`,
    )
    .join(', ')
  block.style.clipPath = `polygon(evenodd, 0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ${holePath})`
}

export function isTutorialOverlayOpen(): boolean {
  const node = root()
  return Boolean(node && !node.hidden)
}
