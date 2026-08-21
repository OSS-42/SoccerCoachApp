import { MESSAGE_ERROR_MS, MESSAGE_OK_MS } from '@/domain/config'
import { el } from './dom'

let hideTimer: number | null = null

export function showMessage(message: string, type: 'error' | 'success' | 'warning' | 'info' = 'error'): void {
  const ribbon = el('message-ribbon')
  const text = ribbon.querySelector('#message-text')
  if (text) text.textContent = message
  ribbon.className = `message-ribbon ${type}`
  ribbon.classList.remove('hidden')
  ribbon.style.display = 'flex'
  if (hideTimer) window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => hideMessage(), type === 'error' ? MESSAGE_ERROR_MS : MESSAGE_OK_MS)
}

export function hideMessage(): void {
  const ribbon = el('message-ribbon')
  ribbon.classList.add('hidden')
  ribbon.style.display = 'none'
}
