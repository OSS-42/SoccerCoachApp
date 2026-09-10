/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MESSAGE_ERROR_MS, MESSAGE_OK_MS } from '@/domain/config'
import { hideMessage, showMessage } from './message'

describe('message ribbon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = `
      <div id="message-ribbon" class="message-ribbon hidden" style="display:none">
        <span id="message-text"></span>
        <button class="close-btn" id="close-message">×</button>
      </div>
    `
  })

  afterEach(() => {
    hideMessage()
    vi.useRealTimers()
  })

  it('shows then hides the ribbon without changing screen layout class', () => {
    showMessage('Choose a format', 'error')
    const ribbon = document.getElementById('message-ribbon')
    expect(ribbon?.classList.contains('hidden')).toBe(false)
    expect(ribbon?.textContent).toContain('Choose a format')
    hideMessage()
    expect(ribbon?.classList.contains('hidden')).toBe(true)
  })

  it('hides an error after a short delay so it does not stick over controls', () => {
    showMessage('Choose a format', 'error')
    vi.advanceTimersByTime(MESSAGE_ERROR_MS - 1)
    expect(document.getElementById('message-ribbon')?.classList.contains('hidden')).toBe(false)
    vi.advanceTimersByTime(1)
    expect(document.getElementById('message-ribbon')?.classList.contains('hidden')).toBe(true)
    expect(MESSAGE_ERROR_MS).toBeLessThanOrEqual(3000)
    expect(MESSAGE_OK_MS).toBeLessThanOrEqual(2000)
  })

  it('does not toggle a layout class that would reserve a bottom strip', () => {
    const html = document.documentElement
    const before = html.className
    showMessage('Saved', 'success')
    expect(html.className).toBe(before)
    hideMessage()
    expect(html.className).toBe(before)
  })
})
