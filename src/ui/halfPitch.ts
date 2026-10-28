import { liveFieldMarkings } from '@/domain/halfField'
import { t } from '@/i18n'
import { escapeHtml } from './dom'

const SVG_NS = 'http://www.w3.org/2000/svg'
const watched = new WeakSet<HTMLElement>()

function drawLines(pitch: HTMLElement): void {
  const svg = pitch.querySelector<SVGSVGElement>('svg.hf-lines')
  if (!svg) return
  const { viewBox, lines } = liveFieldMarkings(pitch.clientWidth, pitch.clientHeight)
  svg.setAttribute('viewBox', viewBox)
  svg.innerHTML = lines
}

/**
 * Builds the half field once (chalk lines + a layer for players) and keeps the
 * lines in proportion when the field resizes. Returns the player layer.
 */
export function mountHalfPitch(pitch: HTMLElement): HTMLElement {
  let layer = pitch.querySelector<HTMLElement>('.hf-layer')
  if (!layer) {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('class', 'hf-lines')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('preserveAspectRatio', 'none')
    const attack = document.createElement('div')
    attack.className = 'hf-attack'
    attack.innerHTML = '<span class="material-icons" aria-hidden="true">north</span><span class="hf-attack-label"></span>'
    layer = document.createElement('div')
    layer.className = 'hf-layer'
    pitch.replaceChildren(svg, attack, layer)
  }
  const label = pitch.querySelector('.hf-attack-label')
  if (label) label.textContent = t('attack')
  if (!watched.has(pitch) && typeof ResizeObserver !== 'undefined') {
    watched.add(pitch)
    new ResizeObserver(() => drawLines(pitch)).observe(pitch)
  }
  drawLines(pitch)
  return layer
}

/**
 * Puts a token on its formation spot, nudged inside the touchlines so the edge spots
 * (strikers, wingers, keeper) keep their position tag and name visible.
 */
export function placeOnPitch(el: HTMLElement, left: number, top: number): void {
  // The token (disc + name) is centred on the spot; its position tag pokes 7px above it.
  el.style.left = `clamp(30px, ${left}%, calc(100% - 30px))`
  el.style.top = `clamp(38px, ${top}%, calc(100% - 32px))`
}

export function halfToken(input: {
  playerId: string
  jersey: number
  name: string
  position: string
  left: number
  top: number
  minutes?: number
  classes?: string[]
}): HTMLButtonElement {
  const token = document.createElement('button')
  token.type = 'button'
  token.className = ['hf-token', ...(input.classes ?? [])].join(' ')
  token.dataset.playerId = input.playerId
  placeOnPitch(token, input.left, input.top)
  token.setAttribute('aria-label', `${input.name} ${input.jersey} ${input.position}`)
  const mins = input.minutes == null ? '' : `<span class="hf-mins">${input.minutes}'</span>`
  token.innerHTML = `<span class="hf-disc">${input.jersey}<span class="hf-pos">${escapeHtml(input.position)}</span>${mins}</span><span class="hf-name">${escapeHtml(input.name)}</span>`
  return token
}

export function benchChip(input: {
  playerId: string
  jersey: number
  name: string
  minutes?: number
  classes?: string[]
}): HTMLButtonElement {
  const chip = document.createElement('button')
  chip.type = 'button'
  chip.className = ['bench-chip', ...(input.classes ?? [])].join(' ')
  chip.dataset.playerId = input.playerId
  chip.setAttribute('aria-label', `${input.name} ${input.jersey}`)
  const mins = input.minutes == null ? '' : `<span class="bench-chip-mins">${input.minutes}'</span>`
  chip.innerHTML = `<span class="bench-chip-num">${input.jersey}</span><span class="bench-chip-name">${escapeHtml(input.name)}</span>${mins}`
  return chip
}

/** Action-sheet button that does what a double-tap does: arm a switch (coach) or a move (parent). */
export function switchButtonHtml(label: 'switchPlayer' | 'movePlayer'): string {
  return `<button class="action-btn switch-action-btn" data-switch="1"><span class="material-icons" aria-hidden="true">swap_vert</span> ${escapeHtml(t(label))}</button>`
}
